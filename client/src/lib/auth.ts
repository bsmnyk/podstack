import { apiRequest } from "./queryClient";

export interface AuthToken {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function handleOAuthCallback(provider: string, code: string): Promise<AuthToken> {
  const response = await apiRequest("POST", `/api/auth/${provider}/callback`, { code });
  return await response.json();
}

export function redirectToOAuthProvider(provider: string): void {
  const width = 600;
  const height = 600;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2.5;
  
  window.open(
    `/api/auth/${provider}/authorize`,
    `${provider}Auth`,
    `width=${width},height=${height},left=${left},top=${top}`
  );
}

export function setupAuthMessageListener(callback: (data: any) => void): () => void {
  const handleMessage = (event: MessageEvent) => {
    // Validate origin for security
    const allowedOrigins = (import.meta.env.VITE_REPLIT_DOMAINS || "").split(",");
    if (!allowedOrigins.includes(event.origin) && event.origin !== window.location.origin) {
      return;
    }

    // Process auth message
    if (event.data && event.data.type === "auth_callback") {
      callback(event.data);
    }
  };

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}

export async function getMe() {
  try {
    const response = await fetch("/api/auth/me", {
      credentials: "include",
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error("Failed to fetch user data");
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}

export async function logout() {
  try {
    await apiRequest("POST", "/api/auth/logout", {});
    return true;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
}
