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
        // Get the token from URL (Supabase uses access_token and refresh_token)
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        const type = searchParams.get("type");

        if (!accessToken || type !== "signup") {
          setStatus("error");
          setErrorMessage("Ongeldige verificatie link");
          return;
        }

        // Set the session using the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        });

        if (error) throw error;

        if (!data.user?.email_confirmed_at) {
          setStatus("error");
          setErrorMessage("Email verificatie mislukt");
          return;
        }

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
            navigate("/home");
          }
        }, 1500);

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