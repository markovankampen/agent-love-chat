import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token and user_id from URL
        const token = searchParams.get("token");
        const userId = searchParams.get("user_id");

        if (!token || !userId) {
          setStatus("error");
          setErrorMessage("Ongeldige verificatie link");
          return;
        }

        // Call the verify-email-token edge function
        const { data, error } = await supabase.functions.invoke('verify-email-token', {
          body: { token, userId },
        });

        if (error) {
          throw new Error(error.message || 'Verification failed');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Verification failed');
        }

        // Success - email verified
        setStatus("success");
        
        // Clean up
        sessionStorage.removeItem("pendingVerificationEmail");
        sessionStorage.removeItem("pendingVerification");

        // Try to sign in with stored credentials
        const storedCredentials = sessionStorage.getItem("pendingVerification");
        if (storedCredentials) {
          const { email, password } = JSON.parse(storedCredentials);
          await supabase.auth.signInWithPassword({ email, password });
        }

        // Redirect after a short delay
        setTimeout(() => {
          navigate("/profile-setup");
        }, 2000);

      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus("error");
        setErrorMessage(error.message || "Er ging iets mis bij het verifiëren");
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

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
                <p className="text-muted-foreground">
                  Je email is succesvol geverifieerd. Je wordt doorgestuurd...
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
