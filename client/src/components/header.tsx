import { useState } from "react";
import { useTheme } from "@/components/ui/theme-provider";

type HeaderProps = {
  title: string;
  onMenuToggle: () => void;
  onSearch?: (query: string) => void;
};

export function Header({ title, onMenuToggle, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchQuery(newQuery);
    if (onSearch) {
      onSearch(newQuery);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex items-center justify-between">
      <div className="flex items-center">
        <button 
          className="mr-4 lg:hidden text-gray-500 dark:text-gray-400"
          onClick={onMenuToggle}
        >
          <span className="material-icons">menu</span>
        </button>
        <h1 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Search Bar */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <span className="material-icons text-sm">search</span>
          </span>
          <input 
            type="text" 
            className="py-2 pl-10 pr-4 block w-full border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary" 
            placeholder="Search newsletters"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        
        {/* Theme Toggle */}
        <button 
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <span className="material-icons text-gray-400">light_mode</span>
          ) : (
            <span className="material-icons text-gray-500">dark_mode</span>
          )}
        </button>
      </div>
    </header>
  );
}
