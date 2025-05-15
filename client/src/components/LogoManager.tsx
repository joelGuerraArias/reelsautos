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

export function LogoManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoName, setLogoName] = useState<string>("");

  // Obtener logos existentes
  const { data: logos, isLoading } = useQuery({
    queryKey: ['/api/logos'],
    refetchOnWindowFocus: false
  });

  // Mutation para subir un nuevo logo
  const uploadLogoMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest('/api/logos', {
        method: 'POST',
        body: formData,
      });
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

  // Mutation para eliminar un logo
  const deleteLogoMutation = useMutation({
    mutationFn: async (logoId: number) => {
      return await apiRequest(`/api/logos/${logoId}`, {
        method: 'DELETE',
      });
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
                    <div key={logo.id} className="relative border rounded-md p-2 text-center">
                      <img 
                        src={logo.filepath} 
                        alt={logo.name}
                        className="h-16 mx-auto object-contain"
                      />
                      <p className="text-xs mt-1 truncate">{logo.name}</p>
                      
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-7 w-7"
                        onClick={() => handleDeleteLogo(logo.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
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