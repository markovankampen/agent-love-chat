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

    // Check if just verified (redirected from /api/verify)
    const justVerified = sessionStorage.getItem("justVerified");
    if (justVerified === "true") {
      sessionStorage.removeItem("justVerified");
      handleVerificationSuccess();
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
        console.log("Verification detected in another tab - closing this tab");

        // Clean up
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }

        // Try to close the tab
        window.close();

        // If window.close() doesn't work (browser blocks it), show message and redirect
        setTimeout(() => {
          toast({
            title: "Email geverifieerd!",
            description: "Je kunt dit tabblad nu sluiten.",
            duration: 5000,
          });

          navigate("/profile-setup", { replace: true });
        }, 500);
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

          if (error) {
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
          console.error("Error during polling:", error);
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
              <h1 className="text-3xl font-bold text-green-600">
                <span>Email geverifieerd! ✓</span>
              </h1>
              <p className="text-muted-foreground">
                <span>Je email is succesvol geverifieerd.</span>
              </p>
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                <p className="text-4xl font-bold text-green-800 dark:text-green-200 mb-2">
                  <span>{countdown}</span>
                </p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  <span>Je wordt doorgestuurd naar profiel setup...</span>
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
              <h1 className="text-3xl font-bold text-red-600">
                <span>Verificatie mislukt</span>
              </h1>
              <p className="text-muted-foreground">
                <span>{errorMessage}</span>
              </p>
              <div className="pt-4">
                <Button onClick={handleGoBack} className="w-full">
                  <span>Terug naar inloggen</span>
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
            <h1 className="text-3xl font-bold">
              <span>Check je inbox</span>
            </h1>
            <p className="text-muted-foreground">
              <span>We hebben een verificatie email gestuurd{userEmail && ` naar ${userEmail}`}.</span>
            </p>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">
                <span>Volg deze stappen:</span>
              </p>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1 text-left">
                <li><span>Open je email inbox</span></li>
                <li><span>Klik op de verificatie link</span></li>
                <li><span>Sluit het nieuwe tabblad</span></li>
                <li><span>Dit tabblad gaat automatisch naar profiel setup</span></li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                <span>💡 Na verificatie wordt dit tabblad automatisch doorgestuurd naar profiel setup.</span>
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              <span>Geen email ontvangen? Check je spam folder.</span>
            </p>

            <div className="pt-4">
              <Button onClick={handleGoBack} variant="outline" className="w-full">
                <span className="flex items-center justify-center">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span>Terug naar inloggen</span>
                </span>
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
