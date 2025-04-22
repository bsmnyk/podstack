import { apiRequest } from "./queryClient";
import { User } from "@shared/schema";

export interface AuthToken {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}


export async function getMe(): Promise<User> {
  const response = await apiRequest("GET", "/api/auth/user");

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
}

export async function logout(): Promise<void> {
  const response = await apiRequest("POST", "/api/auth/logout");

  if (!response.ok) {
    throw new Error("Failed to log out");
  }

  // Clear tokens from localStorage
  localStorage.removeItem("auth_tokens");
}

export async function handleOAuthCallback(
  provider: string,
  code: string
): Promise<AuthToken> {
  const response = await apiRequest("POST", `/api/auth/${provider}/callback`, {
    code,
  });

  if (!response.ok) {
    throw new Error("OAuth callback failed");
  }

  return await response.json();
}

export function redirectToOAuthProvider(provider: string): void {
  const clientId = "103225997829-j7s746cvv95vvugj77iocsb9rgt4m3h5.apps.googleusercontent.com";
  const redirectUri = `${window.location.origin}/auth/callback`;
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  const width = 600;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2.5;

  const popup = window.open(
    authUrl,
    `${provider}Auth`,
    `width=${width},height=${height},left=${left},top=${top}`
  );

  if (!popup) {
    throw new Error("Failed to open OAuth popup");
  }
}

export function setupAuthMessageListener(
  callback: (data: {
    type: string;
    provider: string;
    success: boolean;
    tokens?: StoredTokens;
    error?: string;
  }) => void
): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    const { type, code } = event.data || {};
    if (type === "oauth_callback" && code) {
      handleOAuthCallback("google", code)
        .then((tokens) => {
          const storedTokens: StoredTokens = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: Date.now() + (tokens.expires_in || 3600) * 1000,
          };

          localStorage.setItem("auth_tokens", JSON.stringify(storedTokens));

          callback({
            type: "auth_callback",
            provider: "google",
            success: true,
            tokens: storedTokens,
          });
        })
        .catch((error) => {
          callback({
            type: "auth_callback",
            provider: "google",
            success: false,
            error: error.message,
          });
        });
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}

export function getStoredTokens(): StoredTokens | null {
  const raw = localStorage.getItem("auth_tokens");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function refreshAccessToken(): Promise<StoredTokens | null> {
  const tokens = getStoredTokens();
  if (!tokens?.refresh_token) return null;

  const response = await apiRequest("POST", "/api/auth/refresh", {
    refresh_token: tokens.refresh_token,
  });

  if (!response.ok) {
    console.error("Failed to refresh access token");
    return null;
  }

  const refreshed = await response.json();
  const updated: StoredTokens = {
    access_token: refreshed.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + (refreshed.expires_in || 3600) * 1000,
  };

  localStorage.setItem("auth_tokens", JSON.stringify(updated));
  return updated;
}