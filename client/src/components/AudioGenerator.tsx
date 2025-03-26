import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, ElevenLabsVoice, SavedVoice } from "@shared/schema";
import { Info, Music, Star, Plus, Check } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface VoicesResponse {
  voices: ElevenLabsVoice[];
}

interface FavoriteVoiceResponse {
  favoriteVoiceId: string;
  voiceName: string;
}

interface AudioGeneratorProps {
  projectId: string;
  photos: Photo[];
  onBack: () => void;
}

export default function AudioGenerator({ projectId, photos, onBack }: AudioGeneratorProps) {
  const { toast } = useToast();
  const [scriptText, setScriptText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFavoritePosition, setSelectedFavoritePosition] = useState<number | null>(null);
  const [favoriteVoices, setFavoriteVoices] = useState<SavedVoice[]>([]);
  
  // Fetch available voices from Eleven Labs API
  const voicesQuery = useQuery<VoicesResponse>({
    queryKey: ['/api/voices'],
  });
  
  // Fetch saved voices
  const savedVoicesQuery = useQuery({
    queryKey: ['/api/saved-voices'],
  });
  
  // Effect to handle saved voices data
  useEffect(() => {
    if (savedVoicesQuery.data) {
      const data = savedVoicesQuery.data as SavedVoice[];
      setFavoriteVoices(data);
      
      // Si no hay una voz seleccionada, seleccionar la voz por defecto
      if (!selectedVoice && data.length > 0) {
        const defaultVoice = data.find(voice => voice.isDefault);
        if (defaultVoice) {
          setSelectedVoice(defaultVoice.voiceId);
        }
      }
    }
  }, [savedVoicesQuery.data, selectedVoice]);

  // Guardar voz como favorita
  const saveSavedVoiceMutation = useMutation({
    mutationFn: async (voiceData: { voiceId: string, voiceName: string, displayName: string, position: number, isDefault: boolean }) => {
      return apiRequest("POST", "/api/saved-voices", voiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-voices'] });
      toast({
        title: "Voz favorita guardada",
        description: "Tu voz preferida ha sido guardada para uso futuro"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo guardar la voz favorita",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Seguimos incluyendo la consulta legacy para compatibilidad
  const favoriteVoiceQuery = useQuery({
    queryKey: ['/api/preferences/favorite-voice'],
    retry: false,
    enabled: favoriteVoices.length === 0 // Solo ejecutar si no tenemos voces guardadas
  });

  // Efecto para manejar la respuesta de la API legacy
  useEffect(() => {
    if (favoriteVoiceQuery.data && favoriteVoices.length === 0 && !favoriteVoiceQuery.isLoading) {
      const data = favoriteVoiceQuery.data as FavoriteVoiceResponse;
      if (data.favoriteVoiceId) {
        // Si no hay voces guardadas pero existe una voz legacy, usarla
        if (!selectedVoice) {
          setSelectedVoice(data.favoriteVoiceId);
        }
        
        // Y guardarla como una voz favorita en la nueva API
        saveSavedVoiceMutation.mutate({
          voiceId: data.favoriteVoiceId,
          voiceName: data.voiceName,
          displayName: data.voiceName,
          position: 0,
          isDefault: true
        });
      }
    }
  }, [favoriteVoiceQuery.data, favoriteVoiceQuery.isLoading, favoriteVoices.length, selectedVoice, saveSavedVoiceMutation]);
  
  // Generate audio mutation
  const generateAudioMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      return apiRequest("POST", "/api/audios", {
        text: scriptText,
        voice: selectedVoice,
        projectId
      });
    },
    onSuccess: () => {
      setIsGenerating(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/audio`] });
      toast({
        title: "Audio generado",
        description: "Tu texto ha sido convertido a voz correctamente"
      });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast({
        title: "Error de generación",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleScriptTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScriptText(e.target.value);
  };
  
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(e.target.value);
  };
  
  const generateAudio = () => {
    if (!scriptText) {
      toast({
        title: "Script vacío",
        description: "Por favor, ingresa un texto para generar el audio",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedVoice) {
      toast({
        title: "No hay voz seleccionada",
        description: "Por favor, selecciona una voz para la generación de audio",
        variant: "destructive"
      });
      return;
    }
    
    generateAudioMutation.mutate();
  };
  
  // Usar una voz desde la lista de favoritos
  const handleUseFavoriteVoice = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };
  
  // Actualizar voz favorita
  const updateSavedVoiceMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number, voiceId?: string, voiceName?: string, displayName?: string, position?: number, isDefault?: boolean }) => {
      return apiRequest("PATCH", `/api/saved-voices/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-voices'] });
      toast({
        title: "Voz favorita actualizada",
        description: "Tu voz preferida ha sido actualizada correctamente"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "No se pudo actualizar la voz favorita",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Guardar la voz seleccionada como favorita en una posición específica
  const handleSaveFavorite = (position: number) => {
    if (!selectedVoice) return;
    
    setSelectedFavoritePosition(position);
    
    const selectedVoiceData = voicesQuery.data?.voices?.find(
      (voice: ElevenLabsVoice) => voice.voice_id === selectedVoice
    );
    
    if (selectedVoiceData) {
      // Comprobar si ya existe una voz en esta posición
      const existingVoice = favoriteVoices.find(v => v.position === position);
      
      if (existingVoice) {
        // Actualizar la voz existente
        updateSavedVoiceMutation.mutate({
          id: existingVoice.id,
          voiceId: selectedVoiceData.voice_id,
          voiceName: selectedVoiceData.name,
          position: position,
          isDefault: favoriteVoices.length === 0 || position === 0, // La primera voz o la posición 0 es la predeterminada
        });
      } else {
        // Crear una nueva voz favorita
        saveSavedVoiceMutation.mutate({
          voiceId: selectedVoiceData.voice_id,
          voiceName: selectedVoiceData.name,
          displayName: selectedVoiceData.name,
          position: position,
          isDefault: favoriteVoices.length === 0 || position === 0, // La primera voz o la posición 0 es la predeterminada
        });
      }
    }
  };
  
  // Set the first voice as default when the list loads and no saved voices
  useEffect(() => {
    if (voicesQuery.data?.voices && voicesQuery.data.voices.length > 0 && !selectedVoice && favoriteVoices.length === 0) {
      setSelectedVoice(voicesQuery.data.voices[0].voice_id);
    }
  }, [voicesQuery.data, selectedVoice, favoriteVoices]);
  
  // If audio is being generated, show loading state
  if (isGenerating) {
    return (
      <div className="bg-white p-6 rounded-lg text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-blue-100 w-24 h-24 flex items-center justify-center mb-4">
            <Music className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">Generando Audio...</h3>
          <p className="text-gray-600 mb-4">Convirtiendo tu texto a voz usando Eleven Labs API</p>
          <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-sm text-gray-500">Esto puede tomar un momento</p>
        </div>
      </div>
    );
  }
  
  // Encontrar qué voz de las guardadas coincide con la seleccionada
  const isSelectedVoiceFavorite = favoriteVoices.some(voice => voice.voiceId === selectedVoice);
  const favoritePositionOfSelectedVoice = favoriteVoices.find(voice => voice.voiceId === selectedVoice)?.position;
  
  return (
    <div className="mb-6">
      {/* Voces favoritas guardadas */}
      {favoriteVoices.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Voces Favoritas</h3>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2].map((position) => {
              const voiceAtPosition = favoriteVoices.find(v => v.position === position);
              
              if (voiceAtPosition) {
                return (
                  <button 
                    key={position}
                    className={`px-3 py-2 rounded-lg border flex items-center gap-1 ${
                      selectedVoice === voiceAtPosition.voiceId 
                        ? 'bg-amber-100 border-amber-400 text-amber-800' 
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => handleUseFavoriteVoice(voiceAtPosition.voiceId)}
                  >
                    <Star className={`h-4 w-4 ${voiceAtPosition.isDefault ? 'fill-amber-500 text-amber-500' : ''}`} />
                    <span>{voiceAtPosition.displayName || voiceAtPosition.voiceName}</span>
                    {selectedVoice === voiceAtPosition.voiceId && (
                      <Check className="h-4 w-4 ml-1 text-green-600" />
                    )}
                  </button>
                );
              } else {
                return (
                  <button 
                    key={position}
                    className="px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center gap-1"
                    onClick={() => selectedVoice && handleSaveFavorite(position)}
                    disabled={!selectedVoice || saveSavedVoiceMutation.isPending}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Espacio {position + 1}</span>
                  </button>
                );
              }
            })}
          </div>
        </div>
      )}
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700">Seleccionar Voz</label>
          {isSelectedVoiceFavorite && (
            <div className="flex items-center text-xs text-amber-600">
              <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
              <span>Voz favorita {favoritePositionOfSelectedVoice !== undefined ? `#${favoritePositionOfSelectedVoice + 1}` : ''}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <select 
            id="voice-select" 
            className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            onChange={handleVoiceChange}
            value={selectedVoice}
            disabled={voicesQuery.isLoading}
          >
            {voicesQuery.isLoading ? (
              <option value="">Cargando voces...</option>
            ) : (
              <>
                <option value="">Selecciona una voz</option>
                {voicesQuery.data?.voices?.map((voice: ElevenLabsVoice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name} ({voice.category})
                  </option>
                ))}
              </>
            )}
          </select>
          
          {/* Mostrar botones para guardar como favorito en diferentes posiciones */}
          <div className="flex gap-1">
            {[0, 1, 2].map((position) => (
              <button
                key={position}
                type="button"
                disabled={!selectedVoice || saveSavedVoiceMutation.isPending}
                onClick={() => handleSaveFavorite(position)}
                className={`flex items-center px-2 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${selectedFavoritePosition === position ? 
                    'bg-green-100 text-green-700 border border-green-300' : 
                    'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300'}`}
                title={`Guardar como favorito #${position + 1}`}
              >
                <Star className="h-4 w-4" />
                <span className="ml-1">{position + 1}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Selecciona una voz y guárdala como favorita en una de las 3 posiciones para acceso rápido.
        </p>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="script-text" className="block text-sm font-medium text-gray-700">Texto del guion</label>
          <span className="text-xs text-gray-500">{scriptText.length}</span><span className="text-xs text-gray-500">/5000</span>
        </div>
        <textarea 
          id="script-text" 
          rows={8} 
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-700"
          placeholder="Introduce el texto que quieres convertir a voz..."
          maxLength={5000}
          value={scriptText}
          onChange={handleScriptTextChange}
        ></textarea>
        <p className="text-xs text-gray-500 mt-1">Este texto será convertido a audio usando Eleven Labs API.</p>
      </div>
      
      {photos.length > 0 ? (
        <div className="bg-yellow-50 p-4 rounded-lg mb-4">
          <div className="flex">
            <Info className="text-yellow-600 mt-1 mr-2" />
            <div>
              <h4 className="font-medium text-yellow-800">Consejos de duración</h4>
              <p className="text-sm text-yellow-700">
                Con {photos.length} {photos.length === 1 ? 'foto subida' : 'fotos subidas'}, intenta crear un texto que genere ~60 segundos de audio para resultados óptimos 
                (cada foto se mostrará durante ~{photos.length > 0 ? Math.round(60 / photos.length) : 0} segundos).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 p-4 rounded-lg mb-4 border border-amber-200">
          <div className="flex">
            <Info className="text-amber-600 mt-1 mr-2" />
            <div>
              <h4 className="font-medium text-amber-800">Sin fotos subidas</h4>
              <p className="text-sm text-amber-700">
                No has subido fotos. Podrás subir un video directamente en la siguiente pantalla. Por ahora, crea el audio para tu video.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <button 
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center"
          onClick={onBack}
        >
          <span className="mr-1">←</span>
          Atrás
        </button>
        
        <button 
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
          onClick={generateAudio}
          disabled={!scriptText || !selectedVoice || generateAudioMutation.isPending}
        >
          <Music className="w-4 h-4 mr-1" />
          Generar Audio
        </button>
      </div>
    </div>
  );
}