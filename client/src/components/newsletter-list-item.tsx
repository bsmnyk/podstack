import { useAuth } from "@/context/auth-context";
import { useAudio } from "@/hooks/use-audio";
import { Newsletter } from "@shared/schema";
import { formatDate } from "@/lib/utils";

type NewsletterListItemProps = {
  newsletter: Newsletter;
  onClick?: (newsletter: Newsletter) => void;
};

export function NewsletterListItem({ newsletter, onClick }: NewsletterListItemProps) {
  const { play } = useAudio();

  const handleClick = () => {
    if (onClick) {
      onClick(newsletter);
    } else {
      play(newsletter);
    }
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer flex items-center"
      onClick={handleClick}
    >
      <img 
        src={newsletter.imageUrl} 
        alt={`${newsletter.title} cover`} 
        className="w-16 h-16 rounded object-cover mr-3" 
      />
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-white">{newsletter.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{newsletter.publisher}</p>
        <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span className="material-icons text-xs mr-1">schedule</span>
          <span>{Math.ceil(newsletter.duration / 60)} min</span>
          <span className="mx-2">•</span>
          <span>{formatDate(newsletter.publishedAt)}</span>
        </div>
      </div>
      <button 
        className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={(e) => {
          e.stopPropagation();
          // This would typically open a menu with more options
        }}
      >
        <span className="material-icons">more_vert</span>
      </button>
    </div>
  );
}
