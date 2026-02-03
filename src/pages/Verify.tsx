import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";

const Verify = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    // Get email from storage for display
    const email = sessionStorage.getItem("pendingVerificationEmail");
    if (email) {
      setUserEmail(email);
    }

    // Check if user is already verified (in case they came back to this page)
    const checkIfAlreadyVerified = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email_confirmed_at) {
        // Already verified, redirect
        sessionStorage.removeItem("pendingVerificationEmail");
        
        // Check if profile is complete
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, date_of_birth, photo_url")
          .eq("id", session.user.id)
          .single();

        if (!profile?.first_name || !profile?.date_of_birth || !profile?.photo_url) {
          navigate("/profile-setup");
        } else {
          navigate("/profile-setup");
        }
      }
    };

    checkIfAlreadyVerified();
  }, [navigate]);

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
                <li>Je wordt automatisch doorgestuurd in dit venster</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Geen email ontvangen? Check je spam folder.
            </p>
            <div className="pt-4">
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