import { apiRequest } from './queryClient';

// Get the URL for Gmail authorization
export function getGmailAuthUrl(): string {
  return `/api/auth/google/authorize`;
}


// Set the credentials in the client-side storage
export function setCredentials(tokens: any) {
  // Store tokens for future API calls
  localStorage.setItem('gmail_tokens', JSON.stringify({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000
  }));
}

// Clear credentials
export function clearCredentials() {
  localStorage.removeItem('gmail_tokens');
}

// Create Gmail client (in a real app, this would use the Google API client library)
export function createGmailClient(auth: any) {
  // This is a placeholder - in a real app, you would initialize the Gmail API client
  return auth;
}

// Get user profile from Google
export async function getUserProfile(accessToken: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

// Fetch newsletters from Gmail
export async function fetchNewslettersFromGmail(accessToken: string, maxResults = 10) {
  try {
    const response = await fetch(`/api/gmail/messages?maxResults=${maxResults}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Gmail messages');
    }
    
    const emails = await response.json();
    return emails.map(parseGmailMessageToNewsletter);
  } catch (error) {
    console.error('Error fetching newsletters from Gmail:', error);
    throw error;
  }
}

// Parse Gmail message to newsletter format
function parseGmailMessageToNewsletter(message: any) {
  // Extract headers
  const headers = message.payload?.headers || [];
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const date = headers.find((h: any) => h.name === 'Date')?.value || '';
  
  // Extract publisher name from "From" field
  const publisherMatch = from.match(/([^<]+)/);
  const publisher = publisherMatch ? publisherMatch[0].trim() : from;
  
  // Create a placeholder for audio URL (this would be generated from the content)
  const audioUrl = `/api/tts?messageId=${message.id}`;
  
  // Create a placeholder image URL
  const imageUrl = `https://picsum.photos/seed/${message.id}/300/200`;
  
  // Get snippet as description
  const description = message.snippet || 'No description available';
  
  // Create a dummy category ID for now
  const categoryId = 1; // Default to Technology
  
  return {
    id: parseInt(message.id, 16) % 10000, // Convert hex to a smaller number
    title: subject,
    publisher,
    description,
    imageUrl,
    audioUrl,
    duration: Math.floor(Math.random() * 1800) + 300, // Random duration between 5-30 minutes
    categoryId,
    publishedAt: new Date(date || Date.now()).toISOString(),
    featured: Math.random() > 0.7 // 30% chance of being featured
  };
}

// Get Gmail labels
export async function getGmailLabels(accessToken: string) {
  try {
    const response = await fetch('/api/gmail/labels', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch Gmail labels');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching Gmail labels:', error);
    throw error;
  }
}