import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Photo, Audio, UploadedVideo, AppSettings, Logo, SavedLogo } from '@shared/schema';
import { 
  Image, Film, Settings, Upload, Check, Save, Info,
  ImagePlus, FileVideo, Loader2, Trash2, Music, Volume2 
} from 'lucide-react';
import { SavedLogos } from './SavedLogos';
import { LogoManager } from './LogoManager';
import { formatDuration } from '@/lib/utils';

interface VideoSettingsProps {
  projectId: string;
  photos: Photo[];
  audio: Audio;
  onBack: () => void;
  onContinue: () => void;
  uploadedVideos?: UploadedVideo[];
  selectedVideoIds?: number[];
  onVideoSelectionChange?: (ids: number[]) => void;
}

export default function VideoSettings({ 
  projectId, 
  photos, 
  audio, 
  onBack, 
  onContinue, 
  uploadedVideos,
  selectedVideoIds: initialSelectedVideoIds,
  onVideoSelectionChange
}: VideoSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado local para la configuración de video
  const [selectedLogoId, setSelectedLogoId] = useState<number | null>(null);
  const [logoPosition, setLogoPosition] = useState<string>("top-right");
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [titleText, setTitleText] = useState<string>("");
  const [titleFontSize, setTitleFontSize] = useState<number>(24);
  const [titleColor, setTitleColor] = useState<string>("#ffffff");
  const [titlePosition, setTitlePosition] = useState<string>("bottom-center");
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState<string>("");
  
  // Estado para la funcionalidad de video subido
  const [useUploadedVideo, setUseUploadedVideo] = useState<boolean>(false);
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>(initialSelectedVideoIds || []);
  
  // Efecto para notificar cambios en los videos seleccionados
  useEffect(() => {
    if (onVideoSelectionChange) {
      onVideoSelectionChange(selectedVideoIds);
    }
  }, [selectedVideoIds, onVideoSelectionChange]);
  
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
      setTitleFontSize(settings.titleFontSize ?? 24);
      setTitleColor(settings.titleColor ?? "#ffffff");
      setTitlePosition(settings.titlePosition ?? "bottom-center");
    }
  }, [settingsQuery.data]);
  
  // Efecto para poner por defecto el último video subido
  useEffect(() => {
    if (uploadedVideosQuery.data && Array.isArray(uploadedVideosQuery.data) && uploadedVideosQuery.data.length > 0) {
      // Usar el último video subido
      const latestVideo = uploadedVideosQuery.data[uploadedVideosQuery.data.length - 1];
      setUploadedVideo(latestVideo);
    }
  }, [uploadedVideosQuery.data]);
  
  // Mutación para actualizar la configuración de la aplicación
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<AppSettings>) => {
      return apiRequest("PATCH", "/api/app-settings", settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/app-settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar la configuración",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Guardar la configuración actual
  const saveSettings = async () => {
    await updateSettingsMutation.mutateAsync({
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
  
  // Subir un nuevo logo
  const uploadLogoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Usar fetch directamente para depurar mejor el error
      const res = await fetch("/api/logos", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al subir el logo");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
      setSelectedLogoId(data.id);
      setUploadingLogo(false);
      setLogoFile(null);
      setLogoName("");
      toast({
        title: "Logo subido",
        description: "Tu logo ha sido subido correctamente"
      });
      
      // Actualizar la configuración con el nuevo logo
      updateSettingsMutation.mutate({
        selectedLogoId: data.id,
        updatedAt: new Date().toISOString()
      });
    },
    onError: (error: Error) => {
      setUploadingLogo(false);
      toast({
        title: "Error al subir el logo",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Subir un nuevo video
  const uploadVideoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("POST", "/api/uploaded-videos", formData, {
        isFormData: true
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/uploaded-videos`] });
      setUploadedVideo(data);
      setUploadingVideo(false);
      setVideoFile(null);
      toast({
        title: "Video subido",
        description: "Tu video ha sido subido correctamente"
      });
    },
    onError: (error: Error) => {
      setUploadingVideo(false);
      toast({
        title: "Error al subir el video",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Subir música de fondo
  const uploadMusicMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("POST", "/api/background-music", formData, {
        isFormData: true
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/background-music'] });
      setSelectedBackgroundMusicId(data.id);
      setUploadingMusic(false);
      setMusicFile(null);
      setMusicName("");
      toast({
        title: "Música de fondo subida",
        description: "Tu música de fondo ha sido subida correctamente"
      });
    },
    onError: (error: Error) => {
      setUploadingMusic(false);
      toast({
        title: "Error al subir la música",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Manejadores de eventos para subir logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setLogoFile(file);
      setLogoName(file.name);
      
      // Subir automáticamente cuando se selecciona un archivo
      const formData = new FormData();
      formData.append('logo', file); // Nombre correcto que espera el backend
      formData.append('name', file.name);
      
      setUploadingLogo(true);
      uploadLogoMutation.mutate(formData);
    }
  };
  
  const uploadLogo = () => {
    if (!logoFile) return;
    
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', logoFile); // Nombre correcto que espera el backend
    formData.append('name', logoName || logoFile.name);
    
    uploadLogoMutation.mutate(formData);
  };
  
  // Manejadores para subir video
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setVideoFile(file);
      
      // Subir automáticamente
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      
      setUploadingVideo(true);
      uploadVideoMutation.mutate(formData);
    }
  };
  
  // Manejadores para subir música
  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setMusicFile(file);
      setMusicName(file.name);
    }
  };
  
  const uploadMusic = () => {
    if (!musicFile) return;
    
    setUploadingMusic(true);
    const formData = new FormData();
    formData.append('file', musicFile);
    formData.append('name', musicName || musicFile.name);
    
    uploadMusicMutation.mutate(formData);
  };
  
  // Colores disponibles para el título
  const colors = [
    "#ffffff",  // blanco
    "#000000",  // negro
    "#ff0000",  // rojo
    "#00ff00",  // verde
    "#0000ff",  // azul
    "#ffff00",  // amarillo
    "#ff00ff",  // magenta
    "#00ffff"   // cian
  ];
  
  // Guardar la configuración y continuar
  const handleContinue = async () => {
    await saveSettings();
    onContinue();
  };

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
                  Video Subido
                </h3>
                <div className="text-gray-700">
                  {uploadedVideo ? (
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
                  <p className="mb-1">No hay fotos disponibles.</p>
                  <p>Sube un video en su lugar.</p>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <Image className="w-4 h-4 mr-1" />
                  Fotos Subidas
                </h3>
                <div className="text-gray-700">
                  <p className="mb-1"><span className="font-medium">{photos.length}</span> fotos</p>
                  {photos.length > 0 && (
                    <>
                      <p className="mb-1">Resolución: {photos[0].width}×{photos[0].height}</p>
                      <p className="text-green-600">Listas para usar</p>
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
              <p className="mb-1"><span className="font-medium">{audio.filename}</span></p>
              <p className="mb-1">Duración: {formatDuration(audio.duration || 0)}</p>
              <p className="text-green-600">Listo para usar</p>
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
        
        {/* Tipo de contenido */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Tipo de Contenido</h3>
          
          <div className="flex space-x-4">
            <button 
              onClick={() => setUseUploadedVideo(false)}
              className={`px-4 py-2 rounded-lg flex items-center ${
                !useUploadedVideo 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <Image className="w-4 h-4 mr-1" />
              Fotos ({photos.length})
            </button>
            
            <button 
              onClick={() => setUseUploadedVideo(true)}
              className={`px-4 py-2 rounded-lg flex items-center ${
                useUploadedVideo 
                  ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              <FileVideo className="w-4 h-4 mr-1" />
              Video Subido
            </button>
          </div>
          
          {/* Uploader para video */}
          {useUploadedVideo && (
            <div className="mt-3">
              {uploadedVideosQuery.data && Array.isArray(uploadedVideosQuery.data) && uploadedVideosQuery.data.length > 0 ? (
                <div className="border border-gray-200 rounded-lg p-3 mt-2">
                  <div className="text-sm font-medium mb-2">Videos Disponibles:</div>
                  <p className="text-xs text-gray-600 mb-3">
                    Selecciona uno o más videos para usar en tu proyecto. Videos múltiples serán combinados.
                  </p>
                  <div className="flex flex-col space-y-2">
                    {uploadedVideosQuery.data.map((video: UploadedVideo) => (
                      <div
                        key={video.id}
                        className={`text-left p-2 rounded-md flex items-center ${
                          selectedVideoIds.includes(video.id) 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-shrink-0 mr-2">
                          <input 
                            type="checkbox" 
                            checked={selectedVideoIds.includes(video.id)}
                            onChange={() => {
                              // Toggle selection
                              if (selectedVideoIds.includes(video.id)) {
                                setSelectedVideoIds(selectedVideoIds.filter(id => id !== video.id));
                              } else {
                                setSelectedVideoIds([...selectedVideoIds, video.id]);
                              }
                              
                              // Also set this as the primary video for backward compatibility
                              setUploadedVideo(video);
                            }}
                            className="w-4 h-4 accent-blue-600"
                          />
                        </div>
                        <FileVideo className={`w-4 h-4 mr-2 ${
                          selectedVideoIds.includes(video.id) ? 'text-blue-500' : 'text-gray-500'
                        }`} />
                        <div className="flex-1">
                          <div className="font-medium truncate w-60">{video.filename}</div>
                          <div className="text-xs text-gray-500">
                            {formatDuration(video.duration || 0)} • {video.width}×{video.height}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-gray-600">
                      {selectedVideoIds.length} {selectedVideoIds.length === 1 ? 'video seleccionado' : 'videos seleccionados'}
                    </span>
                    {selectedVideoIds.length > 0 && (
                      <button 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setSelectedVideoIds([])}
                      >
                        Limpiar selección
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
              
              <div className="mt-2">
                <button
                  className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={uploadingVideo}
                >
                  {uploadingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1" />
                      Subir nuevo video
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={videoInputRef}
                  className="hidden"
                  accept="video/*"
                  onChange={handleVideoUpload}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Música de fondo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Music className="mr-2" size={18} />
            Música de Fondo
          </h3>
          
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="useBackgroundMusic"
              checked={useBackgroundMusic}
              onChange={(e) => setUseBackgroundMusic(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="useBackgroundMusic" className="text-sm font-medium">
              Agregar música de fondo al video
            </label>
          </div>
          
          {useBackgroundMusic && (
            <div className="border border-gray-200 rounded-lg p-3">
              {backgroundMusicQuery.isLoading ? (
                <div className="text-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                </div>
              ) : backgroundMusicQuery.data && Array.isArray(backgroundMusicQuery.data) && backgroundMusicQuery.data.length > 0 ? (
                <div>
                  <div className="text-sm font-medium mb-2">Música disponible:</div>
                  <div className="flex flex-col space-y-2">
                    {backgroundMusicQuery.data.map((music: any) => (
                      <button
                        key={music.id}
                        className={`text-left p-2 rounded-md flex items-center ${
                          selectedBackgroundMusicId === music.id 
                            ? 'bg-blue-50 border border-blue-200' 
                            : 'border border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedBackgroundMusicId(music.id)}
                      >
                        <Music className={`w-4 h-4 mr-2 ${
                          selectedBackgroundMusicId === music.id ? 'text-blue-500' : 'text-gray-500'
                        }`} />
                        <div className="flex-1">
                          <div className="font-medium">{music.name}</div>
                        </div>
                        {selectedBackgroundMusicId === music.id && (
                          <Check className="w-4 h-4 text-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-sm">
                  No hay música disponible. Sube un archivo de audio.
                </div>
              )}
              
              {musicFile ? (
                <div className="mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Music className="w-4 h-4 text-blue-500 mr-2" />
                      <span className="text-sm font-medium">{musicFile.name}</span>
                    </div>
                    <button 
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setMusicFile(null)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      className="w-full py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      onClick={uploadMusic}
                      disabled={uploadingMusic}
                    >
                      {uploadingMusic ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : 'Subir Música'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                    onClick={() => musicInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Subir archivo de música
                  </button>
                  <input
                    type="file"
                    ref={musicInputRef}
                    className="hidden"
                    accept="audio/*"
                    onChange={handleMusicUpload}
                  />
                </div>
              )}
              
              {selectedBackgroundMusicId && (
                <div className="mt-3">
                  <label className="flex items-center text-sm font-medium mb-1">
                    <Volume2 className="w-4 h-4 mr-1" />
                    Volumen de música: {Math.round(backgroundMusicVolume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={backgroundMusicVolume}
                    onChange={(e) => setBackgroundMusicVolume(parseFloat(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Selección de Logo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <Image className="mr-2" size={18} />
            Logo
          </h3>
          
          {logosQuery.isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-16 bg-gray-200 rounded-md w-full"></div>
            </div>
          ) : (
            <>
              <div className="logo-management-section">
                {/* Usamos el nuevo componente LogoManager que incluye la opción de eliminar */}
                <LogoManager 
                  onSelectLogo={(logoId) => setSelectedLogoId(logoId)}
                  selectedLogoId={selectedLogoId}
                  showUploader={true}
                />
              </div>
              
              {selectedLogoId && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">
                    Posición del logo:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      className={`p-2 border rounded-md ${logoPosition === 'top-left' ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
                      onClick={() => setLogoPosition('top-left')}
                    >
                      <div className="w-full aspect-video bg-gray-100 rounded-sm flex items-start justify-start p-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      </div>
                      <div className="text-xs mt-1">Superior izquierda</div>
                    </button>
                    <button
                      className={`p-2 border rounded-md ${logoPosition === 'top-center' ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
                      onClick={() => setLogoPosition('top-center')}
                    >
                      <div className="w-full aspect-video bg-gray-100 rounded-sm flex items-start justify-center p-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      </div>
                      <div className="text-xs mt-1">Superior centro</div>
                    </button>
                    <button
                      className={`p-2 border rounded-md ${logoPosition === 'top-right' ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
                      onClick={() => setLogoPosition('top-right')}
                    >
                      <div className="w-full aspect-video bg-gray-100 rounded-sm flex items-start justify-end p-1">
                        <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      </div>
                      <div className="text-xs mt-1">Superior derecha</div>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Título y texto */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center">
            <span className="mr-2">📝</span>
            Título en el Video
          </h3>
          
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="showTitle"
              checked={showTitle}
              onChange={(e) => setShowTitle(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="showTitle" className="text-sm font-medium">
              Mostrar texto en el video
            </label>
          </div>
          
          {showTitle && (
            <>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Texto a mostrar:
                </label>
                <textarea
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  rows={3}
                  placeholder="Escribe el texto que aparecerá en el video..."
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <Info className="w-3 h-3 mr-1" />
                  Presiona Enter para agregar saltos de línea. Máximo 60 caracteres por línea.
                </p>
              </div>
              
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">
                  Posición del título:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className={`p-2 border rounded-md ${titlePosition === 'bottom-center' ? 'bg-blue-100 border-blue-300' : 'border-gray-300'}`}
                    onClick={() => setTitlePosition('bottom-center')}
                  >
                    <div className="w-full aspect-video bg-gray-100 rounded-sm flex items-end justify-center p-1">
                      <div className="w-8 h-2 bg-blue-500 rounded-sm"></div>
                    </div>
                    <div className="text-xs mt-1">Inferior</div>
                  </button>
                </div>
              </div>
              
              <div className="mb-3">
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
            La configuración se guardará automáticamente al continuar.
          </p>
        </div>
      </div>
      
      {/* Buttons - Back & Continue */}
      <div className="flex justify-between items-center">
        <button 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
          onClick={onBack}
        >
          <span className="mr-1">←</span>
          Atrás
        </button>
        
        <button 
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
          onClick={handleContinue}
        >
          Continuar
          <span className="ml-1">→</span>
        </button>
      </div>
    </div>
  );
}