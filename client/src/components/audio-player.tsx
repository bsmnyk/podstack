import { useAudio } from "@/hooks/use-audio";
import { formatTime } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function AudioPlayer() {
  const { 
    currentNewsletter, 
    isPlaying, 
    currentTime, 
    duration, 
    togglePlayPause, 
    seekTo,
    playPrevious,
    playNext
  } = useAudio();

  const [seekValue, setSeekValue] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const progressRef = useRef<HTMLInputElement>(null);
  
  // Update the seek value when currentTime changes, but only if not dragging
  useEffect(() => {
    if (!isDragging && currentTime !== undefined && duration !== undefined && duration > 0) {
      setSeekValue((currentTime / duration) * 100);
    }
  }, [currentTime, duration, isDragging]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSeekValue(value);
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    if (duration) {
      const seekTime = (seekValue / 100) * duration;
      seekTo(seekTime);
    }
    setIsDragging(false);
  };

  if (!currentNewsletter) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 shadow-md">
      <div className="flex items-center">
        {/* Cover and Info */}
        <img 
          src={currentNewsletter.imageUrl} 
          alt={`${currentNewsletter.title} cover`} 
          className="w-12 h-12 rounded object-cover mr-3" 
        />
        <div className="mr-4">
          <h4 className="font-medium text-sm text-gray-900 dark:text-white">{currentNewsletter.title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{currentNewsletter.publisher}</p>
        </div>
        
        {/* Playback Controls */}
        <div className="flex items-center space-x-3 mx-2">
          <button 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={playPrevious}
          >
            <span className="material-icons">skip_previous</span>
          </button>
          <button 
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary-dark"
            onClick={togglePlayPause}
          >
            <span className="material-icons">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
          <button 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={playNext}
          >
            <span className="material-icons">skip_next</span>
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="flex-1 mx-4">
          <div className="flex items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 w-10">
              {formatTime(currentTime || 0)}
            </span>
            <div className="flex-1 mx-2">
              <input 
                ref={progressRef}
                type="range" 
                className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none audio-progress" 
                min="0" 
                max="100" 
                value={seekValue}
                onChange={handleSeekChange}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekEnd}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekEnd}
                style={{
                  background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${seekValue}%, var(--gray-200) ${seekValue}%, var(--gray-200) 100%)`,
                }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-10">
              {formatTime(duration || 0)}
            </span>
          </div>
        </div>
        
        {/* Additional Controls */}
        <div className="flex items-center space-x-3">
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <span className="material-icons">volume_up</span>
          </button>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <span className="material-icons">speed</span>
          </button>
        </div>
      </div>
    </div>
  );
}
