// emailService.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { decode as base64Decode } from 'base64-url';
import htmlToText from 'html-to-text';
import dayjs from 'dayjs';

interface MessageHeader {
  name: string;
  value: string;
}

interface NewsletterContent {
  subject: string;
  from: string;
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
    const from = this.extractHeader(headers, 'From');
    const subject = this.extractHeader(headers, 'Subject');
    const date = this.extractHeader(headers, 'Date');

    const content: NewsletterContent = { subject, from, date };

    const parts = message.payload.parts || [];
    for (const part of parts) {
      const data = base64Decode(part.body.data || '');
      if (part.mimeType === 'text/plain') {
        content.plain_text = data;
      } else if (part.mimeType === 'text/html') {
        content.markdown = htmlToText.convert(data, { wordwrap: false });
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

  public async getNewslettersFromSenders(senderEmails: string[], maxResults = 100): Promise<NewsletterContent[]> {
    const date = dayjs().subtract(1, 'year').format('YYYY/MM/DD');
    const fromFilters = senderEmails.map(email => `from:${email}`);
    const query = `after:${date} ` + fromFilters.join(' OR ');

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

  public async getNewsletterAuthors(maxResults = 100): Promise<[string, string][]> {
    const newsletters = await this.getNewsletters(maxResults);
    const seen = new Set<string>();
    const authors: [string, string][] = [];

    const emailRegex = /^(.*?)(?:<([\w.-]+@[\w.-]+)>)?$/;

    for (const n of newsletters) {
      const raw = n.from.trim();
      const match = emailRegex.exec(raw);
      let name = '', email = '';

      if (match) {
        name = match[2] ? match[1].trim().replace(/^"|"$/g, '') : '';
        email = (match[2] || match[1]).toLowerCase().trim();
        if (!/^[\w.-]+@[\w.-]+$/.test(email)) continue;

        const id = `${name}|${email}`;
        if (!seen.has(id)) {
          seen.add(id);
          authors.push([name, email]);
        }
      }
    }

    return authors.sort((a, b) => a[1].split('@')[1].localeCompare(b[1].split('@')[1]));
  }
}