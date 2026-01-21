import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  SelfieIcon, 
  ChatPhoneIcon, 
  MatchEnvelopesIcon, 
  DancingPersonIcon,
  LogoHeart,
  DecorativeSwirl
} from "@/components/icons/HowItWorksIcons";

// Import saved images
import girlfriendsCouch from "@/assets/girlfriends-couch.jpg";
import coupleDancing from "@/assets/couple-dancing.jpg";
import coupleCafeBook from "@/assets/couple-cafe-book.jpg";
import elderlyCoupleWalking from "@/assets/elderly-couple-walking.jpg";
import coupleTerraceCoffee from "@/assets/couple-terrace-coffee.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const heroImages = [coupleDancing, coupleTerraceCoffee, coupleCafeBook, elderlyCoupleWalking, girlfriendsCouch];

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
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="bg-foreground text-background py-2 px-4 text-center text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4"><LogoHeart /></span>
          indebuurt ontmoet is een initiatief van{" "}
          <a href="https://indebuurt.nl" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            indebuurt.nl
          </a>
        </span>
      </div>

      {/* Hero Section */}
      <section className="py-12 md:py-20 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Hero Image */}
            <div className="relative order-2 md:order-1">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/5] max-w-md mx-auto md:mx-0">
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
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 opacity-80 pointer-events-none hidden md:block">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <path d="M50 10 C60 20, 80 30, 85 50 C90 70, 70 90, 50 95 C30 90, 10 70, 15 50 C20 30, 40 20, 50 10" 
                    fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeDasharray="4 4" />
                </svg>
              </div>
            </div>

            {/* Hero Content */}
            <div className="text-center md:text-left order-1 md:order-2">
              {/* Heart Icon */}
              <div className="flex justify-center md:justify-start mb-6">
                <div className="w-20 h-24">
                  <LogoHeart />
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
                Flori<br />verbindt!
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
                Waag de sprong in het diepe met onze verrassende en slimme matchmaker Flori
              </p>

              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-full"
                onClick={() => navigate("/auth")}
              >
                Login en start direct
              </Button>

              {/* Handwritten tagline */}
              <div className="mt-8 flex items-center justify-center md:justify-start gap-4">
                <p className="font-caveat text-2xl md:text-3xl text-foreground italic">
                  Helemaal gratis én anoniem
                </p>
                {/* Small decorative dots */}
                <div className="flex flex-col gap-1">
                  <div className="w-2 h-2 rounded-full bg-foreground"></div>
                  <div className="w-2 h-2 rounded-full border border-primary"></div>
                  <div className="w-2 h-2 text-primary">
                    <svg viewBox="0 0 10 10" className="w-full h-full">
                      <path d="M2 5 L5 2 L8 5 L5 8 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-foreground mb-16">
            Hoe het werkt
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-28 h-28">
                  <SelfieIcon />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Login en<br />maak een selfie
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Je selfie blijft anoniem! We gebruiken deze om jouw uitstraling vast te leggen, zodat Flori kan zoeken naar mensen die passen bij wat jij aantrekkelijk vindt.
              </p>
              <p className="font-caveat text-lg text-foreground italic">Privacy staat voorop!</p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-24">
                  <ChatPhoneIcon />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Chat met onze<br />speelse AI bot Flori
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Chat met Flori, onze speelse AI matchmaker. Vertel over jezelf, wat je leuk vindt, wat je belangrijk vindt in een ander én wat jou uniek maakt. Flori analyseert jouw antwoorden en bouwt daarmee jouw persoonlijke profiel op.
              </p>
              <p className="font-caveat text-lg text-foreground italic">Slim en verrassend</p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-28 h-24">
                  <MatchEnvelopesIcon />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Jouw perfecte<br />match wordt gezocht
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Jij leeft je leven. Flori zoekt jouw match. Achter de schermen wordt jouw profiel vergeleken met anderen op zoek naar die ene onverwachte klik. Je hoeft alleen maar te wachten tot het moment daar is. Altijd met respect voor jouw privacy.
              </p>
              <p className="font-caveat text-lg text-foreground italic">Flori gaat voor je aan het werk</p>
            </div>

            {/* Step 4 */}
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-28">
                  <DancingPersonIcon />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                Een match!<br />Ga het avontuur aan
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Is er een match dan ontvang je een uitnodiging voor een drankje bij een leuke lokale plek: een echte blind date. Vind je dat een stap te ver dan kun je natuurlijk eerst contactgegevens uitwisselen en elkaar rustig leren kennen.
              </p>
              <p className="font-caveat text-lg text-foreground italic">Gaan jullie voor de blind date?</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-20">
              <LogoHeart />
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Jouw volgende ontmoeting<br />begint hier met Flori
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8">
            Stap aan boord en vind jouw ideale match
          </p>
          
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-full"
            onClick={() => navigate("/auth")}
          >
            Login en start direct
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center border-t border-border">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-14">
            <LogoHeart />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="text-primary font-semibold">indebuurt</span>
            <br />
            ontmoet
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
