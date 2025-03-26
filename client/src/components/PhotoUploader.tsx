import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Info, CheckCircle } from "lucide-react";
import { validatePhoto } from "@/lib/utils";

interface PhotoUploaderProps {
  projectId: string;
}

export default function PhotoUploader({ projectId }: PhotoUploaderProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  
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
    disabled: isUploading,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  return (
    <div className="photo-uploader mb-6">
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
            <p className="text-xs bg-yellow-50 p-2 rounded border border-yellow-200 inline-block">
              Si prefieres subir un video directamente, continúa a la siguiente pantalla →
            </p>
            
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
    </div>
  );
}
