import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPostAuthRoute } from "@/lib/postAuthNavigate";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token_hash from URL params
        let tokenHash = searchParams.get("token_hash");
        let type = searchParams.get("type");

        // Also check hash fragment for backward compatibility
        if (!tokenHash && location.hash) {
          console.log("Checking hash fragment:", location.hash);
          const hashParams = new URLSearchParams(location.hash.substring(1));
          tokenHash = hashParams.get("token_hash") || hashParams.get("token");
          type = hashParams.get("type");

          // Check for access_token (Supabase default format)
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            console.log("Found access_token in hash - setting session");

            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("Session set error:", error);
              throw error;
            }

            if (!data.user?.email_confirmed_at) {
              throw new Error("Email verificatie mislukt");
            }

            console.log("Email verified successfully via access_token");
            setStatus("success");
            sessionStorage.removeItem("pendingVerificationEmail");

            // Start countdown
            startCountdown();
            return;
          }
        }

        console.log("Token hash from URL:", tokenHash);
        console.log("Type:", type);

        if (!tokenHash) {
          throw new Error("Ongeldige verificatie link - geen token gevonden");
        }

        // Verify the email using the token hash
        console.log("Verifying email with token_hash...");
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === "signup" ? "signup" : "email",
        });

        if (error) {
          console.error("Verification error:", error);
          throw error;
        }

        if (!data.user) {
          throw new Error("Email verificatie mislukt");
        }

        console.log("Email verified successfully:", data.user.email);

        // Success
        setStatus("success");
        sessionStorage.removeItem("pendingVerificationEmail");

        // Start countdown
        startCountdown();
      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus("error");

        // Handle specific error cases
        if (error.message?.includes("expired") || error.message?.includes("invalid")) {
          setErrorMessage("Deze verificatie link is verlopen of ongeldig. Probeer opnieuw in te loggen.");
        } else if (error.message?.includes("already") && error.message?.includes("verified")) {
          setErrorMessage("Dit email adres is al geverifieerd.");
          // Already verified - redirect based on role/profile
          setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const route = session ? await getPostAuthRoute(session.user.id) : "/profile-setup";
            navigate(route, { replace: true });
          }, 2000);
        } else {
          setErrorMessage(error.message || "Er ging iets mis bij het verifiëren");
        }
      }
    };

    verifyEmail();
  }, [searchParams, location.hash, navigate]);

  const startCountdown = () => {
    let count = 3;
    const timer = setInterval(async () => {
      count--;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(timer);
        const { data: { session } } = await supabase.auth.getSession();
        const route = session ? await getPostAuthRoute(session.user.id) : "/profile-setup";
        console.log("Redirecting to", route);
        navigate(route, { replace: true });
      }
    }, 1000);
  };

  const handleRetry = () => {
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            {status === "loading" && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h1 className="text-3xl font-bold">Email verifiëren...</h1>
                <p className="text-muted-foreground">Even geduld terwijl we je email verifiëren</p>
              </>
            )}

            {status === "success" && (
              <>
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
              </>
            )}

            {status === "error" && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold text-red-600">Verificatie mislukt</h1>
                <p className="text-muted-foreground">{errorMessage}</p>
                <div className="pt-4">
                  <Button onClick={handleRetry} className="w-full">
                    Probeer opnieuw
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default VerifyEmail;
