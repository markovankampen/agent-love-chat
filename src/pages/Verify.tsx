import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const Verify = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [userEmail, setUserEmail] = useState<string>("");
  const [status, setStatus] = useState<"waiting" | "verified" | "error">("waiting");
  const [countdown, setCountdown] = useState(2);
  const [errorMessage, setErrorMessage] = useState("");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Check for errors in URL
    const error = searchParams.get("error");
    if (error) {
      setStatus("error");
      switch (error) {
        case "invalid_link":
          setErrorMessage("Ongeldige verificatie link");
          break;
        case "verification_failed":
          setErrorMessage("Email verificatie mislukt. Probeer opnieuw in te loggen.");
          break;
        default:
          setErrorMessage("Er ging iets mis. Probeer opnieuw.");
      }
      return;
    }

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
        console.log("Already verified, redirecting to /profile-setup");
        handleVerificationSuccess();
        return;
      }
    };

    checkIfAlreadyVerified();

    // Listen for verification signal from other tabs via localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "email_verified_close_tab" && e.newValue === "true") {
        console.log("Verification detected in another tab - redirecting to profile-setup");

        // Clean up
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }

        // Show success message and redirect
        handleVerificationSuccess();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Start polling for verification every 2 seconds
    const startPolling = () => {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.refreshSession();

          // Ignore session missing errors during polling - user hasn't verified yet
          if (error && !error.message?.includes("session missing")) {
            console.error("Error refreshing session:", error);
            return;
          }

          if (session?.user?.email_confirmed_at) {
            console.log("Email verified via polling!");

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }

            handleVerificationSuccess();
          }
        } catch (error) {
          // Silently handle polling errors - they're expected before verification
          console.log("Polling check (waiting for verification)...");
        }
      }, 2000);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [searchParams, navigate, toast]);

  const handleVerificationSuccess = () => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;

    sessionStorage.removeItem("pendingVerificationEmail");
    setStatus("verified");

    let count = 2;
    const timer = setInterval(() => {
      count--;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(timer);
        console.log("Redirecting to /profile-setup");
        navigate("/profile-setup", { replace: true });
      }
    }, 1000);
  };

  const handleGoBack = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    navigate("/auth");
  };

  if (status === "verified") {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-green-600">Email geverifieerd! ✓</h1>
              <p className="text-muted-foreground">Je email is succesvol geverifieerd.</p>
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                <p className="text-4xl font-bold text-green-800 dark:text-green-200 mb-2">{countdown}</p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Je wordt doorgestuurd naar profiel setup...
                </p>
              </div>
            </div>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-3xl font-bold text-red-600">Verificatie mislukt</h1>
              <p className="text-muted-foreground">{errorMessage}</p>
              <div className="pt-4">
                <Button onClick={handleGoBack} className="w-full">
                  Terug naar inloggen
                </Button>
              </div>
            </div>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

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
                <li>Klik op de verificatie link</li>
                <li>Sluit het nieuwe tabblad dat opent</li>
                <li>Dit tabblad stuurt je automatisch door naar profiel setup</li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                💡 Na het klikken op de link wordt dit tabblad automatisch doorgestuurd. Het nieuwe tabblad kun je
                sluiten.
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-4">Geen email ontvangen? Check je spam folder.</p>

            <div className="pt-4">
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
