import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-context";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react"; // Import RotateCw icon
import { Card, CardContent } from "@/components/ui/card"; // Keep Card for loading/error states
import { SubscribedNewsletter, Newsletter } from "@shared/schema";
import { NewsletterCard } from "@/components/newsletter-card"; // Import NewsletterCard

// Helper function to get a random category ID (adjust range as needed)
const getRandomCategoryId = () => {
  const mockCategoryIds = [1, 2, 3]; // Example category IDs
  return mockCategoryIds[Math.floor(Math.random() * mockCategoryIds.length)];
};

const INITIAL_DISPLAY_COUNT = 3;
const LOAD_MORE_COUNT = 3; // Number of newsletters to load each time

export function SubscribedNewsletterList() {
  const { user, tokens } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_DISPLAY_COUNT); // State to manage visible newsletters
  const [, navigate] = useLocation(); // Destructure navigate correctly

  // Query to fetch subscribed newsletters
  const {
    data: newsletters,
    isLoading,
    isError,
    refetch,
  } = useQuery<SubscribedNewsletter[]>({
    queryKey: ["/api/user/subscribed-newsletters"],
    enabled: !!user && !!tokens?.access_token,
  });

  // Function to handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setVisibleCount(INITIAL_DISPLAY_COUNT); // Reset visible count on refresh
    } finally {
      setIsRefreshing(false);
    }
  };

  // Function to handle loading more newsletters
  const handleLoadMore = () => {
    setVisibleCount(prevCount => prevCount + LOAD_MORE_COUNT);
  };

  // Extract sender name from email
  const getSenderName = (from: string) => {
    const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);
    if (match && match[1]) {
      return match[1].trim();
    }
    // Fallback if no name part is found
    const emailPart = from.match(/<?([^>]*)>?$/);
    return emailPart ? emailPart[1].split('@')[0] : from;
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
    // Keep existing loading state with skeleton cards
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Your Subscribed Newsletters</h2>
          <Button variant="outline" size="sm" disabled>
            <RotateCw /> {/* Sync icon for loading state */}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(INITIAL_DISPLAY_COUNT).fill(0).map((_, i) => (
             <Card key={i} className="animate-pulse">
               <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
               <CardContent className="p-4">
                 <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                 <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                 <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                 <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
               </CardContent>
             </Card>
          ))}
        </div>
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

  // Sort newsletters by date in descending order (latest first)
  const sortedNewsletters = Array.isArray(newsletters)
    ? [...newsletters].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  // Get the newsletters to display based on visibleCount
  const newslettersToDisplay = sortedNewsletters.slice(0, visibleCount);

  // Check if there are more newsletters to load
  const hasMoreNewsletters = sortedNewsletters.length > visibleCount;

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
          <RotateCw className={isRefreshing ? "animate-spin" : ""} /> {/* Sync icon with conditional spin */}
        </Button>
      </div>

      {newslettersToDisplay.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newslettersToDisplay.map((newsletter) => {
              // Map SubscribedNewsletter to Newsletter format for the card
              const mappedNewsletter: Newsletter = {
                id: newsletter.id, // Use the subscribed newsletter ID
                title: newsletter.subject,
                publisher: getSenderName(newsletter.from),
                description: newsletter.subject, // Use subject as description for now
                imageUrl: "https://placehold.co/300x150/moccasin/white?text=Newsletter", // Placeholder image
                audioUrl: "", // No audio for subscribed newsletters
                duration: 0, // No duration
                categoryId: getRandomCategoryId(), // Assign random category
                publishedAt: new Date(newsletter.date), // Convert date string to Date object
                featured: false, // Not featured
              };

              return (
                <div key={newsletter.id} onClick={() => navigate(`/newsletter/${newsletter.id}`)} className="cursor-pointer">
                   {/* Pass mapped data and hide actions */}
                  <NewsletterCard
                    newsletter={mappedNewsletter}
                    showActions={false}
                  />
                </div>
              );
            })}
          </div>
          {hasMoreNewsletters && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={handleLoadMore}>
                Load More Newsletters
              </Button>
            </div>
          )}
        </>
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
              <RotateCw /> {/* Sync icon for empty state */}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
