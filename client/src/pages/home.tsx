import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { CategoryList } from "@/components/category-list";
import { NewsletterCard } from "@/components/newsletter-card";
import { NewsletterListItem } from "@/components/newsletter-list-item";
import { SubscribedNewsletterList } from "@/components/subscribed-newsletter-list";
import { Newsletter } from "@shared/schema";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  // Featured newsletters query
  const featuredQuery = useQuery<Newsletter[]>({
    queryKey: [
      "/api/newsletters/featured", 
      selectedCategoryId ? `category=${selectedCategoryId}` : '', 
      searchQuery ? `search=${searchQuery}` : ''
    ],
  });

  // Recent newsletters query
  const recentQuery = useQuery<Newsletter[]>({
    queryKey: [
      "/api/newsletters/recent", 
      selectedCategoryId ? `category=${selectedCategoryId}` : '', 
      searchQuery ? `search=${searchQuery}` : ''
    ],
  });

  // User's saved newsletters query
  const savedQuery = useQuery<{ newsletter: Newsletter; savedAt: string }[]>({
    queryKey: ["/api/user/newsletters"],
    enabled: !!user, // Only run if user is logged in
  });

  // Check if a newsletter is saved by the user
  const isNewsletterSaved = (newsletterId: number) => {
    if (!savedQuery.data) return false;
    return savedQuery.data.some(item => item.newsletter.id === newsletterId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const loadingCards = Array(3).fill(0).map((_, i) => (
    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm animate-pulse">
      <div className="w-full h-40 bg-gray-200 dark:bg-gray-700"></div>
      <div className="p-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
        <div className="flex justify-between">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
      </div>
    </div>
  ));

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Categories section */}
      <CategoryList 
        onSelectCategory={setSelectedCategoryId} 
        selectedCategoryId={selectedCategoryId} 
      />
      
      {/* Subscribed Newsletters section */}
      {user && (
        <div className="mb-6">
          <SubscribedNewsletterList />
        </div>
      )}
      
      {/* Featured Newsletters section */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Featured Newsletters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredQuery.isLoading ? (
            loadingCards
          ) : featuredQuery.data?.length ? (
            featuredQuery.data.map(newsletter => (
              <NewsletterCard 
                key={newsletter.id} 
                newsletter={newsletter} 
                isFeatured={true}
                isSaved={isNewsletterSaved(newsletter.id)}
              />
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 col-span-3 text-center py-4">
              No featured newsletters found.
            </p>
          )}
        </div>
      </div>
      
      {/* Recent Newsletters section */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Recent Newsletters</h2>
        <div className="grid grid-cols-1 gap-3">
          {recentQuery.isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm flex items-center animate-pulse">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            ))
          ) : recentQuery.data?.length ? (
            recentQuery.data.map(newsletter => (
              <NewsletterListItem 
                key={newsletter.id} 
                newsletter={newsletter} 
              />
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No recent newsletters found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
