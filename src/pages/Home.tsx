import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, User, LogOut } from "lucide-react";
import Footer from "@/components/Footer";
import heartRedGlow from "@/assets/illustrations/heart-red-glow.png";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/");
        return;
      }

      // Load profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, first_name")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUsername(profile.first_name || profile.username || "daar");
      }
      
      setLoading(false);
    };

    checkAuthAndLoadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={heartRedGlow} alt="" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg">
              <span className="text-primary">indebuurt</span>{" "}
              <span className="text-foreground">ontmoet</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Uitloggen
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Hallo, {username}! 👋
          </h1>
          <p className="text-muted-foreground">
            Wat wil je vandaag doen?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Chat Card */}
          <Card 
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
            onClick={() => navigate("/chat")}
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 group-hover:bg-primary/20 transition-colors">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Chat met Flori
              </h2>
              <p className="text-sm text-muted-foreground">
                Praat met onze AI matchmaker en ontdek jouw perfecte match
              </p>
            </div>
          </Card>

          {/* Account Card */}
          <Card 
            className="p-8 cursor-pointer hover:shadow-lg transition-all hover:border-primary group"
            onClick={() => navigate("/account")}
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4 group-hover:bg-primary/20 transition-colors">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Mijn Account
              </h2>
              <p className="text-sm text-muted-foreground">
                Bekijk en bewerk je profielgegevens
              </p>
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
