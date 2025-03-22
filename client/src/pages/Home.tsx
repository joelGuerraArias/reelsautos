import { useState } from "react";
import { nanoid } from "nanoid";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Stepper from "@/components/Stepper";
import PhotoUploader from "@/components/PhotoUploader";
import PhotoPreviewList from "@/components/PhotoPreviewList";
import AudioGenerator from "@/components/AudioGenerator";
import AudioPreview from "@/components/AudioPreview";
import VideoGenerator from "@/components/VideoGenerator";
import VideoPreview from "@/components/VideoPreview";
import ErrorDisplay from "@/components/ErrorDisplay";
import { Photo, Audio, Video, ElevenLabsVoice } from "@shared/schema";
import { Film, Wand2 } from "lucide-react";

// Step definitions
enum Step {
  UPLOAD_PHOTOS = 0,
  CREATE_AUDIO = 1,
  GENERATE_VIDEO = 2
}

export default function Home() {
  const { toast } = useToast();
  
  // State variables
  const [currentStep, setCurrentStep] = useState<Step>(Step.UPLOAD_PHOTOS);
  const [projectId, setProjectId] = useState<string>(nanoid());
  const [error, setError] = useState<string | null>(null);
  
  // Queries for project data
  const photosQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/photos`],
    enabled: !!projectId,
  });
  
  const audioQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/audio`],
    enabled: !!projectId,
  });
  
  const videoQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/video`],
    enabled: !!projectId,
  });
  
  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/projects', {
        id: projectId,
        title: `Project ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });
  
  // Initialize project if it doesn't exist
  if (!createProjectMutation.isPending && !createProjectMutation.isSuccess) {
    createProjectMutation.mutate();
  }
  
  // Navigation functions
  const goToNextStep = () => {
    // Validate before proceeding
    if (currentStep === Step.UPLOAD_PHOTOS && (!photosQuery.data || photosQuery.data.length === 0)) {
      toast({
        title: "No photos uploaded",
        description: "Please upload at least one photo before continuing",
        variant: "destructive"
      });
      return;
    }
    
    if (currentStep === Step.CREATE_AUDIO && !audioQuery.data) {
      toast({
        title: "No audio generated",
        description: "Please generate audio before continuing",
        variant: "destructive"
      });
      return;
    }
    
    setCurrentStep(prev => Math.min(prev + 1, Step.GENERATE_VIDEO) as Step);
  };
  
  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, Step.UPLOAD_PHOTOS) as Step);
  };
  
  const startNewProject = () => {
    // Create a new project ID
    const newProjectId = nanoid();
    setProjectId(newProjectId);
    
    // Reset to first step
    setCurrentStep(Step.UPLOAD_PHOTOS);
    
    // Clear cached data
    queryClient.invalidateQueries();
    
    // Create the new project
    createProjectMutation.mutate();
    
    toast({
      title: "New project created",
      description: "You can now start uploading photos",
    });
  };
  
  const dismissError = () => {
    setError(null);
  };

  // Render main content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case Step.UPLOAD_PHOTOS:
        return (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2 text-primary"><Wand2 size={20} /></span>
              Upload Photos
            </h2>
            
            <PhotoUploader projectId={projectId} />
            
            {photosQuery.data && photosQuery.data.length > 0 && (
              <PhotoPreviewList 
                photos={photosQuery.data as Photo[]} 
                projectId={projectId} 
              />
            )}

            <div className="flex justify-end mt-6">
              <button 
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center"
                onClick={goToNextStep}
              >
                Continue
                <span className="ml-1">→</span>
              </button>
            </div>
          </div>
        );
        
      case Step.CREATE_AUDIO:
        return (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2 text-primary"><Wand2 size={20} /></span>
              Generate Audio
            </h2>
            
            {!audioQuery.data ? (
              <AudioGenerator 
                projectId={projectId} 
                photos={photosQuery.data as Photo[]} 
                onBack={goToPreviousStep}
              />
            ) : (
              <AudioPreview 
                audio={audioQuery.data as Audio} 
                photos={photosQuery.data as Photo[]} 
                onBack={goToPreviousStep}
                onContinue={goToNextStep}
              />
            )}
          </div>
        );
        
      case Step.GENERATE_VIDEO:
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2 text-primary"><Film size={20} /></span>
              Generate Video
            </h2>
            
            {!videoQuery.data ? (
              <VideoGenerator 
                projectId={projectId} 
                photos={photosQuery.data as Photo[]} 
                audio={audioQuery.data as Audio}
                onBack={goToPreviousStep}
              />
            ) : (
              <VideoPreview 
                video={videoQuery.data as Video} 
                photos={photosQuery.data as Photo[]} 
                audio={audioQuery.data as Audio}
                onBack={goToPreviousStep}
                onNewProject={startNewProject}
              />
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 text-gray-800 font-sans min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 flex items-center">
                <span className="text-primary">Foto</span><span className="text-accent">To</span><span className="text-secondary">Video</span>
                <Film className="ml-2 text-accent" />
              </h1>
              <p className="text-gray-600 mt-1">Create videos from your photos and text</p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          {/* Step Indicator */}
          <Stepper currentStep={currentStep} />

          {/* Workflow Container */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            {renderStepContent()}
          </div>
          
          {/* Error Display */}
          {error && (
            <ErrorDisplay error={error} onDismiss={dismissError} />
          )}
        </main>
        
        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} FotoToVideo - Create videos from photos and text</p>
          <p className="mt-1">Powered by Eleven Labs API</p>
        </footer>
      </div>
    </div>
  );
}
