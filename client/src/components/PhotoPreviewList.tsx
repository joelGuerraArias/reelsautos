import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo } from "@shared/schema";
import { Trash2 } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface PhotoPreviewListProps {
  photos: Photo[];
  projectId: string;
}

export default function PhotoPreviewList({ photos, projectId }: PhotoPreviewListProps) {
  const { toast } = useToast();
  
  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: number) => {
      return apiRequest("DELETE", `/api/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      toast({
        title: "Photo deleted",
        description: "The photo has been removed from your project"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Delete all photos mutation
  const deleteAllPhotosMutation = useMutation({
    mutationFn: async () => {
      // Delete each photo one by one
      await Promise.all(photos.map(photo => 
        apiRequest("DELETE", `/api/photos/${photo.id}`)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/photos`] });
      toast({
        title: "All photos deleted",
        description: "All photos have been removed from your project"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Calculate video time per photo
  const calculateTimePerPhoto = () => {
    // Assume average audio duration of 60 seconds if no photos
    const estimatedDuration = 60;
    return photos.length > 0 ? Math.round(estimatedDuration / photos.length) : 0;
  };
  
  const removePhoto = (photoId: number) => {
    deletePhotoMutation.mutate(photoId);
  };
  
  const clearAllPhotos = () => {
    if (photos.length === 0) return;
    
    if (confirm("Are you sure you want to delete all photos?")) {
      deleteAllPhotosMutation.mutate();
    }
  };

  return (
    <div className="photo-preview-list mb-6">
      <h3 className="text-lg font-medium mb-3">Uploaded Photos ({photos.length})</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map(photo => (
          <div key={photo.id} className="photo-item relative group">
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={`/api/images/photos/${photo.id}?t=${Date.now()}`} 
                alt={photo.filename} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                className="bg-white rounded-full p-1 shadow hover:bg-red-50"
                onClick={() => removePhoto(photo.id)}
                disabled={deletePhotoMutation.isPending}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
            <div className="mt-1 flex justify-between items-center">
              <span className="text-sm text-gray-500 truncate">{photo.filename}</span>
              <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{photo.width}×{photo.height}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{photos.length}</span> photos uploaded
          <span className="mx-2">•</span>
          {photos.length > 0 ? (
            <>
              With <span className="font-medium">{photos.length}</span> photos, each will display for <span className="font-medium">{calculateTimePerPhoto()} seconds</span> in a video
            </>
          ) : "Upload photos to create your video"}
        </div>
        
        <button 
          className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
          onClick={clearAllPhotos}
          disabled={deleteAllPhotosMutation.isPending || photos.length === 0}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear All
        </button>
      </div>
    </div>
  );
}
