import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Video } from '@shared/schema';
import { 
  Play, Trash2, Download, Calendar, Clock, Film, 
  Search, RefreshCw, X, ExternalLink, FolderOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VideoGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject?: (projectId: string) => void;
}

export default function VideoGallery({ isOpen, onClose, onSelectProject }: VideoGalleryProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Fetch all videos
  const videosQuery = useQuery({
    queryKey: ['/api/videos'],
    queryFn: async () => {
      const response = await fetch('/api/videos');
      if (!response.ok) throw new Error('Error fetching videos');
      return response.json() as Promise<Video[]>;
    },
    enabled: isOpen,
  });

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      return apiRequest('DELETE', `/api/videos/${videoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({
        title: "Video eliminado",
        description: "El video ha sido eliminado correctamente"
      });
      if (selectedVideo) {
        setSelectedVideo(null);
        setIsPlaying(false);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el video",
        variant: "destructive"
      });
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadVideo = (video: Video) => {
    const link = document.createElement('a');
    link.href = `/api/videos/${video.id}/stream`;
    link.download = video.filename;
    link.click();
  };

  const openInProject = (projectId: string) => {
    if (onSelectProject) {
      onSelectProject(projectId);
      onClose();
    }
  };

  // Filter videos by search
  const filteredVideos = videosQuery.data?.filter(video => 
    video.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.projectId?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Sort by date (newest first)
  const sortedVideos = [...filteredVideos].sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Galería de Videos</h2>
              <p className="text-sm text-white/80">
                {sortedVideos.length} videos generados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Actions */}
        <div className="flex gap-3 p-4 border-b bg-gray-50">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => videosQuery.refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${videosQuery.isFetching ? 'animate-spin' : ''}`} />
            Refrescar
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Video List */}
          <div className="w-1/2 overflow-y-auto border-r p-4 space-y-3">
            {videosQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : sortedVideos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Film className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay videos</p>
                <p className="text-sm">Los videos generados aparecerán aquí</p>
              </div>
            ) : (
              sortedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => {
                    setSelectedVideo(video);
                    setIsPlaying(false);
                  }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedVideo?.id === video.id 
                      ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
                      <Film className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {video.filename}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(video.duration || 0)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(video.createdAt || '')}
                        </span>
                      </div>
                      {video.projectId && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          Proyecto: {video.projectId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Video Preview */}
          <div className="w-1/2 p-4 bg-gray-900 flex flex-col">
            {selectedVideo ? (
              <>
                {/* Video Player */}
                <div className="flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
                  {isPlaying ? (
                    <video
                      src={`/api/videos/${selectedVideo.id}/stream`}
                      controls
                      autoPlay
                      className="max-w-full max-h-full"
                      onEnded={() => setIsPlaying(false)}
                    />
                  ) : (
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => setIsPlaying(true)}
                    >
                      <div className="w-64 h-36 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Film className="w-16 h-16 text-gray-600" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors rounded-lg">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-indigo-600 ml-1" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Info & Actions */}
                <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-bold text-white truncate mb-2">
                    {selectedVideo.filename}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Duración: {formatDuration(selectedVideo.duration || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(selectedVideo.createdAt || '')}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPlaying(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Reproducir
                    </button>
                    <button
                      onClick={() => downloadVideo(selectedVideo)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {selectedVideo.projectId && onSelectProject && (
                      <button
                        onClick={() => openInProject(selectedVideo.projectId!)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="Abrir proyecto"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('¿Estás seguro de eliminar este video?')) {
                          deleteVideoMutation.mutate(selectedVideo.id);
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Film className="w-20 h-20 mx-auto mb-4 text-gray-600" />
                  <p className="text-lg font-medium text-gray-400">Selecciona un video</p>
                  <p className="text-sm text-gray-500">Haz clic en un video de la lista para previsualizarlo</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50 rounded-b-xl text-center text-sm text-gray-500">
          Total: {sortedVideos.length} videos
        </div>
      </div>
    </div>
  );
}

