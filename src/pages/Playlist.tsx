import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSpotifyAuth } from "@/context/SpotifyAuthContext";
import { getPlaylist, getAllPlaylistTracks } from "@/services/spotifyservice";
import { SpotifyPlaylist, SpotifyTrack } from "@/types/spotify";
import TrackItem from "@/components/TrackItem";
import { Play, Pause, Clock, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayer } from "@/context/PlayerContext";
import { toast } from "sonner";

const Playlist = () => {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { spotifyToken } = useSpotifyAuth();
  const { currentTrack, isPlaying, playTrack, togglePlayPause, addToQueue, addManyToQueue, clearQueue } = usePlayer();
 
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingAllTracks, setFetchingAllTracks] = useState(false);

  useEffect(() => {
    if (spotifyToken && playlistId) {
      fetchPlaylistDetails();
    }
  }, [spotifyToken, playlistId]);

  const fetchPlaylistDetails = async () => {
    setLoading(true);
    try {
      // Fetch playlist details
      const playlistData = await getPlaylist(spotifyToken!, playlistId!);
      setPlaylist(playlistData);

      // Show loading for all tracks
      setFetchingAllTracks(true);
      toast.info(`Fetching all ${playlistData.tracks.total} tracks...`);
      
      // Fetch ALL playlist tracks
      const allTracks = await getAllPlaylistTracks(spotifyToken!, playlistId!);
      setTracks(allTracks.map(item => item.track));
      
      toast.success(`Loaded ${allTracks.length} tracks`);
    } catch (error) {
      console.error("Error fetching playlist:", error);
      toast.error("Failed to load playlist");
    } finally {
      setLoading(false);
      setFetchingAllTracks(false);
    }
  };

  const playFirstTrack = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0]);
      // Add remaining tracks to queue
      if (tracks.length > 1) {
        addManyToQueue(tracks.slice(1));
      }
    }
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    
    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Clear current queue and play first shuffled track
    clearQueue();
    playTrack(shuffled[0]);
    
    // Add remaining shuffled tracks to queue
    if (shuffled.length > 1) {
      addManyToQueue(shuffled.slice(1));
    }
    
    toast.success("Shuffled playlist and added to queue");
  };

  const isPlaylistPlaying = isPlaying && tracks.some(track => track.id === currentTrack?.id);

  const handlePlayPause = () => {
    if (isPlaylistPlaying) {
      togglePlayPause();
    } else {
      playFirstTrack();
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-start gap-6 mb-8">
          <Skeleton className="h-44 w-44 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-5 w-20 mb-2" />
            <Skeleton className="h-12 w-64 mb-4" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
       
        <div className="space-y-2 mt-8">
          {Array(10).fill(null).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return <div className="text-center py-10">Playlist not found</div>;
  }

  return (
    <div>
      <header className="flex items-center gap-6 mb-8">
        <div className="h-44 w-44 bg-gray-800/50 rounded-lg overflow-hidden shadow-lg">
          {playlist.images?.[0] && (
            <img
              src={playlist.images[0].url}
              alt={playlist.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div>
          <p className="text-sm uppercase font-medium text-muted-foreground">Playlist</p>
          <h1 className="text-5xl font-bold mt-2 mb-4">{playlist.name}</h1>
          <p className="text-muted-foreground">
            {playlist.description || `${playlist.tracks.total} songs`}
          </p>
        </div>
      </header>

      <div className="mt-6 flex items-center gap-4">
        <Button
          onClick={handlePlayPause}
          className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 h-auto w-auto"
          disabled={tracks.length === 0 || fetchingAllTracks}
        >
          {isPlaylistPlaying ? <Pause size={28} /> : <Play size={28} />}
        </Button>
        <Button
          onClick={handleShuffle}
          variant="outline"
          className="rounded-full p-3"
          disabled={tracks.length === 0 || fetchingAllTracks}
          title="Shuffle playlist"
        >
          <Shuffle size={20} />
        </Button>
        {fetchingAllTracks && (
          <span className="text-sm text-muted-foreground">
            Loading all tracks...
          </span>
        )}
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 border-b border-border text-sm text-muted-foreground">
          <div className="flex items-center justify-center">#</div>
          <div>Title</div>
          <div>Album</div>
          <div className="flex justify-end">
            <Clock size={16} />
          </div>
        </div>

        {tracks.length > 0 ? (
          <div className="mt-2">
            {tracks.map((track, index) => (
              <TrackItem
                key={track.id}
                track={track}
                index={index}
                showCover={true}
                showAlbum={true}
                showIndex={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-xl">This playlist is empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlist;