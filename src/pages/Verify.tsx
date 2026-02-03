import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const Verify = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storageListenerRef = useRef<((e: StorageEvent) => void) | null>(null);

  useEffect(() => {
    // Get email from storage for display
    const email = sessionStorage.getItem("pendingVerificationEmail");
    if (email) {
      setUserEmail(email);
    }

    // Check if user is already verified
    const checkIfAlreadyVerified = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email_confirmed_at) {
        // Already verified, ALWAYS redirect to profile-setup
        sessionStorage.removeItem("pendingVerificationEmail");
        console.log("Already verified, redirecting to /profile-setup");
        navigate("/profile-setup", { replace: true });
      }
    };

    checkIfAlreadyVerified();

    // Listen for localStorage changes from other tabs (verification tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "email_verified" && e.newValue === "true") {
        console.log("Email verification detected from another tab!");

        // Clear the flag
        try {
          localStorage.removeItem("email_verified");
        } catch (err) {
          console.log("Could not clear localStorage:", err);
        }

        // Check verification and redirect
        handleVerificationComplete();
      }
    };

    storageListenerRef.current = handleStorageChange;
    window.addEventListener("storage", handleStorageChange);

    // Start polling for verification status every 2 seconds
    const startPolling = () => {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error("Error checking session:", error);
            return;
          }

          // If user is verified, navigate
          if (session?.user?.email_confirmed_at) {
            console.log("Email verified via polling! Navigating...");

            // Clear polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }

            // Handle verification complete
            handleVerificationComplete();
          }
        } catch (error) {
          console.error("Error during polling:", error);
        }
      }, 2000); // Check every 2 seconds
    };

    startPolling();

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (storageListenerRef.current) {
        window.removeEventListener("storage", storageListenerRef.current);
      }
    };
  }, [navigate, toast]);

  const handleVerificationComplete = async () => {
    try {
      // Clean up
      sessionStorage.removeItem("pendingVerificationEmail");

      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.error("No session found after verification");
        return;
      }

      // Show success message
      toast({
        title: "Email geverifieerd! ✓",
        description: "Je wordt doorgestuurd naar profiel setup...",
      });

      // ALWAYS navigate to profile-setup after email verification
      setTimeout(() => {
        console.log("Redirecting to /profile-setup");
        navigate("/profile-setup", { replace: true });
      }, 500);
    } catch (error) {
      console.error("Error in handleVerificationComplete:", error);
    }
  };

  const handleManualCheck = async () => {
    setChecking(true);

    try {
      // Refresh the session
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) throw error;

      if (session?.user?.email_confirmed_at) {
        // Email is verified
        handleVerificationComplete();
      } else {
        toast({
          title: "Nog niet geverifieerd",
          description: "Klik op de link in je email om je account te verifiëren",
        });
      }
    } catch (error: any) {
      console.error("Error checking verification:", error);
      toast({
        title: "Fout",
        description: "Kon verificatie niet controleren",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleGoBack = () => {
    // Clear polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 relative">
              <Mail className="w-8 h-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-3xl font-bold">Check je inbox</h1>
            <p className="text-muted-foreground">
              We hebben een verificatie email gestuurd{userEmail && ` naar ${userEmail}`}.
            </p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Volg deze stappen:</p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 text-left">
                <li>Open je email inbox</li>
                <li>Klik op de verificatie link in de email</li>
                <li>Je wordt automatisch doorgestuurd naar profiel setup</li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                💡 De verificatie link stuurt je automatisch door naar je profiel setup.
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-4">Geen email ontvangen? Check je spam folder.</p>

            <div className="pt-4 space-y-2">
              <Button onClick={handleManualCheck} variant="default" className="w-full" disabled={checking}>
                {checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Controleren...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Ik heb de link al geklikt
                  </>
                )}
              </Button>

              <Button onClick={handleGoBack} variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar inloggen
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Verify;
