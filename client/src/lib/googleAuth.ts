import { google } from 'googleapis';
import { apiRequest } from './queryClient';

// OAuth2 client setup with Google client credentials
const oauth2Client = new google.auth.OAuth2(
  import.meta.env.VITE_GOOGLE_CLIENT_ID,
  import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
  `${window.location.origin}/api/auth/google/callback`
);

// Gmail API scopes that we request from user
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Generate the OAuth2 URL for Gmail authorization
export function getGmailAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token as well
    scope: GMAIL_SCOPES,
    prompt: 'consent'
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  try {
    // Make API request to exchange code for tokens
    const response = await apiRequest('POST', '/api/auth/google/exchange', { code });
    const tokens = await response.json();
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

// Set the credentials using the tokens
export function setCredentials(tokens: any) {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// Create Gmail API client with OAuth2 authentication
export function createGmailClient(auth: any) {
  return google.gmail({ version: 'v1', auth });
}

// Get user profile information from Google
export async function getUserProfile(auth: any) {
  const oauth2 = google.oauth2({
    auth,
    version: 'v2'
  });
  const { data } = await oauth2.userinfo.get();
  return data;
}

// Fetch Gmail newsletters
export async function fetchNewslettersFromGmail(auth: any, maxResults = 10) {
  try {
    const gmail = createGmailClient(auth);
    
    // Query for newsletter emails (example query)
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'category:primary is:unread label:newsletter',
      maxResults
    });
    
    const messages = response.data.messages || [];
    const newsletters = [];
    
    // Get full message details for each message ID
    for (const message of messages) {
      if (message.id) {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });
        
        // Parse message to extract newsletter data
        const parsedNewsletter = parseGmailMessageToNewsletter(fullMessage.data);
        if (parsedNewsletter) {
          newsletters.push(parsedNewsletter);
        }
      }
    }
    
    return newsletters;
  } catch (error) {
    console.error('Error fetching newsletters from Gmail:', error);
    throw error;
  }
}

// Helper function to parse a Gmail message into a newsletter format
function parseGmailMessageToNewsletter(message: any) {
  try {
    if (!message || !message.payload) return null;
    
    // Extract headers for subject, from, date
    const headers = message.payload.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
    const date = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();
    
    // Extract sender name and email
    const senderMatch = from.match(/^([^<]+)?<?([^>]+)>?$/);
    const senderName = senderMatch ? senderMatch[1]?.trim() || from : from;
    const senderEmail = senderMatch ? senderMatch[2] || '' : '';
    
    // Extract snippet or content
    const snippet = message.snippet || '';
    
    // Extract message body
    let content = '';
    if (message.payload.body && message.payload.body.data) {
      // Base64 encoded content
      content = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (message.payload.parts) {
      // Look for HTML or text part
      const htmlPart = message.payload.parts.find((part: any) => 
        part.mimeType === 'text/html' && part.body && part.body.data);
      
      const textPart = message.payload.parts.find((part: any) => 
        part.mimeType === 'text/plain' && part.body && part.body.data);
      
      if (htmlPart && htmlPart.body.data) {
        content = atob(htmlPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (textPart && textPart.body.data) {
        content = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    }

    // Image URL (placeholder for now)
    const imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
    
    return {
      messageId: message.id,
      title: subject,
      publisher: senderName,
      publisherEmail: senderEmail,
      publishedAt: new Date(date).toISOString(),
      snippet,
      content,
      imageUrl,
      // Generate a placeholder audio URL for now
      audioUrl: 'https://cdn.pixabay.com/download/audio/2021/11/13/audio_cb31232ebb.mp3',
      duration: 600 // Default 10 minutes
    };
  } catch (error) {
    console.error('Error parsing Gmail message:', error);
    return null;
  }
}

// Get Gmail labels
export async function getGmailLabels(auth: any) {
  try {
    const gmail = createGmailClient(auth);
    const response = await gmail.users.labels.list({
      userId: 'me'
    });
    return response.data.labels || [];
  } catch (error) {
    console.error('Error fetching Gmail labels:', error);
    throw error;
  }
}