import { Sidebar } from "@/components/Sidebar";
import { Player } from "@/components/Player";
import { Header } from "@/components/Header";
import { SongCard } from "@/components/SongCard";
import { AIRecommendations } from "@/components/AIRecommendations";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Music2 } from "lucide-react";
import { useSpotifyAuth } from "@/context/SpotifyAuthContext";
import { useSpotifyPlaylists } from "@/hooks/useSpotifyPlaylists";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const Index = () => {
  const { isAuthenticated, login, user } = useSpotifyAuth();
  const { playlists, likedSongs, recentlyPlayed, loading } = useSpotifyPlaylists();
  const [greeting, setGreeting] = useState("Good evening");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar className="w-80 p-2" />
      
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 pb-24">
          <div className="bg-gradient-to-b from-primary/20 to-background">
            <Header />
            
            <div className="px-8 pb-8">
              <div className="mb-2 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-foreground">
                  {greeting}
                </h1>
              </div>
              <p className="mb-8 text-muted-foreground">
                {isAuthenticated && user?.display_name 
                  ? `Welcome back ${user.display_name}! Here's your personalized music experience.`
                  : "Welcome back! Connect to Spotify to unlock your personalized music experience."}
              </p>
              
              {isAuthenticated && <AIRecommendations />}
              
              {isAuthenticated && likedSongs.length > 0 && (
                <div className="mb-8">
                  <h2 className="mb-6 text-2xl font-bold text-foreground">
                    Your Liked Songs
                  </h2>
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {likedSongs.slice(0, 5).map((item) => {
                      const track = item.track;
                      return (
                        <SongCard
                          key={track.id}
                          title={track.name}
                          artist={track.artists?.map((a: any) => a.name).join(", ")}
                          imageUrl={track.album?.images?.[0]?.url}
                          track={track}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="mb-8">
                <h2 className="mb-6 text-2xl font-bold text-foreground">
                  {isAuthenticated ? "Your Playlists" : "Connect to Spotify"}
                </h2>
                {isAuthenticated ? (
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {playlists.slice(0, 5).map((playlist) => (
                      <SongCard
                        key={playlist.id}
                        title={playlist.name}
                        artist={`${playlist.tracks?.total || 0} tracks`}
                        imageUrl={playlist.images?.[0]?.url}
                        playlistId={playlist.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 px-4 rounded-lg bg-card/60 backdrop-blur">
                    <Music2 className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">Your music awaits</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                      Connect your Spotify account to see your playlists, recently played tracks, and get personalized recommendations
                    </p>
                    <Button onClick={login} size="lg" className="bg-[#1DB954] hover:bg-[#1DB954]/90">
                      Connect with Spotify
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <Player />
      </div>
    </div>
  );
};

export default Index;