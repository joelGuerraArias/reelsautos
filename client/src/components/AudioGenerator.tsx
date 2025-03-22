import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Photo, ElevenLabsVoice } from "@shared/schema";
import { Info, Music, Heart, Star } from "lucide-react";
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
  const [favoriteVoice, setFavoriteVoice] = useState<{ id: string, name: string } | null>(null);
  
  // Fetch available voices from Eleven Labs API
  const voicesQuery = useQuery<VoicesResponse>({
    queryKey: ['/api/voices'],
  });
  
  // Fetch favorite voice
  const favoriteVoiceQuery = useQuery<FavoriteVoiceResponse>({
    queryKey: ['/api/preferences/favorite-voice'],
    retry: false, // Don't retry on 404
    // Use callbacks
    onSuccess(data) {
      if (data && data.favoriteVoiceId) {
        setFavoriteVoice({
          id: data.favoriteVoiceId,
          name: data.voiceName
        });
        
        // If no voice selected and favorite voice exists, use it
        if (!selectedVoice) {
          setSelectedVoice(data.favoriteVoiceId);
        }
      }
    },
    // Don't show error for missing favorite voice
    onError() {}
  });
  
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
        title: "Audio generated",
        description: "Your text has been converted to speech"
      });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast({
        title: "Generation failed",
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
        title: "Empty script",
        description: "Please enter some text for audio generation",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedVoice) {
      toast({
        title: "No voice selected",
        description: "Please select a voice for audio generation",
        variant: "destructive"
      });
      return;
    }
    
    generateAudioMutation.mutate();
  };
  
  // Save favorite voice mutation
  const saveFavoriteVoiceMutation = useMutation({
    mutationFn: async (voiceData: { favoriteVoiceId: string, voiceName: string }) => {
      return apiRequest("POST", "/api/preferences/favorite-voice", voiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/preferences/favorite-voice'] });
      toast({
        title: "Favorite voice saved",
        description: "Your preferred voice has been saved for future use"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not save favorite",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleSaveFavorite = () => {
    if (!selectedVoice) return;
    
    const selectedVoiceData = voicesQuery.data?.voices?.find(
      (voice: ElevenLabsVoice) => voice.voice_id === selectedVoice
    );
    
    if (selectedVoiceData) {
      saveFavoriteVoiceMutation.mutate({
        favoriteVoiceId: selectedVoiceData.voice_id,
        voiceName: selectedVoiceData.name
      });
    }
  };
  
  // Set the first voice as default when the list loads
  useEffect(() => {
    if (voicesQuery.data?.voices && voicesQuery.data.voices.length > 0 && !selectedVoice) {
      setSelectedVoice(voicesQuery.data.voices[0].voice_id);
    }
  }, [voicesQuery.data, selectedVoice]);
  
  // If audio is being generated, show loading state
  if (isGenerating) {
    return (
      <div className="bg-white p-6 rounded-lg text-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="rounded-full bg-blue-100 w-24 h-24 flex items-center justify-center mb-4">
            <Music className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-medium text-gray-800 mb-2">Generating Audio...</h3>
          <p className="text-gray-600 mb-4">Converting your text to speech using Eleven Labs API</p>
          <div className="w-full max-w-md h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-sm text-gray-500">This may take a few moments</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700">Select Voice</label>
          {favoriteVoice && favoriteVoice.id === selectedVoice && (
            <div className="flex items-center text-xs text-amber-600">
              <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
              <span>Favorite voice</span>
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
              <option value="">Loading voices...</option>
            ) : (
              <>
                <option value="">Select a voice</option>
                {voicesQuery.data?.voices?.map((voice: ElevenLabsVoice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name} ({voice.description})
                  </option>
                ))}
              </>
            )}
          </select>
          <button
            type="button"
            disabled={!selectedVoice || saveFavoriteVoiceMutation.isPending}
            onClick={handleSaveFavorite}
            className="flex items-center px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save as favorite voice"
          >
            <Heart className={`h-4 w-4 mr-1 ${favoriteVoice && favoriteVoice.id === selectedVoice ? 'fill-amber-500' : ''}`} />
            <span>Save</span>
          </button>
        </div>
        {favoriteVoice && favoriteVoice.id !== selectedVoice && (
          <p className="text-xs text-gray-500 mt-1">You have a favorite voice saved. Select it from the dropdown or set a new favorite.</p>
        )}
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="script-text" className="block text-sm font-medium text-gray-700">Script Text</label>
          <span className="text-xs text-gray-500">{scriptText.length}</span><span className="text-xs text-gray-500">/5000</span>
        </div>
        <textarea 
          id="script-text" 
          rows={8} 
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-700"
          placeholder="Enter the text you want to convert to speech..."
          maxLength={5000}
          value={scriptText}
          onChange={handleScriptTextChange}
        ></textarea>
        <p className="text-xs text-gray-500 mt-1">This text will be converted to audio using Eleven Labs API.</p>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-lg mb-4">
        <div className="flex">
          <Info className="text-yellow-600 mt-1 mr-2" />
          <div>
            <h4 className="font-medium text-yellow-800">Audio Duration Tips</h4>
            <p className="text-sm text-yellow-700">
              With {photos.length} uploaded photos, aim for text that creates ~60 seconds of audio for optimal results 
              (each photo will display for ~{photos.length > 0 ? Math.round(60 / photos.length) : 0} seconds).
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <button 
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium flex items-center"
          onClick={onBack}
        >
          <span className="mr-1">←</span>
          Back
        </button>
        
        <button 
          className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-violet-600 transition-colors font-medium flex items-center"
          onClick={generateAudio}
          disabled={!scriptText || !selectedVoice || generateAudioMutation.isPending}
        >
          <Music className="w-4 h-4 mr-1" />
          Generate Audio
        </button>
      </div>
    </div>
  );
}
