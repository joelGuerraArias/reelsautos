import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, Audio } from "@shared/schema";
import { Film, Wand2, Music } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface VideoGeneratorProps {
  projectId: string;
  photos: Photo[];
  audio: Audio;
  onBack: () => void;
}

export default function VideoGenerator({ projectId, photos, audio, onBack }: VideoGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
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
        title: "Video generated",
        description: "Your video has been created successfully"
      });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const generateVideo = () => {
    generateVideoMutation.mutate();
  };
  
  // Calculate time per photo
  const timePerPhoto = audio.duration ? Math.round(audio.duration / photos.length) : 0;

  // If video is being generated, show loading state
  if (isGenerating) {
    return (
      <div className="bg-white p-6 rounded-lg text-center mb-6">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-violet-100 w-24 h-24 flex items-center justify-center mb-4">
            <Film className="w-10 h-10 text-violet-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">Generating Video...</h3>
          <p className="text-gray-600 mb-4">Creating your video by combining photos and audio</p>
          <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-violet-500 rounded-full animate-pulse" style={{ width: '75%' }}></div>
          </div>
          <p className="text-sm text-gray-500">This may take a minute or two</p>
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
              Photos
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">{photos.length}</span> photos uploaded</p>
              <p className="mb-1">Format: {photos[0]?.width}×{photos[0]?.height}</p>
              <p>Each photo: ~{timePerPhoto} seconds</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Music className="w-4 h-4 mr-1" />
              Audio
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">{formatDuration(audio.duration || 0)}</span> duration</p>
              <p className="mb-1">Text length: {audio.text.length} characters</p>
              <p>Created from script</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Film className="w-4 h-4 mr-1" />
              Video Output
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">MP4</span> format</p>
              <p className="mb-1">Resolution: {photos[0]?.width}×{photos[0]?.height}</p>
              <p>Duration: ~{formatDuration(audio.duration || 0)}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Generate Video Button */}
      <div className="text-center mb-6">
        <button 
          className="px-8 py-3 bg-accent text-white rounded-lg hover:bg-violet-600 transition-colors font-medium flex items-center mx-auto"
          onClick={generateVideo}
          disabled={generateVideoMutation.isPending}
        >
          <Wand2 className="w-5 h-5 mr-2" />
          Generate Video
        </button>
        <p className="text-sm text-gray-500 mt-2">This will combine your photos and audio into a video</p>
      </div>
      
      <div className="flex items-center justify-between">
        <button 
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center"
          onClick={onBack}
        >
          <span className="mr-1">←</span>
          Back
        </button>
      </div>
    </div>
  );
}
