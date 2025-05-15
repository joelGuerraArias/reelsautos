import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@shared/schema';
import { Trash2, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface LogoManagerProps {
  onSelectLogo?: (logoId: number) => void;
  selectedLogoId?: number | null;
}

export function LogoManager({ onSelectLogo, selectedLogoId }: LogoManagerProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState<string>("");

  // Obtener logos existentes
  const { data: logos = [], isLoading } = useQuery<Logo[]>({
    queryKey: ['/api/logos'],
    refetchOnWindowFocus: false
  });

  // Mutation para subir un nuevo logo
  const uploadLogoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest("POST", "/api/logos", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
      setLogoFile(null);
      setLogoName("");
      toast({
        title: "Logo subido correctamente",
        description: "El logo ha sido guardado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error al subir el logo",
        description: error.message || "Hubo un problema al subir el logo. Intente nuevamente.",
      });
    }
  });

  // Obtener los logos guardados como favoritos
  const { data: savedLogos = [] } = useQuery<any[]>({
    queryKey: ['/api/saved-logos'],
    refetchOnWindowFocus: false
  });

  // Obtener la configuración de la aplicación
  const { data: appSettings } = useQuery<any>({
    queryKey: ['/api/app-settings'],
    refetchOnWindowFocus: false
  });

  // Mutation para eliminar un logo
  const deleteLogoMutation = useMutation({
    mutationFn: async (logoId: number) => {
      return await apiRequest("DELETE", `/api/logos/${logoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/logos'] });
      toast({
        title: "Logo eliminado",
        description: "El logo ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error al eliminar el logo",
        description: error.response?.data?.error || 
          "No se puede eliminar este logo porque está en uso. Por favor seleccione otro logo en la configuración primero.",
      });
    }
  });
  
  // Comprobar si un logo está en uso (en configuración o como favorito)
  const isLogoInUse = (logoId: number): boolean => {
    // Comprobar si está seleccionado en las configuraciones de la app
    if (appSettings?.selectedLogoId === logoId) {
      return true;
    }
    
    // Comprobar si está guardado como favorito
    return savedLogos.some((savedLogo: any) => savedLogo.logoId === logoId);
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !logoName.trim()) {
      toast({
        variant: "destructive",
        title: "Error al subir el logo",
        description: "Por favor seleccione un archivo y proporcione un nombre.",
      });
      return;
    }

    setUploadingLogo(true);
    
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      formData.append('name', logoName);
      
      await uploadLogoMutation.mutateAsync(formData);
      setOpen(false);
    } catch (error) {
      console.error("Error uploading logo:", error);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async (logoId: number) => {
    // Verificar si el logo está en uso antes de intentar eliminarlo
    if (isLogoInUse(logoId)) {
      toast({
        variant: "destructive",
        title: "No se puede eliminar este logo",
        description: "Este logo está en uso en la configuración de la aplicación o guardado como favorito. Por favor, seleccione otro logo primero."
      });
      return;
    }
    
    // Si no está en uso, confirmar eliminación
    if (confirm("¿Está seguro que desea eliminar este logo?")) {
      try {
        await deleteLogoMutation.mutateAsync(logoId);
      } catch (error) {
        console.error("Error deleting logo:", error);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      // Auto-populate name from filename if empty
      if (!logoName.trim()) {
        const fileName = file.name.split('.')[0]; // Remove extension
        setLogoName(fileName);
      }
    }
  };

  return (
    <div className="mt-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <ImagePlus size={16} />
            <span>Gestionar Logos</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gestionar Logos</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="logoName">Nombre del Logo</Label>
              <Input
                id="logoName"
                placeholder="Ingrese un nombre para el logo"
                value={logoName}
                onChange={(e) => setLogoName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logoFile">Archivo de Logo</Label>
              <Input
                id="logoFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <p className="text-xs text-gray-500">
                Recomendado: Imagen transparente (PNG) de máximo 64px de alto
              </p>
            </div>
            
            <Button 
              onClick={handleLogoUpload} 
              disabled={!logoFile || !logoName.trim() || uploadingLogo}
              className="w-full"
            >
              {uploadingLogo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Subir Logo"
              )}
            </Button>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Logos Disponibles</h4>
              
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : logos && logos.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {logos.map((logo: Logo) => (
                    <div 
                      key={logo.id} 
                      className={`relative border rounded-md p-2 text-center cursor-pointer ${
                        selectedLogoId === logo.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => onSelectLogo && onSelectLogo(logo.id)}
                    >
                      <img 
                        src={logo.filepath} 
                        alt={logo.name}
                        className="h-16 mx-auto object-contain"
                      />
                      <p className="text-xs mt-1 truncate">{logo.name}</p>
                      
                      {isLogoInUse(logo.id) ? (
                        <div 
                          className="absolute -top-2 -right-2 h-7 w-7 flex items-center justify-center bg-amber-100 text-amber-700 border border-amber-300 rounded-full cursor-help"
                          title="Este logo está en uso y no puede ser eliminado. Seleccione otro logo primero."
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                          </svg>
                        </div>
                      ) : (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita que se seleccione el logo al hacer clic en eliminar
                            handleDeleteLogo(logo.id);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay logos disponibles
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}