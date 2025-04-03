import { useState, useRef, useEffect } from "react";
import { Photo, Audio, Video } from "@shared/schema";
import { Download, ArrowLeft, PlusCircle, Save, Copy } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface VideoPreviewProps {
  video: Video;
  photos: Photo[];
  audio: Audio;
  onBack: () => void;
  onNewProject: () => void;
  projectId: string; // Añadido para guardar la configuración
}

export default function VideoPreview({ video, photos, audio, onBack, onNewProject, projectId }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  
  // Consultas para obtener configuraciones
  const appSettingsQuery = useQuery({
    queryKey: ['/api/app-settings']
  });
  
  // Mutation para guardar el proyecto como plantilla
  const saveAsTemplateMutation = useMutation({
    mutationFn: async () => {
      // Obtener las configuraciones actuales
      const settings = appSettingsQuery.data;
      if (!settings) throw new Error("No se pudo obtener la configuración");
      
      // Obtener información de la voz usada
      const audioData = audio || {};
      
      // Guardar la configuración actual como atributos del proyecto
      return apiRequest("PATCH", `/api/projects/${projectId}`, {
        isTemplate: true,
        selectedLogoId: settings.selectedLogoId,
        logoPosition: settings.logoPosition,
        showTitle: settings.showTitle,
        titleFontSize: settings.titleFontSize,
        titleColor: settings.titleColor,
        titlePosition: settings.titlePosition,
        selectedVoiceId: audioData.voiceId,
        backgroundMusicId: settings.backgroundMusicId,
        backgroundMusicVolume: settings.backgroundMusicVolume,
        useUploadedVideo: false // Por defecto usar fotos
      });
    },
    onSuccess: () => {
      setIsSavingTemplate(false);
      toast({
        title: "Plantilla guardada",
        description: "La configuración ha sido guardada como plantilla"
      });
    },
    onError: (error: Error) => {
      setIsSavingTemplate(false);
      toast({
        title: "Error al guardar plantilla",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Descargar video automáticamente cuando se carga la página
  useEffect(() => {
    // Pequeño retraso para permitir que la interfaz se renderice primero
    const timer = setTimeout(() => {
      downloadVideo();
      toast({
        title: "Video descargando",
        description: "Tu video se está descargando automáticamente"
      });
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const downloadVideo = () => {
    window.location.href = `/api/videos/${video.id}/download`;
  };
  
  // Guardar la configuración actual como plantilla
  const saveAsTemplate = () => {
    setIsSavingTemplate(true);
    saveAsTemplateMutation.mutate();
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-3">Video Generado</h3>
      
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <div className="aspect-video w-full bg-black flex items-center justify-center">
          <video 
            ref={videoRef}
            controls
            className="max-w-full max-h-full"
            poster={photos.length > 0 ? `/api/photos/${photos[0].id}/stream` : undefined}
          >
            <source src={`/api/videos/${video.id}/stream`} type="video/mp4" />
            Tu navegador no soporta la etiqueta de video.
          </video>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="text-gray-700">
          <span className="font-medium">{video.filename}</span>
          <span className="mx-2">•</span>
          <span>{formatDuration(video.duration || 0)}</span>
          <span className="mx-2">•</span>
          <span>{photos[0]?.width}×{photos[0]?.height}</span>
        </div>
        
        <button 
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
          onClick={downloadVideo}
        >
          <Download className="w-4 h-4 mr-1" />
          Descargar Video
        </button>
      </div>
      
      <div className="flex items-center justify-between mt-6">
        <button 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Atrás
        </button>
        
        <div className="flex space-x-2">
          <button 
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium flex items-center"
            onClick={saveAsTemplate}
            disabled={isSavingTemplate}
          >
            {isSavingTemplate ? (
              <>
                <Save className="w-4 h-4 mr-1 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                Guardar Configuración
              </>
            )}
          </button>
          
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
            onClick={onNewProject}
          >
            <PlusCircle className="w-4 h-4 mr-1" />
            Crear Nuevo Proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
