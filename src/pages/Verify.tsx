import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";

const POLL_INTERVAL = 5000; // Check every 5 seconds

const Verify = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isPolling, setIsPolling] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleVerificationSuccess = useCallback(async (userId: string) => {
    // Clean up stored credentials
    sessionStorage.removeItem("pendingVerificationEmail");
    sessionStorage.removeItem("pendingVerification");

    // Check if profile is complete
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, date_of_birth, photo_url")
      .eq("id", userId)
      .single();

    if (!profile?.first_name || !profile?.date_of_birth || !profile?.photo_url) {
      navigate("/profile-setup");
    } else {
      navigate("/home");
    }
  }, [navigate]);

  // Check verification using stored credentials (works for cross-device verification)
  const checkVerificationWithCredentials = useCallback(async (): Promise<boolean> => {
    const storedCredentials = sessionStorage.getItem("pendingVerification");
    if (!storedCredentials) return false;

    try {
      const { email, password } = JSON.parse(storedCredentials);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // If error is "Email not confirmed", user hasn't verified yet
        if (error.message?.includes("Email not confirmed")) {
          return false;
        }
        console.error("Verification check error:", error.message);
        return false;
      }

      // If sign-in successful and email is confirmed
      if (data.user?.email_confirmed_at) {
        await handleVerificationSuccess(data.user.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking verification:", error);
      return false;
    }
  }, [handleVerificationSuccess]);

  // Check verification using existing session (works for same-device verification)
  const checkVerificationWithSession = useCallback(async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.email_confirmed_at) {
      await handleVerificationSuccess(session.user.id);
      return true;
    }
    
    return false;
  }, [handleVerificationSuccess]);

  // Combined check function
  const checkVerification = useCallback(async () => {
    // First try session-based check
    if (await checkVerificationWithSession()) return true;
    // Then try credentials-based check
    if (await checkVerificationWithCredentials()) return true;
    return false;
  }, [checkVerificationWithSession, checkVerificationWithCredentials]);

  // Manual check button handler
  const handleManualCheck = async () => {
    setIsChecking(true);
    await checkVerification();
    setIsChecking(false);
  };

  useEffect(() => {
    // Get email from storage for display
    const email = sessionStorage.getItem("pendingVerificationEmail");
    if (email) {
      setUserEmail(email);
    }

    // Check if user is already verified
    const initialCheck = async () => {
      const verified = await checkVerification();
      if (!verified) {
        // Start polling if not verified
        setIsPolling(true);
      }
    };

    initialCheck();
  }, [checkVerification]);

  // Polling effect
  useEffect(() => {
    if (!isPolling) return;

    const intervalId = setInterval(async () => {
      const verified = await checkVerification();
      if (verified) {
        setIsPolling(false);
        clearInterval(intervalId);
      }
    }, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isPolling, checkVerification]);

  // Listen for auth state changes (same-device verification via magic link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
          setIsPolling(false);
          await handleVerificationSuccess(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [handleVerificationSuccess]);

  const handleGoBack = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Mail className="w-8 h-8 text-primary" />
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
                <li>Deze pagina update automatisch</li>
              </ol>
            </div>
            
            {isPolling && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Wachten op verificatie...</span>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              Geen email ontvangen? Check je spam folder.
            </p>
            
            <div className="pt-4 space-y-2">
              <Button
                onClick={handleManualCheck}
                variant="secondary"
                className="w-full"
                disabled={isChecking}
              >
                {isChecking ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Controleer status
              </Button>
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="w-full"
              >
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
