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
        // Get the token hash from URL (this is what the email sends)
        const tokenHash = searchParams.get("token");
        const type = searchParams.get("type");

        console.log("Token hash from URL:", tokenHash);
        console.log("Type:", type);

        if (!tokenHash || type !== "signup") {
          setStatus("error");
          setErrorMessage("Ongeldige verificatie link");
          return;
        }

        // Verify the email using the token hash
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "signup",
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
        
        // Clean up
        sessionStorage.removeItem("pendingVerificationEmail");

        // Check if profile is complete
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, date_of_birth, photo_url")
          .eq("id", data.user.id)
          .single();

        // Redirect after a short delay
        setTimeout(() => {
          if (!profile?.first_name || !profile?.date_of_birth || !profile?.photo_url) {
            navigate("/profile-setup");
          } else {
            navigate("/profile-setup");
          }
        }, 1500);

      } catch (error: any) {
        console.error("Verification error:", error);
        setStatus("error");
        
        // Handle specific error cases
        if (error.message?.includes("expired") || error.message?.includes("invalid")) {
          setErrorMessage("Deze verificatie link is verlopen of ongeldig. Probeer opnieuw in te loggen.");
        } else {
          setErrorMessage(error.message || "Er ging iets mis bij het verifiëren");
        }
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