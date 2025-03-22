import { useState, useRef, useEffect } from "react";
import { Photo, Audio, Video } from "@shared/schema";
import { Download, ArrowLeft, PlusCircle } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface VideoPreviewProps {
  video: Video;
  photos: Photo[];
  audio: Audio;
  onBack: () => void;
  onNewProject: () => void;
}

export default function VideoPreview({ video, photos, audio, onBack, onNewProject }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const downloadVideo = () => {
    window.location.href = `/api/videos/${video.id}/download`;
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
        
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
          onClick={onNewProject}
        >
          <PlusCircle className="w-4 h-4 mr-1" />
          Crear Nuevo Proyecto
        </button>
      </div>
    </div>
  );
}
