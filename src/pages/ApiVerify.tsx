import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

/**
 * API Verify Route
 * Handles email verification when user clicks link from email.
 * Shows a "close this tab" message after successful verification.
 * Signals the waiting /verify tab to redirect to profile-setup.
 */
const ApiVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (!tokenHash) {
          console.error("No token_hash found");
          setStatus("error");
          setErrorMessage("Ongeldige verificatie link");
          return;
        }

        console.log("Verifying email with token_hash...");

        // Verify the email
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === "signup" ? "signup" : "email",
        });

        if (error) {
          console.error("Verification error:", error);

          if (error.message?.includes("already") && error.message?.includes("verified")) {
            // Already verified - still show success and signal redirect
            setStatus("success");
            localStorage.setItem("email_verified_close_tab", "true");
            setTimeout(() => {
              localStorage.removeItem("email_verified_close_tab");
            }, 1000);
            return;
          }

          setStatus("error");
          setErrorMessage("Email verificatie mislukt. Probeer opnieuw in te loggen.");
          return;
        }

        if (!data.user) {
          console.error("No user returned after verification");
          setStatus("error");
          setErrorMessage("Email verificatie mislukt. Probeer opnieuw in te loggen.");
          return;
        }

        console.log("✅ Email verified successfully!");

        // Clean up
        sessionStorage.removeItem("pendingVerificationEmail");

        // Signal any waiting /verify tabs to close and redirect
        try {
          localStorage.setItem("email_verified_close_tab", "true");
          setTimeout(() => {
            localStorage.removeItem("email_verified_close_tab");
          }, 1000);
        } catch (e) {
          console.log("localStorage not available:", e);
        }

        // Show success message
        setStatus("success");

        // Try to close this tab after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (error) {
        console.error("Unexpected error:", error);
        setStatus("error");
        setErrorMessage("Er ging iets mis. Probeer opnieuw.");
      }
    };

    handleVerification();
  }, [searchParams, navigate]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <h1 className="text-2xl font-bold">Email verifiëren...</h1>
              <p className="text-muted-foreground">Even geduld terwijl we je email verifiëren.</p>
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
                <Button onClick={() => navigate("/auth")} className="w-full">
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

  // Success state - stable DOM structure to prevent React reconciliation errors
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
              <p className="text-green-800 dark:text-green-200 font-medium mb-2">
                <span>Je kunt dit tabblad nu sluiten</span>
              </p>
              <p className="text-sm text-green-800 dark:text-green-200">
                <span>Je oorspronkelijke tabblad wordt automatisch doorgestuurd naar profiel setup.</span>
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <span>💡 Dit tabblad probeert zichzelf te sluiten. Als dit niet werkt, kun je het handmatig sluiten.</span>
              </p>
            </div>

            <div className="pt-4">
              <Button onClick={() => window.close()} variant="outline" className="w-full">
                <span>Sluit dit tabblad</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default ApiVerify;
