import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
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
        let tokenHash = searchParams.get("token");
        let type = searchParams.get("type");

        // If not in query params, check hash fragment (production behavior)
        if (!tokenHash && location.hash) {
          console.log("Checking hash fragment:", location.hash);
          const hashParams = new URLSearchParams(location.hash.substring(1));
          tokenHash = hashParams.get("token") || hashParams.get("token_hash");
          type = hashParams.get("type");

          // Also check for access_token and refresh_token (Supabase default format)
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            console.log("Found access_token and refresh_token in hash");

            // Set the session using the tokens from the hash
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              console.error("Session set error:", error);
              throw error;
            }

            if (!data.user?.email_confirmed_at) {
              setStatus("error");
              setErrorMessage("Email verificatie mislukt");
              return;
            }

            console.log("Email verified successfully via access_token:", data.user.email);

            // Success - email verified
            setStatus("success");

            // Notify the original tab via localStorage
            localStorage.setItem("email_verified", "true");

            // Give a brief moment for the event to fire
            setTimeout(() => {
              localStorage.removeItem("email_verified");
            }, 100);

            // Clean up
            sessionStorage.removeItem("pendingVerificationEmail");

            // Start countdown to close/redirect
            startCountdown();

            return;
          }
        }

        console.log("Token hash from URL:", tokenHash);
        console.log("Type:", type);

        if (!tokenHash) {
          setStatus("error");
          setErrorMessage("Ongeldige verificatie link - geen token gevonden");
          console.error("No token found in query params or hash");
          return;
        }

        // Verify the email using the token hash
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === "signup" ? "signup" : "email",
        });

        if (error) {
          console.error("Verification error:", error);
          throw error;
        }

        if (!data.user) {
          setStatus("error");
          setErrorMessage("Email verificatie mislukt");
          return;
        }

        console.log("Email verified successfully:", data.user.email);

        // Success - email verified
        setStatus("success");

        // Notify the original tab via localStorage
        localStorage.setItem("email_verified", "true");

        // Give a brief moment for the event to fire
        setTimeout(() => {
          localStorage.removeItem("email_verified");
        }, 100);

        // Clean up
        sessionStorage.removeItem("pendingVerificationEmail");

        // Start countdown to close/redirect
        startCountdown();
      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus("error");

        // Handle specific error cases
        if (error.message?.includes("expired") || error.message?.includes("invalid")) {
          setErrorMessage("Deze verificatie link is verlopen of ongeldig. Probeer opnieuw in te loggen.");
        } else if (error.message?.includes("already been verified")) {
          setErrorMessage("Dit email adres is al geverifieerd. Log in om verder te gaan.");
        } else {
          setErrorMessage(error.message || "Er ging iets mis bij het verifiëren");
        }
      }
    };

    const startCountdown = () => {
      let count = 3;
      const timer = setInterval(() => {
        count--;
        setCountdown(count);

        if (count <= 0) {
          clearInterval(timer);
          // Try to close the window
          const closed = window.close();

          // If close doesn't work (most browsers prevent this), redirect
          if (!closed) {
            // Check if we have opener (opened from another tab)
            if (window.opener && !window.opener.closed) {
              // Focus the opener
              window.opener.focus();
              window.close();
            } else {
              // No opener, redirect to verify page
              navigate("/verify");
            }
          }
        }
      }, 1000);
    };

    verifyEmail();
  }, [searchParams, location.hash, navigate]);

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
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">{countdown}</p>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    💡 Dit tabblad sluit automatisch.
                    <br />
                    Ga terug naar het vorige tabblad om door te gaan.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Als dit venster niet sluit, kun je het handmatig sluiten.
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold text-red-600">Verificatie mislukt</h1>
                <p className="text-muted-foreground">{errorMessage}</p>
                <p className="text-sm text-muted-foreground mt-4">
                  Probeer opnieuw in te loggen of neem contact op met support als het probleem aanhoudt.
                </p>
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
