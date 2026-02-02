import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RefreshCw, CheckCircle, Mail, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const Verify = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedRef = useRef(false);
  const hasProcessedTokenRef = useRef(false);

  useEffect(() => {
    // Get email from storage for display
    const email = sessionStorage.getItem('pendingVerificationEmail');
    if (email) {
      setUserEmail(email);
    }

    // Check if we have verification tokens in URL
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (token && type === 'signup' && !hasProcessedTokenRef.current) {
      hasProcessedTokenRef.current = true;
      handleTokenVerification(token, type);
    } else {
      // Start polling if no token in URL
      checkVerification(false);
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [searchParams]);

  const handleTokenVerification = async (token: string, type: string) => {
    setIsChecking(true);
    try {
      // Verify the token using Supabase's verifyOtp
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup',
      });

      if (error) throw error;

      if (data.session) {
        handleVerificationSuccess();
      } else {
        throw new Error('Verification successful but no session created');
      }
    } catch (error: any) {
      console.error('Token verification error:', error);
      setVerificationError(error.message || 'Verificatie mislukt');
      toast({
        title: "Verificatie mislukt",
        description: "De verificatielink is ongeldig of verlopen. Vraag een nieuwe aan.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleVerificationSuccess = () => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    setIsVerified(true);
    stopPolling();
    
    // Clean up
    sessionStorage.removeItem('pendingVerificationEmail');
    
    toast({
      title: "Email geverifieerd! ✓",
      description: "Je wordt doorgestuurd naar profielinstelling...",
    });

    // Redirect to profile setup after verification
    setTimeout(() => navigate("/profile-setup"), 1500);
  };

  const checkVerification = async (showToast = true) => {
    if (hasRedirectedRef.current) return;
    
    setIsChecking(true);
    try {
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email_confirmed_at) {
        handleVerificationSuccess();
        return;
      }

      // Try refreshing the session
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
      
      if (refreshedSession?.user?.email_confirmed_at) {
        handleVerificationSuccess();
        return;
      }
      
      // Still not verified
      if (showToast) {
        toast({
          title: "Nog niet geverifieerd",
          description: "Check je inbox en klik op de verificatie link in de email.",
        });
      }
    } catch (error) {
      console.error('Verification check error:', error);
      if (showToast) {
        toast({
          title: "Fout bij controleren",
          description: "Probeer het opnieuw.",
          variant: "destructive",
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  const startPolling = () => {
    // Poll every 3 seconds
    pollingRef.current = setInterval(() => {
      checkVerification(false);
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const handleResendEmail = async () => {
    if (!userEmail) {
      toast({
        title: "Email niet gevonden",
        description: "Ga terug en probeer opnieuw te registreren.",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      });

      if (error) throw error;

      toast({
        title: "Email verzonden!",
        description: "Check je inbox voor de nieuwe verificatie email.",
      });
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || "Kon email niet opnieuw verzenden",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 space-y-6">
          <div className="text-center space-y-4">
            {isVerified ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold text-green-600">Geverifieerd!</h1>
                <p className="text-muted-foreground">
                  Je email is succesvol geverifieerd. Je wordt doorgestuurd...
                </p>
              </>
            ) : verificationError ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h1 className="text-3xl font-bold text-red-600">Verificatie mislukt</h1>
                <p className="text-muted-foreground">
                  {verificationError}
                </p>
                <Button 
                  onClick={handleResendEmail}
                  disabled={isChecking}
                  className="mt-4"
                >
                  {isChecking ? "Verzenden..." : "Nieuwe email versturen"}
                </Button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Check je inbox</h1>
                <p className="text-muted-foreground">
                  We hebben een verificatie email gestuurd{userEmail && ` naar ${userEmail}`}. 
                  Klik op de link in de email om door te gaan.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Wachten op verificatie...</span>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <Button 
                    onClick={() => checkVerification(true)}
                    disabled={isChecking}
                    variant="outline"
                  >
                    {isChecking ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Controleren...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Handmatig controleren
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleResendEmail}
                    disabled={isChecking}
                    variant="ghost"
                    size="sm"
                  >
                    Email opnieuw versturen
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Geen email ontvangen? Check je spam folder.
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

export default Verify;