// emailService.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
// import { decode as base64Decode } from 'base64-url';
import * as htmlToText from 'html-to-text';
import dayjs from 'dayjs';

interface MessageHeader {
  name: string;
  value: string;
}

interface NewsletterContent {
  subject: string;
  fromName: string;
  fromEmail: string;
  date: string;
  plain_text?: string;
  markdown?: string;
}

export class EmailService {
  private gmail: any;
  private readonly SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
  private newsletterPatterns = {
    unsubscribe_headers: ['List-Unsubscribe', 'Unsubscribe'],
    newsletter_domains: ['@substack.com', '@newsletters.xyz', '@mailchimp.com', '@convertkit.com'],
    common_newsletter_phrases: ['newsletter', 'subscribe', 'unsubscribe', 'view in browser'],
  };

  constructor(private accessToken: string) {
    const auth = new OAuth2Client();
    auth.setCredentials({ access_token: this.accessToken });
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  private extractHeader(headers: MessageHeader[], name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  }

  private isNewsletter(headers: MessageHeader[]): boolean {
    const from = this.extractHeader(headers, 'From');
    const subject = this.extractHeader(headers, 'Subject').toLowerCase();

    return (
      headers.some(h => this.newsletterPatterns.unsubscribe_headers.includes(h.name)) ||
      this.newsletterPatterns.newsletter_domains.some(domain => from.toLowerCase().includes(domain)) ||
      this.newsletterPatterns.common_newsletter_phrases.some(p => subject.includes(p))
    );
  }

  private extractContent(message: any): NewsletterContent {
    const headers = message.payload.headers;
    const rawFrom = this.extractHeader(headers, 'From');
    const subject = this.extractHeader(headers, 'Subject');
    const date = this.extractHeader(headers, 'Date');

    // Use regex from getNewsletterAuthors to parse 'From' header
    const emailRegex = /^(.*?)(?:<([\w.-]+@[\w.-]+)>)?$/;
    const match = emailRegex.exec(rawFrom);

    let fromName = '';
    let fromEmail = '';

    if (match) {
      fromName = match[2] ? match[1].trim().replace(/^"|"$/g, '') : '';
      fromEmail = (match[2] || match[1]).toLowerCase().trim();
    }

    const content: NewsletterContent = { subject, fromName, fromEmail, date };

    // Handle different message structures
    if (message.payload.body && message.payload.body.data) {
      // Simple message with body directly in payload
      try {
        const data = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
        content.plain_text = data;
        // content.markdown = htmlToText.convert(data, { wordwrap: false });
        content.markdown = data;
      } catch (error) {
        console.error("Error decoding message body:", error);
      }
    } else if (message.payload.parts) {
      // Message with parts
      const parts = message.payload.parts;
      for (const part of parts) {
        if (part.body && part.body.data) {
          try {
            const data = Buffer.from(part.body.data, 'base64').toString('utf-8');
            if (part.mimeType === 'text/plain') {
              content.plain_text = data;
            } else if (part.mimeType === 'text/html') {
              content.markdown = htmlToText.convert(data, { wordwrap: false });
              content.markdown = data;
            }
          } catch (error) {
            console.error("Error decoding part body:", error);
          }
        } else if (part.parts) {
          // Handle nested parts (multipart messages)
          for (const nestedPart of part.parts) {
            if (nestedPart.body && nestedPart.body.data) {
              try {
                const data = Buffer.from(nestedPart.body.data, 'base64').toString('utf-8');
                if (nestedPart.mimeType === 'text/plain') {
                  content.plain_text = data;
                } else if (nestedPart.mimeType === 'text/html') {
                  content.markdown = data;
                  // content.markdown = htmlToText.convert(data, { wordwrap: false });
                }
              } catch (error) {
                console.error("Error decoding nested part body:", error);
              }
            }
          }
        }
      }
    }
    
    return content;
  }

  public async getNewsletters(maxResults = 100): Promise<NewsletterContent[]> {
    const date = dayjs().subtract(7, 'days').format('YYYY/MM/DD');
    const filters = [
      `after:${date}`,
      'header:List-Unsubscribe',
      'from:@substack.com',
      'from:@mailchimp.com',
      'from:@convertkit.com',
      'subject:newsletter',
      'subject:digest'
    ];
    const query = filters.join(' OR ');

    const listRes = await this.gmail.users.messages.list({ userId: 'me', q: query, maxResults });
    const messages = listRes.data.messages || [];

    const newsletters: NewsletterContent[] = [];
    for (const m of messages) {
      const res = await this.gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' });
      const msg = res.data;
      if (this.isNewsletter(msg.payload.headers)) {
        newsletters.push(this.extractContent(msg));
      }
    }

    return newsletters;
  }

  public async getNewslettersFromSenders(
    senderEmails: string[],
    latestTimestamps?: { [senderEmail: string]: Date | undefined },
    maxResults = 100
  ): Promise<NewsletterContent[]> {
    const fromFilters = senderEmails.map(email => {
      let filter = `from:${email}`;
      const latestTimestamp = latestTimestamps?.[email];
      if (latestTimestamp) {
        // Format date as YYYY/MM/DD for Gmail API query
        const formattedDate = dayjs(latestTimestamp).format('YYYY/MM/DD');
        filter += ` after:${formattedDate}`;
      }
      return filter;
    });

    // Combine filters with OR, but ensure each sender filter includes its potential date filter
    const query = fromFilters.join(' OR ');

    if (!query) {
      return []; // No senders to query
    }

    const listRes = await this.gmail.users.messages.list({ userId: 'me', q: query, maxResults });
    const messages = listRes.data.messages || [];

    const newsletters: NewsletterContent[] = [];
    for (const m of messages) {
      try {
        const res = await this.gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' });
        const msg = res.data;
        if (this.isNewsletter(msg.payload.headers)) {
          newsletters.push(this.extractContent(msg));
        }
      } catch (error) {
        console.error(`Error fetching message ${m.id}:`, error);
        // Continue to the next message even if one fails
      }
    }

    return newsletters;
  }
  public async getNewsletterAuthors(maxResults = 100): Promise<[string, string][]> {
    const date = dayjs().subtract(7, 'days').format('YYYY/MM/DD');
    const filters = [
      `after:${date}`,
      'header:List-Unsubscribe',
      'from:@substack.com',
      'from:@mailchimp.com',
      'from:@convertkit.com',
      'subject:newsletter',
      'subject:digest'
    ];
    const query = filters.join(' OR ');
  
    const listRes = await this.gmail.users.messages.list({ userId: 'me', q: query, maxResults });
    const messages = listRes.data.messages || [];
  
    const seen = new Set<string>();
    const authors: [string, string][] = [];
    const emailRegex = /^(.*?)(?:<([\w.-]+@[\w.-]+)>)?$/;
  
    const metadataResponses = await Promise.all(
      messages.map((m: any) => this.gmail.users.messages.get({
        userId: 'me',
        id: m.id!,
        format: 'metadata',
        metadataHeaders: ['From']
      }))
    );
  
    for (const res of metadataResponses) {
      const raw = res.data.payload.headers?.find((h: any) => h.name === 'From')?.value?.trim();
      if (!raw) continue;
  
      const match = emailRegex.exec(raw);
      if (!match) continue;
  
      const name = match[2] ? match[1].trim().replace(/^"|"$/g, '') : '';
      const email = (match[2] || match[1]).toLowerCase().trim();
      if (!/^[\w.-]+@[\w.-]+$/.test(email)) continue;
  
      const id = `${name}|${email}`;
      if (!seen.has(id)) {
        seen.add(id);
        authors.push([name, email]);
      }
    }
  
    return authors.sort((a, b) => a[1].split('@')[1].localeCompare(b[1].split('@')[1]));
  }
  
}
