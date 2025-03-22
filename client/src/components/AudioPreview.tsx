import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, Audio } from "@shared/schema";
import { Play, Pause, RefreshCw } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface AudioPreviewProps {
  audio: Audio;
  photos: Photo[];
  onBack: () => void;
  onContinue: () => void;
}

export default function AudioPreview({ audio, photos, onBack, onContinue }: AudioPreviewProps) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Regenerate audio mutation
  const regenerateAudioMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/audios/${audio.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${audio.projectId}/audio`] });
      toast({
        title: "Audio eliminado",
        description: "Ahora puedes generar un nuevo audio"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "La regeneración falló",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Audio control functions
  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };
  
  const regenerateAudio = () => {
    if (confirm("¿Estás seguro que deseas regenerar el audio? Esto eliminará el audio actual.")) {
      regenerateAudioMutation.mutate();
    }
  };
  
  // Update progress bar on time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100;
      setProgress(progress);
      setCurrentTime(audioRef.current.currentTime);
    }
  };
  
  // Reset progress when audio ends
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };
  
  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener("play", () => setIsPlaying(true));
      audio.addEventListener("pause", () => setIsPlaying(false));
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleAudioEnded);
      
      return () => {
        audio.removeEventListener("play", () => setIsPlaying(true));
        audio.removeEventListener("pause", () => setIsPlaying(false));
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleAudioEnded);
      };
    }
  }, []);

  return (
    <div>
      <h3 className="text-lg font-medium mb-3">Audio Generado</h3>
      
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <span className="font-medium text-gray-800">{audio.filename}</span>
            </div>
            <span className="text-sm text-gray-500">{formatDuration(audio.duration || 0)}</span>
          </div>
          
          {/* Hidden audio element for playback */}
          <audio 
            ref={audioRef} 
            src={`/api/audios/${audio.id}/stream`}
            preload="metadata"
            className="hidden"
          />
          
          <div className="w-full bg-white h-14 rounded-lg p-2 flex items-center">
            <button 
              className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3 hover:bg-blue-700 transition-colors"
              onClick={togglePlayback}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <div className="flex-1 h-8">
              <div className="relative w-full h-full">
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center">
                  <div className="h-2 bg-gray-200 w-full rounded-full">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <button 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center ml-auto"
            onClick={regenerateAudio}
            disabled={regenerateAudioMutation.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Regenerar Audio
          </button>
        </div>
      </div>
      
      <div className="mt-6 flex justify-between">
        <button 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
          onClick={onBack}
        >
          <span className="mr-1">←</span>
          Atrás
        </button>
        
        <button 
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
          onClick={onContinue}
        >
          Continuar
          <span className="ml-1">→</span>
        </button>
      </div>
    </div>
  );
}
