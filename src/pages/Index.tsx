import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/chat");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-purple rounded-full mb-8 animate-pulse-soft">
            <Heart className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-slide-up">
            Meet Agent Love
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-4 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Your playful AI matchmaker from Twente
          </p>
          
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Let's have a chat, discover your personality, and find your perfect match—no photos needed until you're ready!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button 
              size="lg" 
              className="bg-gradient-warm hover:opacity-90 transition-opacity text-lg px-8 py-6"
              onClick={() => navigate("/auth")}
            >
              Start Your Journey
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-card border animate-fade-in">
              <div className="w-16 h-16 bg-gradient-warm rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Chat & Discover</h3>
              <p className="text-muted-foreground">
                Have a friendly conversation with Agent Love. Share your interests, dreams, and what makes you unique.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-2xl bg-card border animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 bg-gradient-purple rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Magic</h3>
              <p className="text-muted-foreground">
                Our smart AI builds your personality profile from your conversations, finding patterns and perfect matches.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-2xl bg-card border animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 bg-gradient-sunset rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Blind Matches</h3>
              <p className="text-muted-foreground">
                Meet matches based on personality, not pictures. See photos only when there's mutual interest!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-sunset">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Find Your Match?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join DPG AGENT today and let Agent Love guide you to meaningful connections
          </p>
          <Button 
            size="lg" 
            className="bg-white text-primary hover:bg-white/90 transition-opacity text-lg px-8 py-6"
            onClick={() => navigate("/auth")}
          >
            Get Started Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
