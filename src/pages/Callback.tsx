import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Callback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Check if we have the token in the URL hash
      const hash = window.location.hash.substring(1);

      if (!hash) {
        const searchParams = new URLSearchParams(window.location.search);
        const errorParam = searchParams.get("error");

        if (errorParam) {
          const errorMessage = `Spotify authorization error: ${errorParam}`;
          console.error(errorMessage);
          setError(errorMessage);
          toast.error(errorMessage);
          navigate("/");
          return;
        }

        setError("No hash fragment found in URL");
        toast.error("Authentication failed: No response from Spotify");
        navigate("/");
        return;
      }

      const params = new URLSearchParams(hash);
      const token = params.get("access_token");
      const errorParam = params.get("error");

      if (errorParam) {
        const errorMessage = `Spotify auth error: ${errorParam}`;
        console.error(errorMessage);
        setError(errorMessage);
        toast.error(`Spotify authentication error: ${errorParam}`);
        navigate("/");
        return;
      }

      if (!token) {
        setError("No access token found in URL");
        toast.error("Authentication failed: No token received");
        navigate("/");
        return;
      }

      // Calculate when the token expires
      const expiresIn = params.get("expires_in");
      const expiresAt = Date.now() + (parseInt(expiresIn || "3600") * 1000);

      // Store the token and expiration time in localStorage
      localStorage.setItem("spotify_token", token);
      localStorage.setItem("spotify_expires_at", expiresAt.toString());

      // Clean up the URL and navigate to home
      window.history.replaceState({}, document.title, "/");

      toast.success("Successfully logged in!");
      navigate("/");
    } catch (err) {
      console.error("Error in callback processing:", err);
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      toast.error("An unexpected error occurred during login");
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <div className="mb-4">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
        </div>
        <h2 className="text-xl font-medium">Logging you in...</h2>
        <p className="mt-2 text-muted-foreground">Please wait while we connect to Spotify</p>
        {error && (
          <p className="mt-4 rounded-md bg-destructive/10 p-4 text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Callback;
