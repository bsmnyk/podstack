import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Category, Newsletter } from "@shared/schema";
import { NewsletterCard } from "@/components/newsletter-card";
import { useAuth } from "@/context/auth-context";

export default function Categories() {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  // Categories query
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Newsletters by category query
  const { data: newsletters, isLoading: newslettersLoading } = useQuery<Newsletter[]>({
    queryKey: [
      "/api/newsletters/by-category", 
      activeCategory?.id ?? "all",
      searchQuery ? `search=${searchQuery}` : ''
    ],
    enabled: !!categories?.length,
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

  const renderCategoryTab = (category: Category) => {
    const isActive = activeCategory?.id === category.id;
    return (
      <button
        key={category.id}
        className={`px-4 py-2 mr-2 rounded-md transition-colors ${
          isActive
            ? "bg-primary text-white"
            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
        }`}
        onClick={() => setActiveCategory(category)}
      >
        {category.name}
      </button>
    );
  };

  if (categoriesLoading) {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Categories</h2>
      
      {/* Category Tabs */}
      <div className="flex overflow-x-auto pb-2 mb-6">
        <button
          className={`px-4 py-2 mr-2 rounded-md transition-colors ${
            !activeCategory
              ? "bg-primary text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {categories?.map(renderCategoryTab)}
      </div>
      
      {/* Category Description */}
      {activeCategory && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {activeCategory.name}
          </h3>
          {activeCategory.description && (
            <p className="text-gray-600 dark:text-gray-300">{activeCategory.description}</p>
          )}
        </div>
      )}
      
      {/* Newsletters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {newslettersLoading ? (
          Array(6).fill(0).map((_, i) => (
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
          ))
        ) : newsletters?.length ? (
          newsletters.map(newsletter => (
            <NewsletterCard 
              key={newsletter.id} 
              newsletter={newsletter}
              isSaved={isNewsletterSaved(newsletter.id)}
            />
          ))
        ) : (
          <p className="text-gray-500 dark:text-gray-400 col-span-3 text-center py-4">
            No newsletters found in this category.
          </p>
        )}
      </div>
    </div>
  );
}
