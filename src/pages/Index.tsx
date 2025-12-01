import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import romantic3 from "@/assets/romantic-3.jpg";
import romantic4 from "@/assets/romantic-4.jpg";
import romantic5 from "@/assets/romantic-5.jpg";
import romantic6 from "@/assets/romantic-6.jpg";
import romantic7 from "@/assets/romantic-7.jpg";
import romantic8 from "@/assets/romantic-8.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const romanticImages = [romantic3, romantic4, romantic5, romantic6, romantic7, romantic8];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/chat");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % romanticImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background Images */}
        {romanticImages.map((image, index) => (
          <div
            key={index}
            className="absolute inset-0 z-0 transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: currentImageIndex === index ? 1 : 0,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
          </div>
        ))}
        
        <div className="relative z-10 w-full px-4 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-full mb-8 animate-pulse-soft">
            <Heart className="w-10 h-10 text-white fill-white" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-slide-up">
            Meet Matchmaker Flori
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-4 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            Jouw speelse AI matchmaker van indebuurt
          </p>
          
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Laten we chatten, jouw voorkeuren en persoonlijkheid ontdekken -  en hopelijk je perfecte match vinden
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
              onClick={() => navigate("/auth")}
            >
              Start je reis
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Hoe het werkt
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-card border animate-fade-in">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Chat & Ontdek</h3>
              <p className="text-muted-foreground">
                Heb een vriendelijk gesprek met onze Matchmaker. Deel je interesses, dromen, en wat jou uniek maakt. Het is gratis, anoniem en 18+.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-2xl bg-card border animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Hulp</h3>
              <p className="text-muted-foreground">
                Onze slimme AI Matchmaker bouwt in een 1 op 1 gesprek een persoonlijkheidsprofiel op en gaat op zoek naar een perfecte match.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-2xl bg-card border animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary fill-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Blind Matches</h3>
              <p className="text-muted-foreground">
                We delen geen foto's met kandidaten. We maken matches gebaseerd op de overeenkomsten die blijken uit de chats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary w-full">
        <div className="w-full px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Klaar om een date te vinden die bij je past?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Schrijf je in en laat onze Matchmaker je helpen aan een echte connectie.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-primary hover:bg-white/90 transition-opacity text-lg px-8 py-6"
            onClick={() => navigate("/auth")}
          >
            Begin nu
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
