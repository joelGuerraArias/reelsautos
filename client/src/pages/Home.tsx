import { useState, useEffect } from "react";
import { nanoid } from "nanoid";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Stepper from "@/components/Stepper";
import PhotoUploader from "@/components/PhotoUploader";
import PhotoPreviewList from "@/components/PhotoPreviewList";
import AudioGenerator from "@/components/AudioGenerator";
import AudioPreview from "@/components/AudioPreview";
import VideoSettings from "@/components/VideoSettings";
import VideoGenerator from "@/components/VideoGenerator";
import VideoPreview from "@/components/VideoPreview";
import ErrorDisplay from "@/components/ErrorDisplay";
import SaveProjectDialog from "@/components/SaveProjectDialog";
import ProjectsList from "@/components/ProjectsList";
import { Photo, Audio, Video, ElevenLabsVoice, Project } from "@shared/schema";
import { Film, Wand2, Settings, Save, FolderOpen, FilePlus } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Step definitions
enum Step {
  UPLOAD_PHOTOS = 0,
  CREATE_AUDIO = 1,
  CONFIGURE_VIDEO = 2,
  GENERATE_VIDEO = 3
}

export default function Home() {
  const { toast } = useToast();
  
  // State variables
  const [currentStep, setCurrentStep] = useState<Step>(Step.UPLOAD_PHOTOS);
  const [projectId, setProjectId] = useState<string>(nanoid());
  const [error, setError] = useState<string | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>([]);
  
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
  
  const uploadedVideosQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/uploaded-videos`],
    enabled: !!projectId,
  });
  
  // Obtener el proyecto actual
  const projectQuery = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Obtener plantilla más reciente (proyecto con isTemplate=true)
  const templateQuery = useQuery({
    queryKey: ['/api/templates/latest'],
    enabled: false // Lo activaremos cuando sea necesario
  });
  
  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (useTemplate: boolean = false) => {
      const newProject = {
        id: projectId,
        title: `Project ${new Date().toLocaleDateString()}`,
        createdAt: new Date().toISOString()
      };
      
      // Si hay una plantilla y queremos usarla, copiar sus configuraciones
      if (useTemplate && templateQuery.data) {
        const template = templateQuery.data as Project;
        
        // Copiar configuraciones relevantes de la plantilla al nuevo proyecto
        const projectWithConfig = {
          ...newProject,
          selectedVoiceId: template.selectedVoiceId,
          selectedLogoId: template.selectedLogoId,
          logoPosition: template.logoPosition,
          showTitle: template.showTitle,
          titleText: template.titleText,
          titleFontSize: template.titleFontSize,
          titleColor: template.titleColor,
          titlePosition: template.titlePosition,
          backgroundMusicId: template.backgroundMusicId,
          backgroundMusicVolume: template.backgroundMusicVolume,
          useUploadedVideo: template.useUploadedVideo
        };
        
        Object.assign(newProject, projectWithConfig);
      }
      
      return apiRequest('POST', '/api/projects', newProject);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });
  
  // Initialize project if it doesn't exist
  useEffect(() => {
    // Si estamos empezando y no se está creando un proyecto ni ha sido creado ya
    if (!createProjectMutation.isPending && !createProjectMutation.isSuccess && !projectQuery.data) {
      // Intentar obtener la plantilla más reciente
      templateQuery.refetch().then(result => {
        if (result.data) {
          // Hay plantilla, usarla para el nuevo proyecto
          createProjectMutation.mutate(true);
        } else {
          // No hay plantilla, crear proyecto sin ella
          createProjectMutation.mutate(false);
        }
      });
    }
  }, [createProjectMutation.isPending, createProjectMutation.isSuccess, projectQuery.data]);
  
  // Navigation functions
  const goToNextStep = () => {
    // No validation needed - user can proceed without photos to upload video later
    // Skip validation to allow video upload option on next screen
    
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
    
    // Intentar obtener la plantilla más reciente
    templateQuery.refetch().then(result => {
      if (result.data) {
        // Hay plantilla, usarla para el nuevo proyecto
        createProjectMutation.mutate(true);
      } else {
        // No hay plantilla, crear proyecto sin ella
        createProjectMutation.mutate(false);
      }
      
      toast({
        title: "Nuevo proyecto creado",
        description: "Puedes comenzar a subir fotos",
      });
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
              Subir Fotos o Video
            </h2>
            
            <div className="bg-blue-50 p-4 mb-6 rounded-lg border border-blue-200">
              <p className="text-blue-800 font-medium mb-2">Sube tus archivos:</p>
              <p className="text-blue-700 text-sm">
                Para crear tu video, puedes seleccionar entre subir fotos o un video usando las 
                pestañas de arriba. Ambos métodos funcionan perfectamente para crear tu presentación.
              </p>
            </div>
            
            <PhotoUploader projectId={projectId} />
            
            {photosQuery.data && Array.isArray(photosQuery.data) && photosQuery.data.length > 0 && (
              <PhotoPreviewList 
                photos={photosQuery.data as Photo[]} 
                projectId={projectId} 
              />
            )}

            <div className="flex justify-end mt-6">
              <button 
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                onClick={goToNextStep}
              >
                Continuar
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
              Generar Audio
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
        
      case Step.CONFIGURE_VIDEO:
        return (
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2 text-primary"><Settings size={20} /></span>
              Configurar Video
            </h2>
            
            <VideoSettings 
              projectId={projectId}
              photos={photosQuery.data as Photo[]}
              audio={audioQuery.data as Audio}
              onBack={goToPreviousStep}
              onContinue={goToNextStep}
              uploadedVideos={uploadedVideosQuery.data as any[]}
              selectedVideoIds={selectedVideoIds}
              onVideoSelectionChange={setSelectedVideoIds}
            />
          </div>
        );
        
      case Step.GENERATE_VIDEO:
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2 text-primary"><Film size={20} /></span>
              Generar Video
            </h2>
            
            {!videoQuery.data ? (
              <VideoGenerator 
                projectId={projectId} 
                photos={photosQuery.data as Photo[]} 
                audio={audioQuery.data as Audio}
                onBack={goToPreviousStep}
                uploadedVideos={uploadedVideosQuery.data as any[]}
                selectedVideoIds={selectedVideoIds}
              />
            ) : (
              <VideoPreview 
                video={videoQuery.data as Video} 
                photos={photosQuery.data as Photo[]} 
                audio={audioQuery.data as Audio}
                onBack={goToPreviousStep}
                onNewProject={startNewProject}
                projectId={projectId}
              />
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  // States for dialogs
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isProjectsListOpen, setIsProjectsListOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState<string | undefined>(undefined);
  
  // Handler for saving a project
  const handleSaveProject = (savedProjectId: string) => {
    toast({
      title: "Proyecto guardado",
      description: "El proyecto se ha guardado correctamente"
    });
    setIsSaveDialogOpen(false);
    
    // Actualizar la información del proyecto para reflejar el título
    queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
  };
  
  // Handler for selecting a project from the list
  const handleSelectProject = (selectedProjectId: string) => {
    if (selectedProjectId === projectId) {
      setIsProjectsListOpen(false);
      return;
    }
    
    setProjectId(selectedProjectId);
    setIsProjectsListOpen(false);
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries();
    
    // Start at the first step
    setCurrentStep(Step.UPLOAD_PHOTOS);
    
    toast({
      title: "Proyecto cargado",
      description: "El proyecto se ha cargado correctamente"
    });
  };
  
  // Get project title for display
  useEffect(() => {
    if (projectQuery.data) {
      const project = projectQuery.data as Project;
      setProjectTitle(project.title);
    }
  }, [projectQuery.data]);

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
              <p className="text-gray-600 mt-1">Crea videos a partir de tus fotos y texto</p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <div className="text-sm font-medium text-gray-600 mr-2">
                {projectTitle || "Proyecto sin guardar"}
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsSaveDialogOpen(true)}
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsProjectsListOpen(true)}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Abrir
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={startNewProject}
              >
                <FilePlus className="mr-2 h-4 w-4" />
                Nuevo
              </Button>
            </div>
          </div>
        </header>
        
        {/* Save Project Dialog */}
        <SaveProjectDialog 
          isOpen={isSaveDialogOpen}
          onClose={() => setIsSaveDialogOpen(false)}
          onSaved={handleSaveProject}
          projectId={projectId}
          currentTitle={projectTitle}
        />
        
        {/* Projects List Dialog */}
        <Dialog open={isProjectsListOpen} onOpenChange={setIsProjectsListOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <ProjectsList 
              onSelectProject={handleSelectProject}
              onCreateNewProject={() => {
                startNewProject();
                setIsProjectsListOpen(false);
              }}
              onLoadTemplate={handleSelectProject}
              currentProjectId={projectId}
            />
          </DialogContent>
        </Dialog>

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
