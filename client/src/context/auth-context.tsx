import { createContext, useContext, useEffect, useState } from "react";
import { getMe, logout as logoutApi, redirectToOAuthProvider, setupAuthMessageListener } from "@/lib/auth";
import { getGmailAuthUrl, exchangeCodeForTokens, setCredentials } from "@/lib/googleAuth";
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
      // Use Gmail-specific OAuth URL that includes Gmail API scopes
      const authUrl = getGmailAuthUrl();
      
      // Open OAuth window
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2.5;
      
      window.open(
        authUrl,
        "googleAuth",
        `width=${width},height=${height},left=${left},top=${top}`
      );
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
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center login-modal">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sign In</h2>
              <button 
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                onClick={hideLoginModal}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-6">Sign in to save your favorite newsletters and sync across devices.</p>
              
              <div className="space-y-4">
                <button 
                  className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  onClick={loginWithGoogle}
                  disabled={isAuthenticating}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-gray-800 dark:text-white font-medium">Continue with Google</span>
                </button>
                
                <button 
                  className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-md shadow-sm transition-colors"
                  onClick={loginWithFacebook}
                  disabled={isAuthenticating}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.9,2H3.1A1.1,1.1,0,0,0,2,3.1V20.9A1.1,1.1,0,0,0,3.1,22h9.58V14.25h-2.6v-3h2.6V9a3.64,3.64,0,0,1,3.88-4,20.26,20.26,0,0,1,2.33.12v2.7H17.3c-1.26,0-1.5.6-1.5,1.47v1.93h3l-.39,3H15.8V22h5.1A1.1,1.1,0,0,0,22,20.9V3.1A1.1,1.1,0,0,0,20.9,2Z"/>
                  </svg>
                  <span className="font-medium">Continue with Facebook</span>
                </button>
                
                <button 
                  className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-black hover:bg-gray-900 text-white rounded-md shadow-sm transition-colors"
                  onClick={loginWithTwitter}
                  disabled={isAuthenticating}
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span className="font-medium">Continue with X</span>
                </button>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  By continuing, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
