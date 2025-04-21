import { createContext, useEffect, useRef, useState } from "react";
import { Newsletter } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Howl } from "howler";

interface AudioContextType {
  currentNewsletter: Newsletter | null;
  playlist: Newsletter[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (newsletter: Newsletter) => void;
  togglePlayPause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  playNext: () => void;
  playPrevious: () => void;
}

export const AudioContext = createContext<AudioContextType>({
  currentNewsletter: null,
  playlist: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  play: () => {},
  togglePlayPause: () => {},
  seekTo: () => {},
  setVolume: () => {},
  setPlaybackRate: () => {},
  playNext: () => {},
  playPrevious: () => {},
});

interface AudioProviderProps {
  children: React.ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [currentNewsletter, setCurrentNewsletter] = useState<Newsletter | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Howl | null>(null);
  const queryClient = useQueryClient();

  // Fetch recent newsletters for the playlist
  const { data: recentNewsletters = [] } = useQuery<Newsletter[]>({
    queryKey: ["/api/newsletters/recent"],
  });

  // Update playlist when recent newsletters change
  const [playlist, setPlaylist] = useState<Newsletter[]>([]);
  useEffect(() => {
    if (recentNewsletters.length > 0) {
      setPlaylist(recentNewsletters);
    }
  }, [recentNewsletters]);

  const updatePlayStatus = (status: boolean) => {
    setIsPlaying(status);
  };

  const updateTimeInfo = () => {
    if (soundRef.current) {
      const seek = soundRef.current.seek() as number;
      setCurrentTime(seek);
      
      // Schedule the next update
      requestAnimationFrame(updateTimeInfo);
    }
  };

  // Clean up and set up a new audio
  const setupAudio = (newsletter: Newsletter) => {
    // Clean up existing sound
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.unload();
    }

    // Create new Howl instance
    const sound = new Howl({
      src: [newsletter.audioUrl],
      html5: true,
      onplay: () => {
        updatePlayStatus(true);
        requestAnimationFrame(updateTimeInfo);
      },
      onpause: () => updatePlayStatus(false),
      onstop: () => updatePlayStatus(false),
      onend: () => {
        updatePlayStatus(false);
        playNext();
      },
      onload: () => {
        setDuration(sound.duration());
      },
    });

    soundRef.current = sound;
    setCurrentNewsletter(newsletter);
    
    // Play the sound
    sound.play();
  };

  const play = (newsletter: Newsletter) => {
    setupAudio(newsletter);
  };

  const togglePlayPause = () => {
    if (!soundRef.current || !currentNewsletter) return;
    
    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  const seekTo = (time: number) => {
    if (soundRef.current) {
      soundRef.current.seek(time);
      setCurrentTime(time);
    }
  };

  const setVolume = (volume: number) => {
    if (soundRef.current) {
      soundRef.current.volume(volume);
    }
  };

  const setPlaybackRate = (rate: number) => {
    if (soundRef.current) {
      soundRef.current.rate(rate);
    }
  };

  const findCurrentIndex = () => {
    if (!currentNewsletter) return -1;
    return playlist.findIndex(item => item.id === currentNewsletter.id);
  };

  const playNext = () => {
    const currentIndex = findCurrentIndex();
    if (currentIndex === -1 || playlist.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % playlist.length;
    play(playlist[nextIndex]);
  };

  const playPrevious = () => {
    const currentIndex = findCurrentIndex();
    if (currentIndex === -1 || playlist.length === 0) return;
    
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    play(playlist[prevIndex]);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.unload();
      }
    };
  }, []);

  const contextValue: AudioContextType = {
    currentNewsletter,
    playlist,
    isPlaying,
    currentTime,
    duration,
    play,
    togglePlayPause,
    seekTo,
    setVolume,
    setPlaybackRate,
    playNext,
    playPrevious,
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
}
