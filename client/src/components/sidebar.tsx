import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/ui/theme-provider";
import { useAuth } from "@/context/auth-context";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, logout, showLoginModal } = useAuth();

  const sidebarClass = cn(
    "w-64 h-full bg-white dark:bg-gray-800 shadow-md transition-all duration-300 ease-in-out z-20 lg:relative absolute",
    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
  );

  const isActive = (path: string) => {
    return location === path;
  };

  const menuItemClass = (path: string) => {
    return cn(
      "flex items-center p-4 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
      isActive(path) && "bg-primary/10 text-primary dark:text-primary border-r-4 border-primary"
    );
  };

  return (
    <aside className={sidebarClass}>
      {/* App Logo */}
      <div className="p-4 flex items-center border-b border-gray-200 dark:border-gray-800">
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white">
          <span className="material-icons text-sm">podcasts</span>
        </div>
        <span className="ml-2 font-semibold text-lg dark:text-white">PodStack</span>
        <button 
          className="ml-auto lg:hidden text-gray-500 dark:text-gray-400" 
          onClick={onClose}
        >
          <span className="material-icons">close</span>
        </button>
      </div>

      {/* Menu Items */}
      <nav className="mt-4">
        <ul>
          <li>
            <Link href="/">
              <div className={menuItemClass("/")}>
                <span className="material-icons mr-3">dashboard</span>
                <span>Dashboard</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/discover">
              <div className={menuItemClass("/discover")}>
                <span className="material-icons mr-3">explore</span>
                <span>Discover</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/library">
              <div className={menuItemClass("/library")}>
                <span className="material-icons mr-3">library_books</span>
                <span>My Library</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/categories">
              <div className={menuItemClass("/categories")}>
                <span className="material-icons mr-3">category</span>
                <span>Categories</span>
              </div>
            </Link>
          </li>
          <li>
            <Link href="/settings">
              <div className={menuItemClass("/settings")}>
                <span className="material-icons mr-3">settings</span>
                <span>Settings</span>
              </div>
            </Link>
          </li>
        </ul>
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 w-full border-t border-gray-200 dark:border-gray-800 p-4">
        {user ? (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={`${user.name || user.username}'s avatar`} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="material-icons text-sm text-gray-600">person</span>
              )}
            </div>
            <div className="ml-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.name || user.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>
            <button 
              className="ml-auto text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
              onClick={logout}
            >
              <span className="material-icons text-sm">logout</span>
            </button>
          </div>
        ) : (
          <button 
            className="flex items-center text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary-light transition duration-150"
            onClick={showLoginModal}
          >
            <span className="material-icons mr-3">account_circle</span>
            <span>Sign In</span>
          </button>
        )}
      </div>
    </aside>
  );
}
