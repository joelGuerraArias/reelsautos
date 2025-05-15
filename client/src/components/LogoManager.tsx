import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SavedLogos } from "./SavedLogos";
import { Logo } from "@shared/schema";
import { 
  Image, 
  Upload, 
  Trash, 
  Plus,
  Loader2,
  AlertCircle 
} from "lucide-react";

interface LogoManagerProps {
  onSelectLogo: (logoId: number) => void;
  selectedLogoId?: number;
  showUploader?: boolean;
}

export function LogoManager({ 
  onSelectLogo, 
  selectedLogoId,
  showUploader = true 
}: LogoManagerProps) {
  const { toast } = useToast();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState<number | null>(null);

  // Cargar todos los logos disponibles
  const logosQuery = useQuery<Logo[]>({
    queryKey: ['/api/logos'],
    initialData: [],
  });

  // Eliminar un logo
  const deleteLogoMutation = useMutation({
    mutationFn: async (logoId: number) => {
      return apiRequest("DELETE", `/api/logos/${logoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/saved-logos'] });
      
      toast({
        title: "Logo eliminado",
        description: "El logo ha sido eliminado correctamente"
      });
      
      setShowConfirmDelete(null);
      
      // Si el logo eliminado era el seleccionado, deseleccionarlo
      if (selectedLogoId === showConfirmDelete) {
        onSelectLogo(0); // Deseleccionar (0 o cualquier valor que indique "sin logo")
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar logo",
        description: error.message,
        variant: "destructive"
      });
      setShowConfirmDelete(null);
    }
  });

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("logo", logoFile);
    formData.append("name", logoName || logoFile.name);
    
    try {
      const response = await fetch("/api/logos", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error al subir el logo");
      }
      
      // Actualizar la lista de logos
      queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
      
      toast({
        title: "Logo subido correctamente",
        description: "Tu logo ha sido añadido a la biblioteca"
      });
      
      // Seleccionar el nuevo logo
      onSelectLogo(data.id);
      
      // Limpiar el formulario
      setLogoFile(null);
      setLogoName("");
    } catch (error) {
      toast({
        title: "Error al subir el logo",
        description: error instanceof Error ? error.message : "Ha ocurrido un error desconocido",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = (logoId: number) => {
    setShowConfirmDelete(logoId);
  };

  const confirmDeleteLogo = () => {
    if (showConfirmDelete) {
      deleteLogoMutation.mutate(showConfirmDelete);
    }
  };

  return (
    <div className="logo-manager space-y-4">
      {/* Logos favoritos */}
      <SavedLogos 
        onSelectLogo={onSelectLogo}
        selectedLogoId={selectedLogoId}
      />
      
      {/* Todos los logos disponibles */}
      {logosQuery.isLoading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-gray-200 rounded-md w-full"></div>
        </div>
      ) : (
        <>
          {logosQuery.data && Array.isArray(logosQuery.data) && logosQuery.data.length > 0 ? (
            <div className="border border-gray-200 rounded-lg p-3 mt-4">
              <div className="text-sm font-medium mb-2 flex justify-between items-center">
                <span>Todos los logos:</span>
                <span className="text-xs text-gray-500">
                  ({logosQuery.data.length} logos disponibles)
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {logosQuery.data.map((logo: Logo) => (
                  <div key={logo.id} className="relative group">
                    <button
                      className={`p-2 rounded-md border w-full ${
                        selectedLogoId === logo.id 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => onSelectLogo(logo.id)}
                    >
                      <div className="aspect-square w-full flex items-center justify-center bg-gray-100 rounded-md mb-1 overflow-hidden">
                        <img 
                          src={`/api/logos/${logo.id}/file`}
                          alt={logo.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="text-xs font-medium truncate">
                        {logo.name}
                      </div>
                    </button>
                    
                    {/* Botón de eliminar (aparece al hacer hover) */}
                    <button
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLogo(logo.id);
                      }}
                      title="Eliminar logo"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              No hay logos disponibles. Sube uno nuevo.
            </div>
          )}
        </>
      )}
      
      {/* Uploader de logos */}
      {showUploader && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Añadir nuevo logo:</div>
          
          {logoFile ? (
            <div className="p-2 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Image className="w-4 h-4 text-blue-500 mr-2" />
                  <span className="text-sm font-medium">{logoFile.name}</span>
                </div>
                <button 
                  onClick={() => setLogoFile(null)}
                  className="text-gray-500 hover:text-red-500"
                >
                  <Trash size={16} />
                </button>
              </div>
              
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Nombre del logo (opcional)"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                />
              </div>
              
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleLogoUpload}
                  disabled={uploading}
                  className="flex items-center bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-1" />
                      Subir Logo
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 hover:bg-gray-50 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setLogoFile(file);
                }}
              />
              <div className="text-center">
                <Plus className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                <div className="text-sm font-medium text-gray-700">Click para añadir logo</div>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF, SVG (max. 2MB)</p>
              </div>
            </label>
          )}
        </div>
      )}
      
      {/* Modal de confirmación para eliminar logo */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-md w-11/12 shadow-lg">
            <h3 className="text-lg font-bold text-red-600 mb-2">¿Eliminar logo?</h3>
            <p className="text-gray-700 mb-4">
              Esta acción no se puede deshacer. Si este logo está asignado a algún proyecto o guardado como favorito, podría afectar esos proyectos.
            </p>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteLogo}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                disabled={deleteLogoMutation.isPending}
              >
                {deleteLogoMutation.isPending ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Eliminando...
                  </span>
                ) : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}