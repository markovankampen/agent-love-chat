import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Import saved hero images
import girlfriendsCouch from "@/assets/girlfriends-couch.jpg";
import coupleDancing from "@/assets/couple-dancing.jpg";
import coupleCafeBook from "@/assets/couple-cafe-book.jpg";
import elderlyCoupleWalking from "@/assets/elderly-couple-walking.jpg";
import coupleTerraceCoffee from "@/assets/couple-terrace-coffee.jpg";

// Import illustrations
import heartRedGlow from "@/assets/illustrations/heart-red-glow.png";
import cupidBow from "@/assets/illustrations/cupid-bow.png";
import aiHeartChip from "@/assets/illustrations/ai-heart-chip.png";
import floatingHearts from "@/assets/illustrations/floating-hearts.png";
import wineGlasses from "@/assets/illustrations/wine-glasses.png";
import waveLine from "@/assets/illustrations/wave-line.png";
import rocketLove from "@/assets/illustrations/rocket-love.png";
import brokenHeart from "@/assets/illustrations/broken-heart.png";
import selfieHeart from "@/assets/illustrations/selfie-heart.png";

const Index = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  
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
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Hero Content - Left Side */}
            <div className="text-center md:text-left order-2 md:order-1">
              {/* Cupid Bow Illustration - jumping person with bow and hearts */}
              <div className="flex justify-center md:justify-start mb-4">
                <img 
                  src={cupidBow} 
                  alt="" 
                  className="w-40 h-40 md:w-48 md:h-48 object-contain"
                />
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-4 leading-tight">
                Flori<br />verbindt!
              </h1>

              <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-md">
                Waag de sprong in het diepe met onze verrassende en slimme matchmaker Flori
              </p>

              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-6 py-5 rounded-full"
                onClick={() => navigate("/auth")}
              >
                Login en start direct
              </Button>

              {/* Handwritten tagline */}
              <div className="mt-6">
                <p className="font-caveat text-2xl md:text-3xl text-foreground italic">
                  Helemaal gratis én anoniem
                </p>
              </div>
            </div>

            {/* Hero Image - Right Side */}
            <div className="relative order-1 md:order-2">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/5] max-w-sm mx-auto">
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
              {/* Image dots indicator */}
              <div className="flex justify-center gap-2 mt-4">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      currentImageIndex === index ? "bg-foreground" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Decorative dots */}
      <div className="flex items-center gap-2 px-8 py-4">
        <div className="w-2 h-2 rounded-full bg-foreground"></div>
        <div className="w-2 h-2 rounded-full border border-primary"></div>
        <div className="w-3 h-3 text-primary">
          <svg viewBox="0 0 10 10" className="w-full h-full">
            <path d="M2 5 L5 2 L8 5 L5 8 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Heart Separator */}
      <div className="flex justify-center py-4">
        <img src={heartRedGlow} alt="" className="w-12 h-12 object-contain" />
      </div>

      {/* Samen op avontuur Section */}
      <section className="py-12 md:py-16 px-4 md:px-8 bg-secondary/30">
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
      <section className="py-16 md:py-24 px-4 md:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-foreground mb-16">
            De route
          </h2>

          {/* Steps with curved path */}
          <div className="relative">
            {/* Wave line decoration - visible on larger screens */}
            <div className="hidden md:block absolute left-1/2 top-0 h-full w-px">
              <img 
                src={waveLine} 
                alt="" 
                className="absolute left-1/2 -translate-x-1/2 w-4 h-full object-contain opacity-30"
              />
            </div>

            {/* Step 1 - Right aligned illustration */}
            <div className="grid md:grid-cols-2 gap-8 items-center mb-16">
              <div className="text-center md:text-right order-2 md:order-1">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Login en<br />maak een selfie
                </h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xs ml-auto">
                  Je selfie blijft anoniem! We gebruiken deze om jouw uitstraling vast te leggen, zodat Flori kan zoeken naar mensen die passen bij wat jij aantrekkelijk vindt.
                </p>
                <p className="font-caveat text-xl text-primary italic">Privacy staat voorop!</p>
              </div>
              <div className="flex justify-center md:justify-start items-center order-1 md:order-2 relative">
                <img 
                  src={selfieHeart} 
                  alt="" 
                  className="w-28 h-28 md:w-36 md:h-36 object-contain"
                />
                <div className="absolute top-0 right-8 md:right-auto md:left-20 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
              </div>
            </div>

            {/* Step 2 - Left aligned illustration */}
            <div className="grid md:grid-cols-2 gap-8 items-center mb-16">
              <div className="flex justify-center md:justify-end items-center relative">
                <img 
                  src={aiHeartChip} 
                  alt="" 
                  className="w-28 h-28 md:w-36 md:h-36 object-contain"
                />
                <div className="absolute -top-2 left-4 md:left-auto md:right-28 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Chat met onze<br />speelse AI bot Flori
                </h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xs">
                  Chat met Flori, onze speelse AI matchmaker. Vertel over jezelf, wat je leuk vindt, wat je belangrijk vindt in een ander en wat jou uniek maakt. Flori analyseert jouw antwoorden en bouwt daarmee jouw persoonlijke profiel op.
                </p>
                <p className="font-caveat text-xl text-primary italic">Slim en verrassend</p>
              </div>
            </div>

            {/* Step 3 - Right aligned illustration */}
            <div className="grid md:grid-cols-2 gap-8 items-center mb-16">
              <div className="text-center md:text-right order-2 md:order-1">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Jouw perfecte<br />match wordt gezocht
                </h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xs ml-auto">
                  Jij leeft je leven. Flori zoekt jouw match. Achter de schermen wordt jouw profiel vergeleken met anderen op zoek naar die ene onverwachte klik. Je hoeft alleen maar te wachten tot het moment daar is. Altijd met respect voor jouw privacy.
                </p>
                <p className="font-caveat text-xl text-primary italic">Flori gaat voor je aan het werk</p>
              </div>
              <div className="flex justify-center md:justify-start items-center order-1 md:order-2 relative">
                <img 
                  src={floatingHearts} 
                  alt="" 
                  className="w-24 h-24 md:w-28 md:h-28 object-contain"
                />
                <div className="absolute top-0 right-8 md:right-auto md:left-20 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
              </div>
            </div>

            {/* Step 4 - Left aligned illustration */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flex justify-center md:justify-end items-center relative">
                <img 
                  src={wineGlasses} 
                  alt="" 
                  className="w-28 h-28 md:w-36 md:h-36 object-contain"
                />
                <div className="absolute -top-2 left-4 md:left-auto md:right-28 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                  4
                </div>
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Een match!<br />Ga het avontuur aan
                </h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xs">
                  Is er een match dan ontvang je een uitnodiging voor een drankje bij een leuke lokale plek: een echte blind date. Vind je dat een stap te ver dan kun je natuurlijk eerst contactgegevens uitwisselen en elkaar rustig leren kennen.
                </p>
                <p className="font-caveat text-xl text-primary italic">Gaan jullie voor de blind date?</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      {/* Footer */}
      <footer className="py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <img src={heartRedGlow} alt="" className="w-10 h-10 object-contain" />
            <p className="text-sm">
              <span className="text-primary font-bold">indebuurt</span>
              <span className="text-foreground"> ontmoet</span>
            </p>
          </div>
          
          {/* Footer links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a 
              href="mailto:contact@indebuurt.nl" 
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
            <span className="text-muted-foreground/30">•</span>
            <button 
              onClick={() => setShowTerms(true)}
              className="hover:text-foreground transition-colors"
            >
              Algemene Voorwaarden
            </button>
          </div>
        </div>
      </footer>

      {/* Terms Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Algemene Voorwaarden</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm text-muted-foreground">
              <p className="text-foreground font-medium">Matchmaker Flori – indebuurt.nl</p>
              <p>Datum: 28 januari 2026</p>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">1. Definities</h3>
                <p>In deze voorwaarden wordt verstaan onder:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Platform:</strong> Matchmaker Flori, onderdeel van indebuurt.nl</li>
                  <li><strong>Gebruiker:</strong> iedere natuurlijke persoon die gebruikmaakt van het Platform</li>
                  <li><strong>Dienst:</strong> het matchen van Gebruikers op basis van door henzelf verstrekte gegevens</li>
                  <li><strong>Persoonsgegevens:</strong> alle gegevens die herleidbaar zijn tot een individuele Gebruiker</li>
                  <li><strong>Verantwoordelijke:</strong> indebuurt.nl B.V., gevestigd in Nederland</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">2. Toepasselijkheid</h3>
                <p>2.1 Deze Algemene Voorwaarden zijn van toepassing op ieder gebruik van het Platform.</p>
                <p>2.2 Door gebruik te maken van Matchmaker Flori verklaart de Gebruiker akkoord te gaan met deze voorwaarden.</p>
                <p>2.3 Indien een bepaling ongeldig blijkt, blijven de overige bepalingen onverminderd van kracht.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">3. Doel van het Platform</h3>
                <p>3.1 Matchmaker Flori biedt een digitale matchmakingdienst waarbij Gebruikers op vrijwillige basis informatie over zichzelf verstrekken.</p>
                <p>3.2 Het doel is het faciliteren van passende ontmoetingen, niet het garanderen van een match of relatie.</p>
                <p>3.3 Matchmaker Flori is geen escort-, datingbureau of bemiddelingsbureau in juridische zin, maar een digitaal matchingplatform.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">4. Gebruikersvoorwaarden</h3>
                <p>4.1 De Gebruiker verklaart:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>minimaal 18 jaar oud te zijn</li>
                  <li>juiste, actuele en volledige informatie te verstrekken</li>
                  <li>het Platform niet te gebruiken voor commerciële, misleidende of schadelijke doeleinden</li>
                </ul>
                <p>4.2 Het is niet toegestaan:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>valse identiteiten te gebruiken</li>
                  <li>gegevens van anderen te uploaden zonder toestemming</li>
                  <li>het Platform te misbruiken, te hacken of te scrapen</li>
                </ul>
                <p>4.3 Matchmaker Flori behoudt zich het recht voor accounts te blokkeren of te verwijderen bij misbruik.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">5. Vertrouwelijkheid & Privacy (kernbepaling)</h3>
                <p><strong>5.1 Extreem vertrouwelijke omgang</strong><br />Alle door Gebruikers verstrekte gegevens worden als strikt vertrouwelijk behandeld.</p>
                <p><strong>5.2 Geen verkoop of doorverkoop</strong><br />Persoonsgegevens worden nooit verkocht, verhuurd of verhandeld aan derden.</p>
                <p><strong>5.3 Geen externe profilering</strong><br />Gegevens worden niet gebruikt voor externe advertentieprofielen, dataverrijking of commerciële targeting buiten indebuurt.nl.</p>
                <p><strong>5.4 Dataminimalisatie</strong><br />Matchmaker Flori verzamelt uitsluitend gegevens die noodzakelijk zijn voor matchmaking en platformfunctionaliteit.</p>
                <p><strong>5.5 Beperkte toegang</strong><br />Toegang tot persoonsgegevens is strikt beperkt tot:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>geautoriseerde medewerkers</li>
                  <li>technische dienstverleners die contractueel gebonden zijn aan geheimhouding</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">6. Verwerking van Persoonsgegevens (AVG)</h3>
                <p>6.1 De verwerking van persoonsgegevens gebeurt conform:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>de Algemene Verordening Gegevensbescherming (AVG/GDPR)</li>
                  <li>Nederlandse privacywetgeving</li>
                </ul>
                <p>6.2 Rechtsgrondslagen:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>expliciete toestemming van de Gebruiker</li>
                  <li>uitvoering van de Dienst</li>
                  <li>wettelijke verplichtingen</li>
                </ul>
                <p>6.3 De Gebruiker heeft recht op:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>inzage</li>
                  <li>correctie</li>
                  <li>verwijdering</li>
                  <li>dataportabiliteit</li>
                  <li>beperking van verwerking</li>
                </ul>
                <p>6.4 Verzoeken kunnen worden ingediend via: privacy@indebuurt.nl</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">7. Databeveiliging</h3>
                <p>7.1 Matchmaker Flori treft passende technische en organisatorische maatregelen, waaronder:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>versleuteling (encryptie)</li>
                  <li>beveiligde servers binnen de EU</li>
                  <li>logging en toegangscontrole</li>
                </ul>
                <p>7.2 Ondanks zorgvuldige beveiliging kan volledige veiligheid nooit worden gegarandeerd. Matchmaker Flori is niet aansprakelijk voor schade door onvoorziene datalekken, tenzij sprake is van grove nalatigheid.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">8. Delen van gegevens tussen Gebruikers</h3>
                <p>8.1 Persoonsgegevens worden alleen gedeeld met andere Gebruikers wanneer de functionaliteit dat vereist, en altijd binnen de context van matchmaking.</p>
                <p>8.2 Contactgegevens worden nooit automatisch gedeeld zonder expliciete actie of toestemming van de Gebruiker.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">9. Aansprakelijkheid</h3>
                <p>9.1 Matchmaker Flori is niet aansprakelijk voor:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>gedrag van andere Gebruikers</li>
                  <li>offline ontmoetingen of gevolgen daarvan</li>
                  <li>emotionele, sociale of relationele schade</li>
                </ul>
                <p>9.2 De Dienst wordt aangeboden op basis van "best effort".</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">10. Duur en beëindiging</h3>
                <p>10.1 De Gebruiker kan het gebruik van het Platform op ieder moment beëindigen.</p>
                <p>10.2 Na beëindiging worden persoonsgegevens binnen een redelijke termijn verwijderd, tenzij wettelijke bewaarplicht geldt.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">11. Wijzigingen</h3>
                <p>11.1 Matchmaker Flori kan deze voorwaarden wijzigen.</p>
                <p>11.2 Wijzigingen worden duidelijk gecommuniceerd via het Platform.</p>
                <p>11.3 Voortgezet gebruik betekent acceptatie van de gewijzigde voorwaarden.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">12. Toepasselijk recht</h3>
                <p>12.1 Op deze voorwaarden is uitsluitend Nederlands recht van toepassing.</p>
                <p>12.2 Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.</p>
              </section>

              <section className="space-y-2">
                <h3 className="text-foreground font-semibold">13. Contact</h3>
                <p>Matchmaker Flori – indebuurt.nl</p>
                <p>E-mail: contact@indebuurt.nl</p>
                <p>Privacy: privacy@indebuurt.nl</p>
              </section>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
