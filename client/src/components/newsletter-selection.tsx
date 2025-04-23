import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

type NewsletterSender = {
  id: number;
  name: string;
  email: string;
  domain: string;
  emailCount: number;
};

export function NewsletterSelection() {
  const { user, isFirstLogin, setIsFirstLogin, tokens } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [senders, setSenders] = useState<NewsletterSender[]>([]);
  const [selectedSenders, setSelectedSenders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Open dialog when user is logged in, it's their first login, and tokens are available
    if (user && isFirstLogin && tokens?.access_token) {
      setIsOpen(true);
      fetchNewsletterSenders();
    }
  }, [user, isFirstLogin, tokens?.access_token]); // Add tokens?.access_token to dependency array
  
  const fetchNewsletterSenders = async () => {
    if (!tokens?.access_token) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest("GET", "/api/newsletter-senders");
      if (response.ok) {
        const data = await response.json();
        console.log('senders_data', data);
        setSenders(data);
        // Pre-select all senders by default
        setSelectedSenders(data.map((sender: NewsletterSender) => sender.email));
      }
    } catch (error) {
      console.error("Error fetching newsletter senders:", error);
    } finally {
      console.log('Is Loading set to false');
      setIsLoading(false);
    }
  };
  
  const handleToggleSender = (email: string) => {
    setSelectedSenders(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email);
      } else {
        return [...prev, email];
      }
    });
  };
  
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/user/newsletter-senders", {
        senderEmails: selectedSenders
      });
      
      if (response.ok) {
        // Close dialog and mark first login as complete
        setIsOpen(false);
        setIsFirstLogin(false);
      }
    } catch (error) {
      console.error("Error saving newsletter subscriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSkip = () => {
    setIsOpen(false);
    setIsFirstLogin(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Choose Your Newsletters</DialogTitle>
          <DialogDescription>
            Select the newsletter senders you want to see content from.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="flex justify-between mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSenders(senders.map(s => s.email))}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSenders([])}
                >
                  Deselect All
                </Button>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto pr-2">
                {senders.map((sender) => (
                  <div key={sender.id} className="flex items-start space-x-3 py-2 border-b">
                    <Checkbox 
                      id={`sender-${sender.id}`}
                      checked={selectedSenders.includes(sender.email)}
                      onCheckedChange={() => handleToggleSender(sender.email)}
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor={`sender-${sender.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {sender.name || sender.email.split('@')[0]}
                      </label>
                      <div className="text-sm text-gray-500">{sender.email}</div>
                      <div className="text-xs text-gray-400">
                        {sender.emailCount} {sender.emailCount === 1 ? 'email' : 'emails'} received
                      </div>
                    </div>
                  </div>
                ))}
                
                {senders.length === 0 && (
                  <div className="py-8 text-center text-gray-500">
                    No newsletter senders found in your inbox.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={handleSkip} disabled={isLoading}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={isLoading || selectedSenders.length === 0}>
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
