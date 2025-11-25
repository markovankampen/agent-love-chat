import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Verify = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const checkVerification = async () => {
    setIsChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        navigate("/profile-setup");
      } else {
        toast({
          title: "Nog niet geverifieerd",
          description: "Check je inbox en klik op de verificatie link in de email.",
        });
      }
    } catch (error) {
      toast({
        title: "Fout bij controleren",
        description: "Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        navigate("/profile-setup");
      }
    });

    checkVerification();

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Heart className="w-8 h-8 text-primary fill-primary" />
          </div>
          <h1 className="text-3xl font-bold">Bijna klaar!</h1>
          <p className="text-muted-foreground">
            Je account is aangemaakt. Check je inbox voor de verificatie email en klik op de link om je profiel in te stellen.
          </p>
          <Button 
            onClick={checkVerification}
            disabled={isChecking}
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
                Controleer verificatie
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Verify;
