import { createContext, useContext, useEffect, useState } from "react";
import { getMe, logout as logoutApi, redirectToOAuthProvider, setupAuthMessageListener } from "@/lib/auth";
import { LoginModal } from "@/components/login-modal";
import { User } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isAuthenticating: boolean;
  tokens: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
  } | null;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithTwitter: () => Promise<void>;
  logout: () => Promise<void>;
  showLoginModal: () => void;
  hideLoginModal: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticating: false,
  tokens: null,
  loginWithGoogle: async () => {},
  loginWithFacebook: async () => {},
  loginWithTwitter: async () => {},
  logout: async () => {},
  showLoginModal: () => {},
  hideLoginModal: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
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


export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user on initial load
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getMe();
        setUser(userData);
      } catch (error) {
        console.error("Error fetching user:", error);
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  // Store access tokens for API requests
  const [tokens, setTokens] = useState<{
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
  } | null>(null);

  // Set up message listener for OAuth callbacks
  useEffect(() => {
    const cleanup = setupAuthMessageListener(async (data) => {
      if (data.success) {
        // If we have tokens in the message, store them
        if (data.tokens) {
          console.log("Received tokens from OAuth callback");
          
          // Save tokens in state for API requests
          setTokens({
            access_token: data.tokens.access_token,
            refresh_token: data.tokens.refresh_token,
            expiry_date: Date.now() + (data.tokens.expires_in || 3600) * 1000
          });
          
          // Set up Google API client with these tokens
          if (data.tokens.access_token) {
            setCredentials(data.tokens);
          }
        }
        
        // Refresh user data after successful login
        const userData = await getMe();
        setUser(userData);
        hideLoginModal();
        setIsAuthenticating(false);
        
        // Invalidate any user-related queries
        queryClient.invalidateQueries();
      } else {
        setIsAuthenticating(false);
        console.error("Authentication error:", data.error);
      }
    });

    return cleanup;
  }, [queryClient]);

  const loginWithProvider = async (provider: string) => {
    setIsAuthenticating(true);
    try {
      redirectToOAuthProvider(provider);
    } catch (error) {
      setIsAuthenticating(false);
      console.error(`${provider} login error:`, error);
    }
  };

  const loginWithGoogle = async () => {
    setIsAuthenticating(true);
    try {
      redirectToOAuthProvider('google');
    } catch (error) {
      setIsAuthenticating(false);
      console.error("Google login error:", error);
    }
  };

  const loginWithFacebook = async () => {
    return loginWithProvider("facebook");
  };

  const loginWithTwitter = async () => {
    return loginWithProvider("twitter");
  };

  const logout = async () => {
    setIsAuthenticating(true);
    try {
      await logoutApi();
      setUser(null);
      // Invalidate any user-related queries
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const showLoginModal = () => {
    setIsLoginModalOpen(true);
  };

  const hideLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticating,
        tokens,
        loginWithGoogle,
        loginWithFacebook,
        loginWithTwitter,
        logout,
        showLoginModal,
        hideLoginModal,
      }}
    >
      {children}
      <LoginModal isOpen={isLoginModalOpen} onClose={hideLoginModal} />
    </AuthContext.Provider>
  );
}