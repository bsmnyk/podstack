import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AudioProvider } from "@/context/audio-context";
import { AuthProvider } from "@/context/auth-context";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { AudioPlayer } from "@/components/audio-player";
import { LoginModal } from "@/components/login-modal";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Categories from "@/pages/categories";
import Settings from "@/pages/settings";
import AuthCallback from "@/pages/auth-callback";
import { NewsletterSelection } from "@/components/newsletter-selection";
import React from "react"; // Import React
import NewsletterViewPage from './pages/newsletter-view';

function Router() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <React.Fragment>
      <div className="flex h-screen w-screen overflow-hidden relative">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <Switch>
            <Route path="/auth/callback">
            <AuthCallback />
          </Route>

          <Route path="/newsletter/:id">
            <div className="flex-1 overflow-y-auto p-4">
              <NewsletterViewPage />
            </div>
          </Route>

          <Route path="/">
              <>
                <Header title="Dashboard" onMenuToggle={toggleSidebar} />
                <div className="flex-1 overflow-y-auto p-4">
                  <Home />
                </div>
              </>
            </Route>

            <Route path="/categories">
              <>
                <Header title="Categories" onMenuToggle={toggleSidebar} />
                <div className="flex-1 overflow-y-auto">
                  <Categories />
                </div>
              </>
            </Route>

            <Route path="/settings">
              <>
                <Header title="Settings" onMenuToggle={toggleSidebar} />
                <div className="flex-1 overflow-y-auto">
                  <Settings />
                </div>
              </>
            </Route>

            <Route>
              <>
                <Header title="Not Found" onMenuToggle={toggleSidebar} />
                <NotFound />
              </>
            </Route>
          </Switch>

          <AudioPlayer />
        </main>


      </div>
      <NewsletterSelection />
    </React.Fragment>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <AudioProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AudioProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
