import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SubscribedNewsletter } from "@shared/schema";

export function SubscribedNewsletterList() {
  const { user, tokens } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Query to fetch subscribed newsletters
  const { 
    data: newsletters, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery<SubscribedNewsletter[]>({
    queryKey: ["/api/user/subscribed-newsletters"],
    enabled: !!user && !!tokens?.access_token,
  });

  // Function to handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to mark a newsletter as read
  const markAsRead = async (id: number) => {
    if (!user || !tokens?.access_token) return;
    
    try {
      await fetch(`/api/user/subscribed-newsletters/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Refetch to update the UI
      refetch();
    } catch (error) {
      console.error("Error marking newsletter as read:", error);
    }
  };

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Extract sender name from email
  const getSenderName = (from: string) => {
    const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return from.split('@')[0];
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Please sign in to view your subscribed newsletters.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Subscribed Newsletters</h2>
          <Button variant="outline" size="sm" disabled>
            Refresh
          </Button>
        </div>
        
        {Array(3).fill(0).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500">
            Error loading newsletters. Please try again later.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Subscribed Newsletters</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      {newsletters && newsletters.length > 0 ? (
        <div className="space-y-3">
          {newsletters.map((newsletter) => (
            <Card key={newsletter.id} className={newsletter.isRead ? 'opacity-70' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {newsletter.subject}
                  </h3>
                  {!newsletter.isRead && (
                    <Badge variant="secondary" className="ml-2">New</Badge>
                  )}
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  From: {getSenderName(newsletter.from)} 
                  <span className="mx-2">•</span> 
                  {formatDate(newsletter.date)}
                </div>
                
                {newsletter.plainText && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 mt-2">
                      {newsletter.plainText}
                    </div>
                  </>
                )}
                
                <div className="flex justify-end mt-3">
                  {!newsletter.isRead && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => markAsRead(newsletter.id)}
                    >
                      Mark as read
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/api/user/subscribed-newsletters/${newsletter.id}`, '_blank')}
                  >
                    View full content
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No newsletters found. Subscribe to newsletter senders in Settings to see content here.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
