import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppSettings, Logo } from "@shared/schema";
import { SavedLogos } from "./SavedLogos";
import { 
  Image, 
  Type, 
  Check, 
  AlertCircle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  CornerRightUp,
  CornerLeftUp,
  CornerLeftDown,
  CornerRightDown,
  Upload,
  Trash2,
  Save
} from "lucide-react";

interface VideoSettingsProps {
  onClose: () => void;
}

export default function VideoSettings({ onClose }: VideoSettingsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado local
  const [selectedLogoId, setSelectedLogoId] = useState<number | null>(null);
  const [logoPosition, setLogoPosition] = useState<string>("top-right");
  const [showTitle, setShowTitle] = useState<boolean>(true);
  const [titleText, setTitleText] = useState<string>("");
  const [titleFontSize, setTitleFontSize] = useState<number>(32);
  const [titleColor, setTitleColor] = useState<string>("#ffffff");
  const [titlePosition, setTitlePosition] = useState<string>("top-center");
  const [isSaving, setIsSaving] = useState<boolean>(false);
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
    // Importante: Si no hay logos disponibles, esta consulta se configurará para reintentarlo automáticamente
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
      setTitlePosition(settings.titlePosition ?? "top-center");
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
      setIsSaving(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive"
      });
      setIsSaving(false);
    }
  });
  
  // Guardar configuración
  const handleSave = () => {
    setIsSaving(true);
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
  
  // Posiciones disponibles para el logo
  const logoPositions = [
    { value: "top-right", label: "Superior Derecha", icon: <CornerRightUp size={16} /> },
    { value: "top-left", label: "Superior Izquierda", icon: <CornerLeftUp size={16} /> },
    { value: "bottom-right", label: "Inferior Derecha", icon: <CornerRightDown size={16} /> },
    { value: "bottom-left", label: "Inferior Izquierda", icon: <CornerLeftDown size={16} /> }
  ];
  
  // Posiciones disponibles para el título
  const titlePositions = [
    { value: "top-center", label: "Superior", icon: <AlignCenter size={16} /> },
    { value: "bottom-center", label: "Inferior", icon: <AlignCenter size={16} /> },
    { value: "center-center", label: "Centro", icon: <AlignCenter size={16} /> }
  ];
  
  // Tamaños de fuente disponibles
  const fontSizes = [24, 28, 32, 36, 40, 48];
  
  // Colores predefinidos
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
  
  // Estado de carga
  if (settingsQuery.isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Cargando configuración...</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }
  
  // Componente principal
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Configuración de Video</h2>
        <button 
          className="text-gray-500 hover:text-gray-700"
          onClick={onClose}
          disabled={isSaving}
        >
          <span className="sr-only">Cerrar</span>
          &times;
        </button>
      </div>
      
      {/* Selección de Logo */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2 flex items-center">
          <Image className="mr-2" size={18} />
          Logo
        </h3>
        
        {/* Logos Favoritos */}
        {logosQuery.data && Array.isArray(logosQuery.data) && logosQuery.data.length > 0 && (
          <>
            <SavedLogos 
              onSelectLogo={(logoId) => setSelectedLogoId(logoId)} 
              selectedLogoId={selectedLogoId || undefined} 
            />
          </>
        )}
        
        {logosQuery.isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-20 bg-gray-200 rounded"></div>
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
          </div>
        )}
        
        {/* Formulario de subida de logo */}
        <div className="mt-4 border-t pt-4">
          <h4 className="text-md font-medium mb-2">Subir nuevo logo</h4>
          <div className="flex gap-2">
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
                }
              }}
            />
            <div className="flex-1">
              <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                <input
                  type="text"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                  placeholder="Nombre del logo"
                  className="flex-1 p-2 focus:outline-none"
                />
                <label 
                  htmlFor="logo-upload"
                  className="bg-gray-100 p-2 cursor-pointer hover:bg-gray-200"
                >
                  <Upload size={16} />
                </label>
              </div>
            </div>
            <button
              className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={!logoFile || uploadingLogo}
              onClick={() => {
                if (logoFile) {
                  setUploadingLogo(true);
                  
                  // Crear FormData para la carga
                  const formData = new FormData();
                  formData.append('logo', logoFile);
                  formData.append('name', logoName || logoFile.name);
                  
                  // Enviar la solicitud
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
                    // Actualizar después de cargar
                    queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
                    setSelectedLogoId(data.id);
                    
                    toast({
                      title: "Logo cargado",
                      description: "El logo se ha cargado correctamente"
                    });
                    
                    // Resetear estados
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
            >
              {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
            </button>
          </div>
        </div>
        
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
              <textarea
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Escribe el texto que aparecerá sobre la imagen. Pulsa Enter para crear saltos de línea."
                maxLength={100}
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Presiona Enter para crear un salto de línea. Cada línea aparecerá en una línea separada en el video.
              </p>
            </div>
            
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Posición del Título:</p>
              <div className="grid grid-cols-3 gap-2">
                {titlePositions.map((pos) => (
                  <button
                    key={pos.value}
                    className={`p-2 border flex items-center justify-center ${
                      titlePosition === pos.value 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    } rounded-md text-sm`}
                    onClick={() => setTitlePosition(pos.value)}
                  >
                    {pos.icon}
                    <span className="ml-1">{pos.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-3">
              <p className="text-sm font-medium mb-2">Tamaño de fuente:</p>
              <div className="grid grid-cols-6 gap-2">
                {fontSizes.map((size) => (
                  <button
                    key={size}
                    className={`p-2 border ${
                      titleFontSize === size 
                        ? 'border-blue-500 bg-blue-50 text-blue-600' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    } rounded-md text-sm`}
                    onClick={() => setTitleFontSize(size)}
                  >
                    {size}px
                  </button>
                ))}
              </div>
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
      
      {/* Información adicional sobre persistencia de logo */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-md font-medium mb-1 text-blue-800 flex items-center">
          <Save className="mr-2" size={16} />
          Información Importante
        </h4>
        <p className="text-sm text-blue-700">
          El logo seleccionado quedará guardado y se usará automáticamente en todos los videos futuros.
          No necesitarás volver a subirlo para cada video.
        </p>
      </div>

      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500 flex items-center">
          <AlertCircle size={14} className="mr-1" />
          Los cambios se aplicarán a los nuevos videos generados
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}