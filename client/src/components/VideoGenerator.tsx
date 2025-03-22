import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, Audio, AppSettings, Logo } from "@shared/schema";
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
  Upload
} from "lucide-react";
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
  
  // Generate video mutation
  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      // Primero guardar la configuración
      await saveSettings();
      
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
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Film className="w-4 h-4 mr-1" />
              Fotos
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">{photos.length}</span> fotos subidas</p>
              <p className="mb-1">Formato: {photos[0]?.width}×{photos[0]?.height}</p>
              <p>Cada foto: ~{timePerPhoto} segundos</p>
            </div>
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
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <Film className="w-4 h-4 mr-1" />
              Video de Salida
            </h3>
            <div className="text-gray-700">
              <p className="mb-1"><span className="font-medium">MP4</span> formato</p>
              <p className="mb-1">Resolución: 1280×720</p>
              <p>Duración: ~{formatDuration(audio.duration || 0)}</p>
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
                <input
                  type="text"
                  value={titleText}
                  onChange={(e) => setTitleText(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Escribe el texto que aparecerá sobre la imagen..."
                  maxLength={100}
                />
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
