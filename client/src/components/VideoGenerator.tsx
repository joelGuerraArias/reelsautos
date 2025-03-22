import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, Audio } from "@shared/schema";
import { Film, Wand2, Music, Settings, X } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import VideoSettings from "./VideoSettings";

interface VideoGeneratorProps {
  projectId: string;
  photos: Photo[];
  audio: Audio;
  onBack: () => void;
}

export default function VideoGenerator({ projectId, photos, audio, onBack }: VideoGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Generate video mutation
  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      return apiRequest("POST", "/api/videos", {
        photoIds: photos.map(photo => photo.id.toString()),
        audioId: audio.id,
        projectId
      });
    },
    onSuccess: () => {
      setIsGenerating(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/video`] });
      toast({
        title: "Video generado",
        description: "Tu video ha sido creado exitosamente"
      });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast({
        title: "Error en la generación",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const generateVideo = () => {
    generateVideoMutation.mutate();
  };
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Calculate time per photo
  const timePerPhoto = audio.duration ? Math.round(audio.duration / photos.length) : 0;

  // If video is being generated, show loading state
  if (isGenerating) {
    return (
      <div className="bg-white p-6 rounded-lg text-center mb-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-blue-100 w-24 h-24 flex items-center justify-center mb-4">
            <Film className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">Generando Video...</h3>
          <p className="text-gray-600 mb-4">Creando tu video combinando fotos y audio</p>
          <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '75%' }}></div>
          </div>
          <p className="text-sm text-gray-500">Esto puede tardar un minuto o dos</p>
        </div>
      </div>
    );
  }

  // If settings modal is open
  if (showSettings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="w-full max-w-4xl">
          <VideoSettings onClose={toggleSettings} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Video Summary */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Film className="w-4 h-4 mr-1" />
              Fotos
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">{photos.length}</span> fotos subidas</p>
              <p className="mb-1">Formato: {photos[0]?.width}×{photos[0]?.height}</p>
              <p>Cada foto: ~{timePerPhoto} segundos</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Music className="w-4 h-4 mr-1" />
              Audio
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">{formatDuration(audio.duration || 0)}</span> duración</p>
              <p className="mb-1">Longitud del texto: {audio.text.length} caracteres</p>
              <p>Creado a partir del guion</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Film className="w-4 h-4 mr-1" />
              Video de Salida
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">MP4</span> formato</p>
              <p className="mb-1">Resolución: {photos[0]?.width}×{photos[0]?.height}</p>
              <p>Duración: ~{formatDuration(audio.duration || 0)}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Settings Button */}
      <div className="text-center mb-4">
        <button 
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center mx-auto"
          onClick={toggleSettings}
        >
          <Settings className="w-4 h-4 mr-2" />
          Configurar Títulos y Logos
        </button>
      </div>
      
      {/* Generate Video Button */}
      <div className="text-center mb-6">
        <button 
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center mx-auto"
          onClick={generateVideo}
          disabled={generateVideoMutation.isPending}
        >
          <Wand2 className="w-5 h-5 mr-2" />
          Generar Video
        </button>
        <p className="text-sm text-gray-500 mt-2">Esto combinará tus fotos y audio en un video</p>
      </div>
      
      <div className="flex items-center justify-between">
        <button 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
          onClick={onBack}
        >
          <span className="mr-1">←</span>
          Atrás
        </button>
      </div>
    </div>
  );
}
