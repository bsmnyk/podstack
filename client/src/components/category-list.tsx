import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Category } from "@shared/schema";
import { Button } from "@/components/ui/button";

type CategoryListProps = {
  onSelectCategory: (categoryId: number | null) => void;
  selectedCategoryId: number | null;
};

export function CategoryList({ onSelectCategory, selectedCategoryId }: CategoryListProps) {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Categories</h2>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Categories</h2>
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedCategoryId === null ? "default" : "outline"}
          className="rounded-full whitespace-nowrap flex-shrink-0"
          onClick={() => onSelectCategory(null)}
        >
          All
        </Button>
        
        {categories?.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategoryId === category.id ? "default" : "outline"}
            className="rounded-full whitespace-nowrap flex-shrink-0"
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
