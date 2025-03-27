import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Logo, SavedLogo } from "@shared/schema";
import { Star, Plus, Check, Image } from "lucide-react";

interface SavedLogosProps {
  onSelectLogo: (logoId: number) => void;
  selectedLogoId?: number;
}

export function SavedLogos({ onSelectLogo, selectedLogoId }: SavedLogosProps) {
  const { toast } = useToast();
  const [selectedFavoritePosition, setSelectedFavoritePosition] = useState<number | null>(null);

  // Cargar todos los logos disponibles
  const logosQuery = useQuery<Logo[]>({
    queryKey: ['/api/logos'],
    initialData: [],
  });

  // Cargar logos guardados
  const savedLogosQuery = useQuery<SavedLogo[]>({
    queryKey: ['/api/saved-logos'],
    initialData: [],
  });

  // Guardar logo como favorito
  const saveSavedLogoMutation = useMutation({
    mutationFn: async (logoData: { logoId: number, name: string, position: number, isDefault: boolean }) => {
      return apiRequest("POST", "/api/saved-logos", logoData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-logos'] });
      toast({
        title: "Logo favorito guardado",
        description: "Tu logo preferido ha sido guardado para uso futuro"
      });
      setSelectedFavoritePosition(null);
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo guardar el logo favorito",
        description: error.message,
        variant: "destructive"
      });
      setSelectedFavoritePosition(null);
    }
  });

  // Actualizar logo guardado
  const updateSavedLogoMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number, logoId?: number, name?: string, position?: number, isDefault?: boolean }) => {
      return apiRequest("PATCH", `/api/saved-logos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-logos'] });
      toast({
        title: "Logo favorito actualizado",
        description: "Tu logo preferido ha sido actualizado"
      });
      setSelectedFavoritePosition(null);
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo actualizar el logo favorito",
        description: error.message,
        variant: "destructive"
      });
      setSelectedFavoritePosition(null);
    }
  });

  const favoriteLogos = savedLogosQuery.data || [];
  
  // Guardar el logo seleccionado como favorito en una posición específica
  const handleSaveFavorite = (position: number) => {
    if (!selectedLogoId) return;
    
    setSelectedFavoritePosition(position);
    
    const selectedLogoData = logosQuery.data?.find(
      (logo: Logo) => logo.id === selectedLogoId
    );
    
    if (selectedLogoData) {
      // Comprobar si ya existe un logo en esta posición
      const existingLogo = favoriteLogos.find((l: SavedLogo) => l.position === position);
      
      if (existingLogo) {
        // Actualizar el logo existente
        updateSavedLogoMutation.mutate({
          id: existingLogo.id,
          logoId: selectedLogoData.id,
          name: selectedLogoData.name,
          position: position,
          isDefault: favoriteLogos.length === 0 || position === 0, // El primero o posición 0 es default
        });
      } else {
        // Crear un nuevo logo favorito
        saveSavedLogoMutation.mutate({
          logoId: selectedLogoData.id,
          name: selectedLogoData.name,
          position: position,
          isDefault: favoriteLogos.length === 0 || position === 0, // El primero o posición 0 es default
        });
      }
    }
  };

  // Usar un logo favorito guardado
  const handleUseFavoriteLogo = (logoId: number) => {
    onSelectLogo(logoId);
  };

  // Verificar si el logo seleccionado es favorito
  const isSelectedLogoFavorite = favoriteLogos.some(
    (logo: SavedLogo) => logo.logoId === selectedLogoId
  );
  
  // Obtener la posición del logo favorito seleccionado
  const favoritePositionOfSelectedLogo = favoriteLogos.find(
    (logo: SavedLogo) => logo.logoId === selectedLogoId
  )?.position;

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Logos Favoritos</h3>
      {/* Mostrar logos favoritos */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[0, 1, 2].map((position) => {
          const logoAtPosition = favoriteLogos.find((l: SavedLogo) => l.position === position);
          
          if (logoAtPosition) {
            // Mostrar logo guardado
            return (
              <button 
                key={position}
                className={`px-3 py-2 rounded-lg border flex items-center gap-1 ${
                  selectedLogoId === logoAtPosition.logoId 
                    ? 'bg-amber-100 border-amber-400 text-amber-800' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => handleUseFavoriteLogo(logoAtPosition.logoId)}
              >
                <div className="relative">
                  <img 
                    src={`/api/logos/${logoAtPosition.logoId}/file`} 
                    alt={logoAtPosition.name} 
                    className="h-6 w-6 object-contain"
                  />
                  {logoAtPosition.isDefault && (
                    <Star className="h-3 w-3 absolute -top-1 -right-1 fill-amber-500 text-amber-500" />
                  )}
                </div>
                <span>{logoAtPosition.name}</span>
                {selectedLogoId === logoAtPosition.logoId && (
                  <Check className="h-4 w-4 ml-1 text-green-600" />
                )}
              </button>
            );
          } else {
            // Mostrar espacio vacío para guardar un logo
            return (
              <button 
                key={position}
                className="px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center gap-1"
                onClick={() => selectedLogoId && handleSaveFavorite(position)}
                disabled={!selectedLogoId || saveSavedLogoMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                <span>Logo {position + 1}</span>
              </button>
            );
          }
        })}
      </div>
      
      {/* Espacio adicional para botones rápidos de guardar */}
      {selectedLogoId && !isSelectedLogoFavorite && (
        <div className="flex gap-1 mt-2">
          <span className="text-xs text-gray-500 flex items-center">
            <Image className="h-3 w-3 mr-1" />
            Guardar logo actual como favorito:
          </span>
          {[0, 1, 2].map((position) => (
            <button
              key={position}
              type="button"
              disabled={saveSavedLogoMutation.isPending}
              onClick={() => handleSaveFavorite(position)}
              className={`flex items-center px-2 py-1 text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${selectedFavoritePosition === position ? 
                  'bg-green-100 text-green-700 border border-green-300' : 
                  'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300'}`}
              title={`Guardar como favorito #${position + 1}`}
            >
              <Star className="h-3 w-3 mr-1" />
              <span>{position + 1}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}