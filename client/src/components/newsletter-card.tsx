import { useAuth } from "@/context/auth-context";
import { useAudio } from "@/hooks/use-audio";
import { Newsletter } from "@shared/schema";
import { truncateText } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type NewsletterCardProps = {
  newsletter: Newsletter;
  isFeatured?: boolean;
  isSaved?: boolean;
};

export function NewsletterCard({ newsletter, isFeatured = false, isSaved = false }: NewsletterCardProps) {
  const { user } = useAuth();
  const { play } = useAudio();
  const { toast } = useToast();
  const [saved, setSaved] = useState(isSaved);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be logged in to save newsletters");
      return apiRequest("POST", "/api/user/newsletters", {
        newsletterId: newsletter.id,
      });
    },
    onSuccess: () => {
      setSaved(true);
      toast({
        title: "Newsletter saved",
        description: "Added to your library",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/newsletters"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be logged in to remove saved newsletters");
      return apiRequest("DELETE", `/api/user/newsletters/${newsletter.id}`);
    },
    onSuccess: () => {
      setSaved(false);
      toast({
        title: "Newsletter removed",
        description: "Removed from your library",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/newsletters"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveToggle = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save newsletters",
        variant: "destructive",
      });
      return;
    }

    if (saved) {
      removeMutation.mutate();
    } else {
      saveMutation.mutate();
    }
  };

  const handlePlay = () => {
    play(newsletter);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
      <img 
        src={newsletter.imageUrl} 
        alt={`${newsletter.title} cover`} 
        className="w-full h-40 object-cover" 
      />
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{newsletter.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{newsletter.publisher}</p>
          </div>
          <button 
            className={`${saved ? 'text-primary dark:text-primary-light' : 'text-gray-400 hover:text-primary dark:hover:text-primary-light'}`}
            onClick={(e) => {
              e.stopPropagation();
              handleSaveToggle();
            }}
          >
            <span className="material-icons">{saved ? 'bookmark' : 'bookmark_border'}</span>
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {truncateText(newsletter.description, 80)}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span className="material-icons text-sm mr-1">schedule</span>
            <span>{Math.ceil(newsletter.duration / 60)} min</span>
          </div>
          <button 
            className="p-2 rounded-full bg-primary text-white shadow-sm hover:bg-primary-dark"
            onClick={(e) => {
              e.stopPropagation();
              handlePlay();
            }}
          >
            <span className="material-icons">play_arrow</span>
          </button>
        </div>
      </div>
    </div>
  );
}
