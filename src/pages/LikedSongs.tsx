import { useEffect, useState } from "react";
import { useSpotifyAuth } from "@/context/SpotifyAuthContext";
import { getSavedTracks } from "@/services/spotifyservice";
import { SpotifyTrack } from "@/types/spotify";
import TrackItem from "@/components/TrackItem";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const LikedSongs = () => {
  const { spotifyToken } = useSpotifyAuth();
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (spotifyToken) {
      fetchLikedSongs();
    }
  }, [spotifyToken]);

  const fetchLikedSongs = async () => {
    setLoading(true);
    try {
      const response = await getSavedTracks(spotifyToken!);
      setTracks(response.items.map(item => item.track));
    } catch (error) {
      console.error("Error fetching liked songs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="flex items-center gap-6 mb-8">
        <div className="h-44 w-44 flex items-center justify-center bg-gradient-to-br from-purple-700 to-blue-400 rounded-lg shadow-lg">
          <Heart size={64} fill="white" className="text-white" />
        </div>
        <div>
          <p className="text-sm uppercase font-medium text-muted-foreground">Playlist</p>
          <h1 className="text-5xl font-bold mt-2 mb-4">Liked Songs</h1>
          <p className="text-muted-foreground">
            Your personally curated collection of favorite tracks
          </p>
        </div>
      </header>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-2">
            {Array(10)
              .fill(null)
              .map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
          </div>
        ) : tracks.length > 0 ? (
          <div className="space-y-1">
            {tracks.map((track, index) => (
              <TrackItem key={track.id} track={track} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-xl mb-2">Your Liked Songs playlist is empty</p>
            <p className="text-muted-foreground">
              Save songs by clicking the heart icon
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedSongs;