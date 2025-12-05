import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        try {
          const { data, error } = await supabase.functions.invoke('spotify-auth', {
            body: { 
              code,
              redirect_uri: `${window.location.origin}/auth/callback`
            },
          });

          if (error) throw error;

          // Sign in the user
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: data.spotify_id + '@spotify.local',
            password: data.access_token,
          });

          if (!signInError) {
            toast({
              title: "Login Successful",
              description: `Welcome back, ${data.display_name}!`,
            });
            navigate('/');
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          toast({
            title: "Authentication Failed",
            description: "Failed to complete Spotify authentication.",
            variant: "destructive",
          });
          navigate('/');
        }
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Authenticating with Spotify...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
};

export default AuthCallback;