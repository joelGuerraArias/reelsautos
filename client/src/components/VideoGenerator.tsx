import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, Audio, AppSettings, Logo, BackgroundMusic, UploadedVideo } from "@shared/schema";
import { 
  Film, 
  Wand2, 
  Music, 
  Settings, 
  X, 
  Image, 
  Type, 
  Check, 
  CornerRightUp,
  CornerLeftUp,
  CornerLeftDown,
  CornerRightDown,
  Save,
  Upload,
  Video,
  Volume2,
  Disc,
  FileVideo
} from "lucide-react";
import { formatDuration, formatFileSize } from "@/lib/utils";

interface VideoGeneratorProps {
  projectId: string;
  photos: Photo[];
  audio: Audio;
  onBack: () => void;
  uploadedVideos?: UploadedVideo[];
  selectedVideoIds?: number[];
}

export default function VideoGenerator({ projectId, photos, audio, onBack, uploadedVideos, selectedVideoIds: initialSelectedVideoIds }: VideoGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Estado local para la configuración de video
  const [selectedLogoId, setSelectedLogoId] = useState<number | null>(null);
  const [logoPosition, setLogoPosition] = useState<string>("top-right");
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [titleText, setTitleText] = useState<string>("");
  const [titleFontSize, setTitleFontSize] = useState<number>(32);
  const [titleColor, setTitleColor] = useState<string>("#ffffff");
  const [titlePosition, setTitlePosition] = useState<string>("bottom-center");
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState<string>("");
  
  // Estado para la funcionalidad de video subido
  const [useUploadedVideo, setUseUploadedVideo] = useState<boolean>(false);
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>(initialSelectedVideoIds || []);
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  // Si hay videos seleccionados, activar el modo de video subido
  useEffect(() => {
    if (selectedVideoIds && selectedVideoIds.length > 0) {
      setUseUploadedVideo(true);
    }
  }, [selectedVideoIds]);
  
  // Estado para la música de fondo
  const [useBackgroundMusic, setUseBackgroundMusic] = useState<boolean>(false);
  const [selectedBackgroundMusicId, setSelectedBackgroundMusicId] = useState<number | null>(null);
  const [backgroundMusicVolume, setBackgroundMusicVolume] = useState<number>(0.2);
  const [uploadingMusic, setUploadingMusic] = useState<boolean>(false);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicName, setMusicName] = useState<string>("");
  
  // Referencias a los inputs de archivos
  const videoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  
  // Obtener la configuración actual
  const settingsQuery = useQuery({
    queryKey: ['/api/app-settings']
  });
  
  // Obtener los logos disponibles
  const logosQuery = useQuery({
    queryKey: ['/api/logos'],
    retry: 3,
    retryDelay: 1000,
  });
  
  // Obtener los videos subidos por el usuario para este proyecto
  const uploadedVideosQuery = useQuery({
    queryKey: [`/api/projects/${projectId}/uploaded-videos`],
    retry: 3,
    retryDelay: 1000,
    enabled: useUploadedVideo, // Solo cargar cuando se active la opción
  });
  
  // Obtener la música de fondo disponible
  const backgroundMusicQuery = useQuery({
    queryKey: ['/api/background-music'],
    retry: 3,
    retryDelay: 1000,
    enabled: useBackgroundMusic, // Solo cargar cuando se active la opción
  });
  
  // Efecto para actualizar el estado local cuando se carga la configuración
  useEffect(() => {
    if (settingsQuery.data) {
      const settings = settingsQuery.data as AppSettings;
      setSelectedLogoId(settings.selectedLogoId ?? null);
      setLogoPosition(settings.logoPosition ?? "top-right");
      setShowTitle(settings.showTitle ?? true);
      setTitleText(settings.titleText ?? "");
      setTitleFontSize(settings.titleFontSize ?? 32);
      setTitleColor(settings.titleColor ?? "#ffffff");
      setTitlePosition(settings.titlePosition ?? "bottom-center");
    }
  }, [settingsQuery.data]);

  // Elegir el primer logo disponible si no hay uno seleccionado
  useEffect(() => {
    if (logosQuery.data && Array.isArray(logosQuery.data) && logosQuery.data.length > 0 && !selectedLogoId) {
      const firstLogo = logosQuery.data[0] as Logo;
      setSelectedLogoId(firstLogo.id);
    }
  }, [logosQuery.data, selectedLogoId]);
  
  // Actualizar configuración
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AppSettings>) => {
      return apiRequest("PATCH", "/api/app-settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/app-settings'] });
      toast({
        title: "Configuración guardada",
        description: "Los ajustes de video han sido actualizados correctamente."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar configuración",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Guardar configuración
  const saveSettings = () => {
    updateSettingsMutation.mutate({
      selectedLogoId,
      logoPosition,
      showTitle,
      titleText,
      titleFontSize,
      titleColor,
      titlePosition,
      updatedAt: new Date().toISOString()
    });
  };
  
  // Mutación para subir un video
  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("projectId", projectId);
      
      return fetch("/api/uploaded-videos", {
        method: "POST",
        body: formData
      }).then(res => {
        if (!res.ok) throw new Error("Error al subir el video");
        return res.json();
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/uploaded-videos`] });
      setUploadedVideo(data);
      toast({
        title: "Video subido",
        description: "El video se ha subido correctamente"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir el video",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutación para subir música de fondo
  const uploadMusicMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("music", file);
      formData.append("name", file.name);
      
      return fetch("/api/background-music", {
        method: "POST",
        body: formData
      }).then(res => {
        if (!res.ok) throw new Error("Error al subir la música");
        return res.json();
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/background-music'] });
      setSelectedBackgroundMusicId(data.id);
      toast({
        title: "Música subida",
        description: "La música de fondo se ha subido correctamente"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al subir la música",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Generate video mutation
  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      // Primero guardar la configuración
      await saveSettings();
      
      setIsGenerating(true);
      
      // Construir el payload según si estamos usando fotos o videos subidos
      const payload: any = {
        audioId: audio.id,
        projectId
      };
      
      // Agregar fotos o videos subidos
      if (useUploadedVideo) {
        if (selectedVideoIds.length > 0) {
          // Si hay múltiples videos seleccionados, enviamos el array
          payload.uploadedVideoIds = selectedVideoIds;
        } else if (uploadedVideo) {
          // Compatibilidad con la versión anterior (un solo video)
          payload.uploadedVideoId = uploadedVideo.id;
        }
      } else {
        // Usar fotos
        payload.photoIds = photos.map(photo => photo.id.toString());
      }
      
      // Agregar música de fondo si está habilitada
      if (useBackgroundMusic && selectedBackgroundMusicId) {
        payload.backgroundMusicId = selectedBackgroundMusicId;
        payload.backgroundMusicVolume = backgroundMusicVolume;
      }
      
      return apiRequest("POST", "/api/videos", payload);
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
  
  // Calculate time per photo
  const timePerPhoto = audio.duration ? Math.round(audio.duration / photos.length) : 0;

  // Posiciones disponibles para el logo
  const logoPositions = [
    { value: "top-right", label: "Superior Derecha", icon: <CornerRightUp size={16} /> },
    { value: "top-left", label: "Superior Izquierda", icon: <CornerLeftUp size={16} /> },
    { value: "bottom-right", label: "Inferior Derecha", icon: <CornerRightDown size={16} /> },
    { value: "bottom-left", label: "Inferior Izquierda", icon: <CornerLeftDown size={16} /> }
  ];
  
  // Colores predefinidos para el texto
  const colors = [
    "#ffffff", // blanco
    "#000000", // negro
    "#ff0000", // rojo
    "#00ff00", // verde
    "#0000ff", // azul
    "#ffff00", // amarillo
    "#ff00ff", // magenta
    "#00ffff"  // cian
  ];

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

  return (
    <div>
      {/* Video Summary */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mostrar fotos o video subido según corresponda */}
          <div className={`bg-gray-50 p-4 rounded-lg ${useUploadedVideo ? 'border border-blue-200' : photos.length === 0 ? 'border border-amber-200' : ''}`}>
            {useUploadedVideo ? (
              <>
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <FileVideo className="w-4 h-4 mr-1 text-blue-500" />
                  {selectedVideoIds.length > 1 ? "Videos Seleccionados" : "Video Subido"}
                </h3>
                <div className="text-gray-700">
                  {selectedVideoIds.length > 0 ? (
                    <>
                      <p className="mb-1"><span className="font-medium">{selectedVideoIds.length}</span> videos seleccionados</p>
                      {uploadedVideo && (
                        <>
                          <p className="mb-1">Resolución: {uploadedVideo.width}×{uploadedVideo.height}</p>
                          <p>Duración combinada: {formatDuration(uploadedVideo.duration || 0)}+ </p>
                        </>
                      )}
                    </>
                  ) : uploadedVideo ? (
                    <>
                      <p className="mb-1"><span className="font-medium">{uploadedVideo.filename}</span></p>
                      <p className="mb-1">Resolución: {uploadedVideo.width}×{uploadedVideo.height}</p>
                      <p>Duración: {formatDuration(uploadedVideo.duration || 0)}</p>
                    </>
                  ) : (
                    <p className="text-blue-500">Selecciona o sube un video</p>
                  )}
                </div>
              </>
            ) : photos.length === 0 ? (
              <>
                <h3 className="font-medium text-amber-800 mb-2 flex items-center">
                  <FileVideo className="w-4 h-4 mr-1 text-amber-600" />
                  Sube un Video
                </h3>
                <div className="text-amber-700">
                  <p className="mb-1">No hay fotos subidas, usa un video en su lugar.</p>
                  <p>El audio generado se combinará con tu video.</p>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <Film className="w-4 h-4 mr-1" />
                  Fotos
                </h3>
                <div className="text-gray-700">
                  <p className="mb-1"><span className="font-medium">{photos.length}</span> fotos subidas</p>
                  {photos.length > 0 && (
                    <>
                      <p className="mb-1">Formato: {photos[0]?.width}×{photos[0]?.height}</p>
                      <p>Cada foto: ~{timePerPhoto} segundos</p>
                    </>
                  )}
                </div>
              </>
            )}
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
          
          <div className={`bg-gray-50 p-4 rounded-lg ${useBackgroundMusic ? 'border border-blue-200' : ''}`}>
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Film className="w-4 h-4 mr-1" />
              Video de Salida
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">MP4</span> formato</p>
              <p className="mb-1">Resolución: 1280×720</p>
              <p className="mb-1">Duración: ~{formatDuration(audio.duration || 0)}</p>
              {useBackgroundMusic && selectedBackgroundMusicId && (
                <p className="text-blue-500">Con música de fondo</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Configuración de Video Integrada */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Settings className="mr-2" size={20} />
          Configuración de Video
        </h2>
        
        {/* Selección de Logo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Image className="mr-2" size={18} />
            Logo
          </h3>
          
          {logosQuery.isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ) : logosQuery.data && Array.isArray(logosQuery.data) && logosQuery.data.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(logosQuery.data as Logo[]).map((logo: Logo) => (
                <button
                  key={logo.id}
                  className={`p-2 border rounded-md flex flex-col items-center ${
                    selectedLogoId === logo.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                  }`}
                  onClick={() => setSelectedLogoId(logo.id)}
                >
                  <img 
                    src={`/api/logos/${logo.id}/file`} 
                    alt={logo.name} 
                    className="h-8 object-contain mb-1"
                  />
                  <div className="text-sm flex items-center">
                    {selectedLogoId === logo.id && <Check size={12} className="text-blue-500 mr-1" />}
                    {logo.name}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 border border-dashed border-gray-300 rounded-md mb-3">
              <p className="text-gray-500 mb-2">No hay logos cargados. Sube un logo para usar en tus videos.</p>
              
              {/* Formulario de subida simplificado */}
              <div className="flex gap-2 mt-2">
                <input
                  type="file"
                  id="logo-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFile(file);
                      setLogoName(file.name);
                      
                      // Auto-subir
                      const formData = new FormData();
                      formData.append('logo', file);
                      formData.append('name', file.name);
                      
                      setUploadingLogo(true);
                      fetch('/api/logos', {
                        method: 'POST',
                        body: formData
                      })
                      .then(response => {
                        if (!response.ok) {
                          throw new Error('Error al subir el logo');
                        }
                        return response.json();
                      })
                      .then(data => {
                        queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
                        setSelectedLogoId(data.id);
                        
                        toast({
                          title: "Logo cargado",
                          description: "El logo se ha cargado correctamente"
                        });
                        
                        setLogoFile(null);
                        setLogoName("");
                      })
                      .catch(error => {
                        toast({
                          title: "Error al cargar",
                          description: error.message,
                          variant: "destructive"
                        });
                      })
                      .finally(() => {
                        setUploadingLogo(false);
                      });
                    }
                  }}
                />
                <label 
                  htmlFor="logo-upload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-flex items-center"
                >
                  <Upload size={16} className="mr-2" />
                  {uploadingLogo ? 'Subiendo...' : 'Seleccionar logo'}
                </label>
              </div>
            </div>
          )}
          
          <div className="mt-2">
            <p className="text-sm font-medium mb-2">Posición del Logo:</p>
            <div className="grid grid-cols-4 gap-2">
              {logoPositions.map((pos) => (
                <button
                  key={pos.value}
                  className={`p-2 border flex items-center justify-center ${
                    logoPosition === pos.value 
                      ? 'border-blue-500 bg-blue-50 text-blue-600' 
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  } rounded-md text-sm`}
                  onClick={() => setLogoPosition(pos.value)}
                >
                  {pos.icon}
                  <span className="ml-1">{pos.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Opción de subir video */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center">
              <FileVideo className="mr-2" size={18} />
              Video personalizado
            </h3>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="use-uploaded-video" 
                checked={useUploadedVideo} 
                onChange={(e) => setUseUploadedVideo(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="use-uploaded-video" className="ml-2 text-sm text-gray-700">
                Usar video en lugar de fotos
              </label>
            </div>
          </div>
          
          {useUploadedVideo && (
            <div className="mt-3 p-4 bg-gray-50 rounded-md">
              {uploadedVideo ? (
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Video className="mr-2 text-blue-500" size={18} />
                      <span className="font-medium">{uploadedVideo.filename}</span>
                    </div>
                    <button
                      onClick={() => setUploadedVideo(null)}
                      className="text-red-500 hover:text-red-600"
                      title="Eliminar video"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Duración: {formatDuration(uploadedVideo.duration || 0)}</p>
                    <p>Tamaño: {formatFileSize(uploadedVideo.size)}</p>
                    <p>Resolución: {uploadedVideo.width}×{uploadedVideo.height}</p>
                  </div>
                </div>
              ) : uploadingVideo ? (
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="animate-pulse flex flex-col items-center">
                    <Video className="text-blue-500 mb-2" size={32} />
                    <p className="text-sm text-gray-600">Subiendo video...</p>
                  </div>
                </div>
              ) : uploadedVideosQuery.isLoading ? (
                <div className="animate-pulse space-y-2 p-4">
                  <div className="h-10 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : uploadedVideosQuery.data && Array.isArray(uploadedVideosQuery.data) && uploadedVideosQuery.data.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-2">Selecciona los videos que quieres incluir:</p>
                  {uploadedVideosQuery.data && Array.isArray(uploadedVideosQuery.data) && (uploadedVideosQuery.data as UploadedVideo[]).map((video: UploadedVideo) => (
                    <button
                      key={video.id}
                      className={`p-2 border rounded-md w-full text-left flex justify-between items-center ${
                        selectedVideoIds.includes(video.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                      onClick={() => {
                        // Toggle video selection
                        if (selectedVideoIds.includes(video.id)) {
                          setSelectedVideoIds(selectedVideoIds.filter(id => id !== video.id));
                        } else {
                          setSelectedVideoIds([...selectedVideoIds, video.id]);
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <Video className="mr-2 text-blue-500" size={16} />
                        <div>
                          <p className="font-medium">{video.filename}</p>
                          <p className="text-xs text-gray-500">
                            {formatDuration(video.duration || 0)} • {formatFileSize(video.size)}
                          </p>
                        </div>
                      </div>
                      {selectedVideoIds.includes(video.id) && (
                        <Check className="text-blue-500" size={18} />
                      )}
                    </button>
                  ))}
                  
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">O sube un nuevo video:</p>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        id="video-upload"
                        className="hidden"
                        accept="video/mp4,video/quicktime,video/webm"
                        ref={videoInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setVideoFile(file);
                            setUploadingVideo(true);
                            uploadVideoMutation.mutate(file);
                            // Reset input value
                            if (videoInputRef.current) {
                              videoInputRef.current.value = '';
                            }
                          }
                        }}
                      />
                      <label 
                        htmlFor="video-upload"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-flex items-center"
                      >
                        <Upload size={16} className="mr-2" />
                        Seleccionar video
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-gray-300 rounded-md">
                  <p className="text-gray-500 mb-2">No hay videos subidos. Sube un video para usar en lugar de las fotos.</p>
                  
                  <div className="flex gap-2 mt-2">
                    <input
                      type="file"
                      id="video-upload"
                      className="hidden"
                      accept="video/mp4,video/quicktime,video/webm"
                      ref={videoInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setVideoFile(file);
                          setUploadingVideo(true);
                          uploadVideoMutation.mutate(file);
                          // Reset input value
                          if (videoInputRef.current) {
                            videoInputRef.current.value = '';
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="video-upload"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-flex items-center"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingVideo ? 'Subiendo...' : 'Seleccionar video'}
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Música de fondo */}
        <div className="mb-6 border-t-2 border-b-2 border-blue-100 py-4 mt-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold flex items-center text-blue-700">
              <Music className="mr-2" size={20} />
              Música de fondo
            </h3>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="use-background-music" 
                checked={useBackgroundMusic} 
                onChange={(e) => setUseBackgroundMusic(e.target.checked)}
                className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="use-background-music" className="ml-2 text-sm font-medium text-gray-700">
                Añadir música de fondo
              </label>
            </div>
          </div>
          
          {useBackgroundMusic && (
            <div className="mt-3 p-4 bg-gray-50 rounded-md">
              {backgroundMusicQuery.isLoading ? (
                <div className="animate-pulse space-y-2 p-4">
                  <div className="h-10 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : backgroundMusicQuery.data && Array.isArray(backgroundMusicQuery.data) && backgroundMusicQuery.data.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-2">Selecciona una música de fondo:</p>
                  {backgroundMusicQuery.data && Array.isArray(backgroundMusicQuery.data) && (backgroundMusicQuery.data as BackgroundMusic[]).map((music: BackgroundMusic) => (
                    <button
                      key={music.id}
                      className={`p-2 border rounded-md w-full text-left flex justify-between items-center ${
                        selectedBackgroundMusicId === music.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                      onClick={() => setSelectedBackgroundMusicId(music.id)}
                    >
                      <div className="flex items-center">
                        <Disc className="mr-2 text-blue-500" size={16} />
                        <div>
                          <p className="font-medium">{music.name}</p>
                          <p className="text-xs text-gray-500">
                            Duración: {formatDuration(music.duration || 0)}
                          </p>
                        </div>
                      </div>
                      {selectedBackgroundMusicId === music.id && (
                        <Check className="text-blue-500" size={18} />
                      )}
                    </button>
                  ))}
                  
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">O sube un nuevo archivo de música:</p>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        id="music-upload"
                        className="hidden"
                        accept="audio/mpeg,audio/wav,audio/mp3"
                        ref={musicInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setMusicFile(file);
                            setMusicName(file.name);
                            setUploadingMusic(true);
                            uploadMusicMutation.mutate(file);
                            // Reset input value
                            if (musicInputRef.current) {
                              musicInputRef.current.value = '';
                            }
                          }
                        }}
                      />
                      <label 
                        htmlFor="music-upload"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-flex items-center"
                      >
                        <Upload size={16} className="mr-2" />
                        {uploadingMusic ? 'Subiendo...' : 'Seleccionar música'}
                      </label>
                    </div>
                  </div>
                  
                  {selectedBackgroundMusicId && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600 mb-2">Volumen de la música de fondo:</p>
                      <div className="flex items-center">
                        <Volume2 className="text-gray-500 mr-2" size={16} />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={backgroundMusicVolume}
                          onChange={(e) => setBackgroundMusicVolume(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          {Math.round(backgroundMusicVolume * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-gray-300 rounded-md">
                  <p className="text-gray-500 mb-2">No hay música de fondo disponible. Sube un archivo de audio para usar como música de fondo.</p>
                  
                  <div className="flex gap-2 mt-2">
                    <input
                      type="file"
                      id="music-upload"
                      className="hidden"
                      accept="audio/mpeg,audio/wav,audio/mp3"
                      ref={musicInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setMusicFile(file);
                          setMusicName(file.name);
                          setUploadingMusic(true);
                          uploadMusicMutation.mutate(file);
                          // Reset input value
                          if (musicInputRef.current) {
                            musicInputRef.current.value = '';
                          }
                        }
                      }}
                    />
                    <label 
                      htmlFor="music-upload"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer inline-flex items-center"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingMusic ? 'Subiendo...' : 'Seleccionar música'}
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Configuración de Título */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold flex items-center">
              <Type className="mr-2" size={18} />
              Título sobre imágenes
            </h3>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="show-title" 
                checked={showTitle} 
                onChange={(e) => setShowTitle(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="show-title" className="ml-2 text-sm text-gray-700">
                Mostrar título
              </label>
            </div>
          </div>
          
          {showTitle && (
            <>
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Texto del título:</p>
                <div className="mb-1 flex justify-between items-center">
                  <div className="text-xs text-gray-600">
                    <span className="inline-block bg-blue-100 text-blue-800 font-semibold px-1 py-0.5 rounded">Tip:</span> Escribe <span className="font-mono bg-gray-100 px-1 rounded">[nl]</span> para insertar saltos de línea
                  </div>
                  <span className="text-xs text-gray-600">{titleText.length}/100 caracteres</span>
                </div>
                <textarea
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Escribe el texto que aparecerá sobre la imagen..."
                  maxLength={100}
                  rows={3}
                />
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-1">Vista previa:</p>
                  <div className="p-3 bg-gray-100 rounded border border-gray-300">
                    <p className="whitespace-pre-line">{titleText.replace(/\[nl\]/g, '\n')}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Tamaño de fuente:</p>
                <select 
                  value={titleFontSize}
                  onChange={(e) => setTitleFontSize(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value={24}>24px</option>
                  <option value={28}>28px</option>
                  <option value={32}>32px</option>
                  <option value={36}>36px</option>
                  <option value={40}>40px</option>
                  <option value={48}>48px</option>
                </select>
              </div>
              
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Color del texto:</p>
                <div className="grid grid-cols-8 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-full h-8 rounded-md border-2 ${
                        titleColor === color ? 'border-blue-500' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTitleColor(color)}
                      title={color}
                    >
                      {titleColor === color && (
                        <Check 
                          size={16} 
                          className={`mx-auto ${
                            ['#ffffff', '#00ff00', '#ffff00', '#00ffff'].includes(color) 
                              ? 'text-black' 
                              : 'text-white'
                          }`} 
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Información de persistencia */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700 flex items-center">
            <Save className="mr-2" size={16} />
            El logo y título se guardarán automáticamente al generar el video.
          </p>
        </div>
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
        <p className="text-sm text-gray-500 mt-2">Esto combinará tus fotos y audio en un video con los ajustes seleccionados</p>
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
