import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, RefreshCw, CheckCircle, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

const Verify = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasRedirectedRef = useRef(false);

  const handleVerificationSuccess = () => {
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    setIsVerified(true);
    sessionStorage.removeItem('pendingVerification');
    toast({
      title: "Email geverifieerd! ✓",
      description: "Je wordt doorgestuurd naar je profiel...",
    });
    setTimeout(() => navigate("/profile-setup"), 1500);
  };

  const checkVerificationWithCredentials = async (showToast = true) => {
    if (hasRedirectedRef.current) return;
    
    const pending = sessionStorage.getItem('pendingVerification');
    if (!pending) {
      // No stored credentials, fall back to session-based check
      return checkVerificationWithSession(showToast);
    }

    setIsChecking(true);
    try {
      const { email, password } = JSON.parse(pending);
      
      // Try to sign in - this will tell us if email is verified
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if the error is about email not being confirmed
        if (error.message.includes('Email not confirmed') || error.message.includes('not confirmed')) {
          if (showToast) {
            toast({
              title: "Nog niet geverifieerd",
              description: "Check je inbox en klik op de verificatie link in de email.",
            });
          }
          return;
        }
        throw error;
      }

      // Sign in succeeded - check if email is confirmed
      if (data.user?.email_confirmed_at) {
        handleVerificationSuccess();
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

  const checkVerificationWithSession = async (showToast = true) => {
    if (hasRedirectedRef.current) return;
    
    setIsChecking(true);
    try {
      // Try refreshing session first
      const { data: { session } } = await supabase.auth.refreshSession();
      
      if (session?.user?.email_confirmed_at) {
        handleVerificationSuccess();
        return;
      }

      // Fall back to getUser
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        handleVerificationSuccess();
        return;
      }
      
      if (showToast) {
        toast({
          title: "Nog niet geverifieerd",
          description: "Check je inbox en klik op de verificatie link in de email.",
        });
      }
    } catch (error) {
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

  useEffect(() => {
    // Check immediately on mount
    checkVerificationWithCredentials(false);
    
    // Set up polling every 3 seconds
    pollingRef.current = setInterval(() => {
      checkVerificationWithCredentials(false);
    }, 3000);

    // Listen for auth state changes (when user clicks link in same browser)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email_confirmed_at);
      
      if (hasRedirectedRef.current) return;
      
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user?.email_confirmed_at) {
        handleVerificationSuccess();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [navigate, toast]);

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
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Check je inbox</h1>
                <p className="text-muted-foreground">
                  We hebben een verificatie email gestuurd. Klik op de link in de email om door te gaan.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Wachten op verificatie...</span>
                </div>
                <Button 
                  onClick={() => checkVerificationWithCredentials(true)}
                  disabled={isChecking}
                  variant="outline"
                  className="mt-4"
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
