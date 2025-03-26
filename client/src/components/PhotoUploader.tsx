import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Info, CheckCircle, Upload, FileVideo, Film } from "lucide-react";
import { validatePhoto } from "@/lib/utils";
import { formatFileSize, formatDuration } from "@/lib/utils";
import { UploadedVideo } from "@shared/schema";

interface PhotoUploaderProps {
  projectId: string;
}

export default function PhotoUploader({ projectId }: PhotoUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadType, setUploadType] = useState<'photos' | 'video'>('photos');
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      // First validate the photo dimensions
      const validationResult = await validatePhoto(file);
      
      if (!validationResult.isValid) {
        throw new Error(validationResult.error || "Invalid photo dimensions");
      }
      
      // Upload the validated photo
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("projectId", projectId);
      formData.append("width", validationResult.width?.toString() || "0");
      formData.append("height", validationResult.height?.toString() || "0");
      
      const response = await fetch("/api/photos", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload photo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      toast({
        title: "Photo uploaded",
        description: "Your photo has been successfully uploaded",
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Video upload mutation
  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploadingVideo(true);
      
      // Upload the video file
      const formData = new FormData();
      formData.append("video", file);
      formData.append("projectId", projectId);
      
      const response = await fetch("/api/uploaded-videos", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload video");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setIsUploadingVideo(false);
      setUploadedVideo(data);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/uploaded-videos`] });
      toast({
        title: "Video subido",
        description: "Tu video ha sido subido correctamente",
      });
    },
    onError: (error: Error) => {
      setIsUploadingVideo(false);
      toast({
        title: "Fallo en la subida",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle photo drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      // Upload each file
      acceptedFiles.forEach(file => {
        uploadPhotoMutation.mutate(file);
      });
    }
  }, [uploadPhotoMutation, projectId]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    disabled: isUploading || uploadType === 'video',
    maxSize: 5 * 1024 * 1024 // 5MB
  });
  
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadVideoMutation.mutate(file);
      
      // Reset input value
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="uploader mb-6">
      {/* Tabs de selección */}
      <div className="flex border-b mb-4">
        <button 
          className={`py-2 px-4 font-medium flex items-center gap-1 ${
            uploadType === 'photos' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setUploadType('photos')}
        >
          <Film className="w-4 h-4" />
          Fotos
        </button>
        <button 
          className={`py-2 px-4 font-medium flex items-center gap-1 ${
            uploadType === 'video' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setUploadType('video')}
        >
          <FileVideo className="w-4 h-4" />
          Video
        </button>
      </div>

      {uploadType === 'photos' ? (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div 
              {...getRootProps()}
              className={`border-2 border-dashed ${
                isDragActive ? 'border-primary bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-primary'
              } rounded-lg p-6 transition-colors cursor-pointer text-center`}
            >
              <input {...getInputProps()} />
              <Cloud className="w-12 h-12 mx-auto text-blue-500 mb-2" />
              <p className="mb-2 font-semibold text-lg">
                {isDragActive ? "Suelta las fotos aquí" : "Arrastra fotos aquí o haz clic para subir"}
              </p>
              <p className="text-sm text-gray-600 mb-2">Formatos soportados: JPG, PNG (tamaño mínimo: 640x360px)</p>
              
              {isUploading && (
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full animate-pulse w-3/4"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Subiendo...</p>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-500 mt-2 flex items-center">
              <Info className="w-4 h-4 mr-1" />
              <span>Las fotos se mostrarán por períodos iguales de tiempo en el video final</span>
            </div>
          </div>
          
          {/* Photo Requirements */}
          <div className="bg-blue-50 p-4 rounded-lg w-full md:w-80 flex-shrink-0">
            <h3 className="font-medium text-blue-800 mb-2">Requisitos de las fotos</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5" />
                <span>Cualquier relación de aspecto</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5" />
                <span>Mínimo 640x360 píxeles</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5" />
                <span>Formato JPG o PNG</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5" />
                <span>Menos de 5MB por imagen</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            {uploadedVideo ? (
              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-800 flex items-center">
                    <FileVideo className="w-5 h-5 mr-2 text-blue-500" />
                    Video Subido
                  </h3>
                  <button 
                    onClick={() => setUploadedVideo(null)} 
                    className="text-red-500 hover:text-red-600"
                    title="Eliminar video"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-gray-700 space-y-2">
                  <p className="font-medium">{uploadedVideo.filename}</p>
                  <p>Duración: {formatDuration(uploadedVideo.duration || 0)}</p>
                  <p>Tamaño: {formatFileSize(uploadedVideo.size)}</p>
                  <p>Resolución: {uploadedVideo.width}×{uploadedVideo.height}</p>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary rounded-lg p-6 transition-colors text-center">
                <FileVideo className="w-12 h-12 mx-auto text-blue-500 mb-2" />
                <p className="mb-2 font-semibold text-lg">Sube un video</p>
                <p className="text-sm text-gray-600 mb-4">Formatos soportados: MP4, MOV, WEBM</p>
                
                <input
                  type="file"
                  id="video-upload"
                  className="hidden"
                  accept="video/mp4,video/quicktime,video/webm"
                  ref={videoInputRef}
                  onChange={handleVideoUpload}
                />
                <label 
                  htmlFor="video-upload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-flex items-center"
                >
                  <Upload size={16} className="mr-2" />
                  {isUploadingVideo ? 'Subiendo...' : 'Seleccionar video'}
                </label>
                
                {isUploadingVideo && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-500 h-2.5 rounded-full animate-pulse w-3/4"></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Subiendo video...</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="text-sm text-gray-500 mt-2 flex items-center">
              <Info className="w-4 h-4 mr-1" />
              <span>El video subido se combinará con el audio que generes</span>
            </div>
          </div>
          
          {/* Video Requirements */}
          <div className="bg-blue-50 p-4 rounded-lg w-full md:w-80 flex-shrink-0">
            <h3 className="font-medium text-blue-800 mb-2">Requisitos del video</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5" />
                <span>Formato MP4, MOV o WEBM</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5" />
                <span>Duración recomendada: 30-120 segundos</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5" />
                <span>Resolución mínima: 640x360 píxeles</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mr-1 mt-0.5" />
                <span>Tamaño máximo: 500MB</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
