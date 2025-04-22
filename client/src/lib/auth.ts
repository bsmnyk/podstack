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

export interface JwtResponse {
  jwt: string;
  user: User;
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
  clearJwtToken();
}

export async function handleOAuthCallback(
  provider: string,
  code: string
): Promise<JwtResponse> {
  const response = await apiRequest("POST", `/api/auth/${provider}/exchange`, {
    code,
  });

  if (!response.ok) {
    throw new Error("OAuth callback failed");
  }

  return await response.json();
}

export function redirectToOAuthProvider(provider: string): void {
  // Use the server's endpoint to initiate OAuth flow
  const authUrl = `/api/auth/${provider}/authorize`;

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
    jwt?: string;
    user?: User;
    error?: string;
  }) => void
): () => void {
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    // Handle direct message from the OAuth popup
    const { type, provider, success, jwt, tokens, error } = event.data || {};
    if (type === "auth_callback") {
      if (success && jwt) {
        // Store JWT token
        setJwtToken(jwt);
        
        // If we have OAuth tokens, store them too
        if (tokens) {
          localStorage.setItem("auth_tokens", JSON.stringify(tokens));
        }
        
        callback({
          type: "auth_callback",
          provider: provider || "google",
          success: true,
          jwt,
          tokens
        });
      } else if (error) {
        callback({
          type: "auth_callback",
          provider: provider || "google",
          success: false,
          error
        });
      }
      return;
    }

    // Handle code from auth-callback.tsx
    const { code } = event.data || {};
    if (type === "oauth_callback" && code) {
      handleOAuthCallback("google", code)
        .then((response) => {
          // Store JWT token
          setJwtToken(response.jwt);
          
          callback({
            type: "auth_callback",
            provider: "google",
            success: true,
            jwt: response.jwt,
            user: response.user
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

export function getJwtToken(): string | null {
  return localStorage.getItem("jwt_token");
}

export function setJwtToken(token: string): void {
  localStorage.setItem("jwt_token", token);
}

export function clearJwtToken(): void {
  localStorage.removeItem("jwt_token");
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

// Add JWT token to API requests
export function addAuthHeader(headers: HeadersInit = {}): HeadersInit {
  const jwt = getJwtToken();
  if (jwt) {
    return {
      ...headers,
      Authorization: `Bearer ${jwt}`
    };
  }
  return headers;
}
