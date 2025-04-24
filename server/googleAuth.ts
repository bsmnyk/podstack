import { google } from 'googleapis';
import { storage } from './storage';
import { Request, Response } from 'express';
import { generateToken } from './jwt';
import fs from 'fs';
import path from 'path';

// Load credentials from JSON file
let credentials: any;
try {
  const credentialsPath = path.join(process.cwd(), 'credentials.json');
  const credentialsFile = fs.readFileSync(credentialsPath, 'utf8');
  credentials = JSON.parse(credentialsFile).web;
} catch (error) {
  console.error('Error loading credentials from JSON file:', error);
  credentials = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET
  };
}

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  `${process.env.HOST || 'http://localhost:5000'}/auth/callback`
);

// Scopes we want to request for Gmail access
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Generate authorization URL
export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

// Get user information using access token
export async function getUserInfo(accessToken: string) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const oauth2 = google.oauth2({
      auth,
      version: 'v2'
    });
    
    const userInfo = await oauth2.userinfo.get();
    return userInfo.data;
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
}

// Refresh access token using refresh token
export async function refreshAccessToken(userId: number) {
  try {
    const userToken = await storage.getUserTokenByProvider(userId, 'google');
    if (!userToken || !userToken.refreshToken) {
      throw new Error('No refresh token found for user');
    }

    oauth2Client.setCredentials({
      refresh_token: userToken.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    // Update tokens in storage
    await storage.saveUserToken({
      userId: userId,
      provider: 'google',
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || userToken.refreshToken, // Use new refresh token if provided, otherwise keep old one
      idToken: credentials.id_token || userToken.idToken, // Keep old ID token if new one not provided
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
    });

    console.log(`Access token refreshed for user ${userId}`);
    return credentials.access_token;

  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

// Get a valid access token, refreshing if necessary
export async function getValidAccessToken(userId: number): Promise<string> {
  try {
    const userToken = await storage.getUserTokenByProvider(userId, 'google');

    if (!userToken || !userToken.accessToken) {
      throw new Error('No access token found for user');
    }

    const now = new Date();
    const expiresAt = userToken.expiresAt ? new Date(userToken.expiresAt) : null;

    // Check if token is expired or expires within the next 5 minutes
    if (expiresAt && expiresAt.getTime() < now.getTime() + 5 * 60 * 1000) {
      console.log(`Access token expired or near expiry for user ${userId}. Attempting refresh.`);
      if (!userToken.refreshToken) {
         throw new Error('Access token expired and no refresh token available');
      }
      return await refreshAccessToken(userId);
    }

    // Token is still valid
    return userToken.accessToken;

  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
}


// Handle Google OAuth callback
export async function handleGoogleCallback(req: Request, res: Response) {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'Authorization code is required' });
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    
    if (!tokens.access_token) {
      return res.status(400).json({ message: 'Failed to get access token' });
    }
    
    // Get user information
    const userInfo = await getUserInfo(tokens.access_token);
    
    if (!userInfo.email) {
      return res.status(400).json({ message: 'Failed to get user email' });
    }
    
    // Look up existing user or create a new one
    let user = await storage.getUserByEmail(userInfo.email);
    
    if (!user) {
      // Create a new user
      user = await storage.createUser({
        username: userInfo.email.split('@')[0],
        email: userInfo.email,
        provider: 'google',
        providerId: userInfo.id,
        name: userInfo.name,
        avatarUrl: userInfo.picture,
        password: '', // Not used for OAuth users
      });
    }
    
    // Create a session for the user
    req.session.userId = user.id;
    
    // Store the tokens in the database
    await storage.saveUserToken({
      userId: user.id,
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
      idToken: tokens.id_token || null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    });
    
    // Generate a JWT token for the user
    const jwtToken = generateToken(user);

    // Check if it's the user's first login
    const isFirstLogin = await storage.isFirstTimeLogin(user.id);
    
    // Create HTML response page that sends a message to the opener
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
          .success { color: #4CAF50; font-size: 24px; margin-bottom: 20px; }
          .message { margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <div class="success">Authentication Successful!</div>
        <div class="message">You are now signed in with Google. You can close this window.</div>
        <script>
          // Send message to opener window
          window.opener.postMessage({
            type: 'auth_callback',
            provider: 'google',
            success: true,
            jwt: "${jwtToken}",
            tokens: ${JSON.stringify(tokens)},
            isFirstLogin: ${isFirstLogin}
          }, window.location.origin);
          
          // Close this window after a short delay
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
      </html>
    `;
    
    res.send(successHtml);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    
    // Create HTML response for error case
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
          .error { color: #f44336; font-size: 24px; margin-bottom: 20px; }
          .message { margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <div class="error">Authentication Failed</div>
        <div class="message">There was a problem signing you in with Google. Please try again.</div>
        <script>
          // Send error message to opener window
          window.opener.postMessage({
            type: 'auth_callback',
            provider: 'google',
            success: false,
            error: 'Authentication failed'
          }, window.location.origin);
          
          // Close this window after a short delay
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
      </html>
    `;
    
    res.send(errorHtml);
  }
}


// Fetch emails from Gmail
export async function fetchGmailEmails(accessToken: string, query = 'category:primary is:unread label:newsletter', maxResults = 10) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const gmail = google.gmail({ version: 'v1', auth });
    
    // List messages matching query
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });
    
    const messages = response.data.messages || [];
    const emails = [];
    
    // Get full message details for each message ID
    for (const message of messages) {
      if (message.id) {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id
        });
        
        emails.push(fullMessage.data);
      }
    }
    
    return emails;
  } catch (error) {
    console.error('Error fetching emails from Gmail:', error);
    throw error;
  }
}
