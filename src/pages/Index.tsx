import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import RouteSection from "@/components/RouteSection";

// Import saved hero images
import girlfriendsCouch from "@/assets/girlfriends-couch.jpg";
import coupleDancing from "@/assets/couple-dancing.jpg";
import coupleCafeBook from "@/assets/couple-cafe-book.jpg";
import elderlyCoupleWalking from "@/assets/elderly-couple-walking.jpg";
import coupleTerraceCoffee from "@/assets/couple-terrace-coffee.jpg";

// Import illustrations
import heartRedGlow from "@/assets/illustrations/heart-red-glow.png";
import floriLogo from "@/assets/flori-logo.png";

const Index = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const heroImages = [coupleDancing, coupleTerraceCoffee, coupleCafeBook, elderlyCoupleWalking, girlfriendsCouch];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/home");
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top Bar */}
      <div className="bg-foreground text-background py-2 px-4 text-center text-sm">
        <span className="inline-flex items-center gap-2">
          <img src={heartRedGlow} alt="" className="w-4 h-4 object-contain" />
          indebuurt ontmoet is een initiatief van{" "}
          <a href="https://indebuurt.nl" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            indebuurt.nl
          </a>
        </span>
      </div>

      {/* Hero Section */}
      <section className="py-8 md:py-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Hero Content - Left Side */}
            <div className="text-center order-2 md:order-1 flex-1 flex flex-col justify-between md:max-w-md">
              <div className="flex flex-col justify-start">
                {/* Flori Logo Illustration */}
                <div className="flex justify-center mb-2">
                  <img 
                    src={floriLogo} 
                    alt="Flori" 
                    className="w-36 h-36 md:w-44 md:h-44 object-contain"
                  />
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-2 leading-tight">
                  Flori<br />verbindt!
                </h1>

                <p className="text-base md:text-lg text-muted-foreground mb-4 max-w-md mx-auto">
                  Waag de sprong in het diepe met onze verrassende en slimme matchmaker Flori
                </p>

                <div>
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-6 py-5 rounded-full"
                    onClick={() => navigate("/auth")}
                  >
                    Login en start direct
                  </Button>
                </div>
              </div>

              {/* Handwritten tagline - aligned with photo slider dots */}
              <div className="md:mt-auto" style={{ marginTop: '15px' }}>
                <p 
                  className="font-caveat text-2xl md:text-3xl text-foreground"
                  style={{ transform: 'rotate(-2deg)' }}
                >
                  Helemaal gratis én anoniem
                </p>
              </div>
            </div>

            {/* Hero Image - Right Side */}
            <div className="relative order-1 md:order-2 flex-1 flex justify-center md:justify-end">
              <div className="relative rounded-3xl overflow-hidden w-full max-w-sm" style={{ aspectRatio: '4/5' }}>
                {heroImages.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                      currentImageIndex === index ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
                {/* Image dots indicator - inside photo at bottom */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {heroImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        currentImageIndex === index ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Samen op avontuur Section with heart overlapping the border */}
      <section className="relative bg-primary/10 pt-16 pb-12 md:pt-20 md:pb-16 px-4 md:px-8">
        {/* Heart positioned to overlap the top border */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 md:-top-8">
          <img src={heartRedGlow} alt="" className="w-12 h-12 md:w-16 md:h-16 object-contain" />
        </div>
        
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            Samen op<br />avontuur met Flori
          </h2>
          
          <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Ontmoet Flori. De AI matchmaker die jouw verhaal gebruikt om die ene echte klik te vinden. Geen oppervlakkige matches maar een echte connectie. Via een speels gesprek leert Flori je voorkeuren kennen en zoekt achter de schermen naar die ene match die bij je past. Zo wordt daten verrassend, verdiepend en persoonlijk zonder die vervelende vlakke berichtjes of eindeloos geswipe.
          </p>
          
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-6 py-5 rounded-full"
            onClick={() => navigate("/auth")}
          >
            Login en start direct
          </Button>
        </div>
      </section>

      {/* De route Section */}
      <RouteSection />

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            Jouw volgende ontmoeting<br />begint hier met Flori
          </h2>
          
          <p className="text-base md:text-lg text-muted-foreground mb-8">
            Stap aan boord en vind jouw ideale match
          </p>
          
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-6 py-5 rounded-full"
            onClick={() => navigate("/auth")}
          >
            Login en start direct
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
