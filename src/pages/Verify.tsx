import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const Verify = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // When email is verified or user signs in, redirect to profile setup
      if (event === 'SIGNED_IN' && session?.user) {
        navigate("/profile-setup");
      }
    });

    // Check if user is already signed in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/profile-setup");
      }
    };
    checkUser();

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
            Je account is aangemaakt. Check je inbox voor de verificatie email, of klik op de link in de email om je profiel in te stellen.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Verify;
