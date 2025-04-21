import { apiRequest } from "./queryClient";
import { User } from "@shared/schema";

export interface AuthToken {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
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

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function handleOAuthCallback(
  provider: string,
  code: string,
): Promise<AuthToken> {
  const response = await apiRequest("POST", `/api/auth/${provider}/callback`, {
    code,
  });
  return await response.json();
}

export function redirectToOAuthProvider(provider: string): void {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
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

  window.open(
    authUrl,
    `${provider}Auth`,
    `width=${width},height=${height},left=${left},top=${top}`,
  );
}

export function setupAuthMessageListener(
  callback: (data: any) => void,
): () => void {
  const handleMessage = (event: MessageEvent) => {
    // Only accept messages from our window
    if (event.origin !== window.location.origin) return;

    // Check if this is an OAuth callback
    if (event.data?.type === "oauth_callback") {
      const code = event.data.code;
      if (code) {
        handleOAuthCallback("google", code)
          .then((tokens) => {
            callback({
              type: "auth_callback",
              provider: "google",
              success: true,
              tokens,
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
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}
