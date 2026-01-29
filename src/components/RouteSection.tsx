import selfieHeart from "@/assets/illustrations/selfie-heart-new.png";
import chatBubbleHeart from "@/assets/illustrations/chat-bubble-heart.png";
import aiHeartChip from "@/assets/illustrations/ai-heart-chip-new.png";
import matchCelebration from "@/assets/illustrations/match-celebration.png";

const RouteSection = () => {
  return (
    <section className="py-16 md:py-24 px-4 md:px-8 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-foreground mb-16 md:mb-20">
          De route
        </h2>

        {/* Desktop layout with absolute positioning */}
        <div className="hidden md:block relative" style={{ height: '1500px' }}>
          {/* SVG curved path - smooth S-curve through the number badges */}
          <svg
            className="absolute left-1/2 -translate-x-1/2 top-0 w-full h-full pointer-events-none"
            viewBox="0 0 800 1500"
            preserveAspectRatio="xMidYMin meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M400 0
                 L400 80
                 C400 150, 580 200, 580 320
                 C580 480, 220 580, 220 780
                 C220 980, 580 1080, 580 1250
                 C580 1400, 400 1450, 400 1500"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Step 1 - At first curve (right peak) - Text LEFT, Badge on line, Image RIGHT */}
          <div className="absolute" style={{ top: '80px', left: '0', right: '0' }}>
            {/* Text block - LEFT side, center-aligned */}
            <div className="absolute text-center" style={{ left: '40px', top: '0', width: '300px' }}>
              <h3 className="text-2xl font-bold text-foreground mb-3 leading-tight">
                Login en<br />maak een selfie
              </h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Je selfie blijft anoniem! We gebruiken deze om jouw uitstraling vast te leggen, zodat Flori kan zoeken naar mensen die passen bij wat jij aantrekkelijk vindt.
              </p>
              <p className="font-caveat text-xl text-primary" style={{ transform: 'rotate(-2deg)' }}>
                Privacy staat voorop!
              </p>
            </div>

            {/* Number badge - ON the line at right curve */}
            <div className="absolute" style={{ left: '50%', transform: 'translateX(80px)', top: '50px' }}>
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-xl z-10 relative">
                1
              </div>
            </div>

            {/* Illustration - RIGHT side */}
            <div className="absolute" style={{ right: '40px', top: '-10px' }}>
              <img
                src={selfieHeart}
                alt=""
                className="w-32 h-32 object-contain"
              />
            </div>
          </div>

          {/* Step 2 - At left curve - Image LEFT, Badge on line, Text RIGHT */}
          <div className="absolute" style={{ top: '420px', left: '0', right: '0' }}>
            {/* Illustration - LEFT side */}
            <div className="absolute" style={{ left: '40px', top: '-20px' }}>
              <img
                src={chatBubbleHeart}
                alt=""
                className="w-28 h-28 object-contain"
              />
            </div>

            {/* Number badge - ON the line at left curve */}
            <div className="absolute" style={{ left: '50%', transform: 'translateX(-100px)', top: '50px' }}>
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-xl z-10 relative">
                2
              </div>
            </div>

            {/* Text block - RIGHT side, center-aligned */}
            <div className="absolute text-center" style={{ right: '40px', top: '0', width: '320px' }}>
              <h3 className="text-2xl font-bold text-foreground mb-3 leading-tight">
                Chat met onze<br />speelse AI bot Flori
              </h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Chat met Flori, onze speelse AI matchmaker. Vertel over jezelf, wat je leuk vindt, wat je belangrijk vindt in een ander en wat jou uniek maakt. Flori analyseert jouw antwoorden en bouwt daarmee jouw persoonlijke profiel op.
              </p>
              <p className="font-caveat text-xl text-primary" style={{ transform: 'rotate(-2deg)' }}>
                Slim en verrassend
              </p>
            </div>
          </div>

          {/* Step 3 - At right curve - Text LEFT, Badge on line, Image RIGHT */}
          <div className="absolute" style={{ top: '780px', left: '0', right: '0' }}>
            {/* Text block - LEFT side, center-aligned */}
            <div className="absolute text-center" style={{ left: '40px', top: '0', width: '300px' }}>
              <h3 className="text-2xl font-bold text-foreground mb-3 leading-tight">
                Jouw perfecte<br />match wordt gezocht
              </h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Jij leeft je leven. Flori zoekt jouw match. Achter de schermen wordt jouw profiel vergeleken met anderen op zoek naar die ene onverwachte klik. Je hoeft alleen maar te wachten tot het moment daar is. Altijd met respect voor jouw privacy.
              </p>
              <p className="font-caveat text-xl text-primary" style={{ transform: 'rotate(-2deg)' }}>
                Flori gaat voor je aan het werk
              </p>
            </div>

            {/* Number badge - ON the line at right curve */}
            <div className="absolute" style={{ left: '50%', transform: 'translateX(80px)', top: '80px' }}>
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-xl z-10 relative">
                3
              </div>
            </div>

            {/* Illustration - RIGHT side */}
            <div className="absolute" style={{ right: '40px', top: '10px' }}>
              <img
                src={aiHeartChip}
                alt=""
                className="w-32 h-32 object-contain"
              />
            </div>
          </div>

          {/* Step 4 - At final left curve - Image LEFT, Badge on line, Text RIGHT */}
          <div className="absolute" style={{ top: '1150px', left: '0', right: '0' }}>
            {/* Illustration - LEFT side */}
            <div className="absolute" style={{ left: '40px', top: '0' }}>
              <img
                src={matchCelebration}
                alt=""
                className="w-32 h-32 object-contain"
              />
            </div>

            {/* Number badge - ON the line at left curve */}
            <div className="absolute" style={{ left: '50%', transform: 'translateX(-100px)', top: '50px' }}>
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-xl z-10 relative">
                4
              </div>
            </div>

            {/* Text block - RIGHT side, center-aligned */}
            <div className="absolute text-center" style={{ right: '40px', top: '0', width: '320px' }}>
              <h3 className="text-2xl font-bold text-foreground mb-3 leading-tight">
                Een match!<br />Ga het avontuur aan
              </h3>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Is er een match dan ontvang je een uitnodiging voor een drankje bij een leuke lokale plek: een echte blind date. Vind je dat een stap te ver dan kun je natuurlijk eerst contactgegevens uitwisselen en elkaar rustig leren kennen.
              </p>
              <p className="font-caveat text-xl text-primary" style={{ transform: 'rotate(-2deg)' }}>
                Gaan jullie voor de blind date?
              </p>
            </div>
          </div>
        </div>

        {/* Mobile layout - stacked vertical */}
        <div className="md:hidden space-y-16">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center">
            <img src={selfieHeart} alt="" className="w-20 h-20 object-contain mb-4" />
            <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg mb-4">1</div>
            <h3 className="text-xl font-bold text-foreground mb-2">Login en maak een selfie</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-xs">
              Je selfie blijft anoniem! We gebruiken deze om jouw uitstraling vast te leggen, zodat Flori kan zoeken naar mensen die passen bij wat jij aantrekkelijk vindt.
            </p>
            <p className="font-caveat text-lg text-primary">Privacy staat voorop!</p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center">
            <img src={chatBubbleHeart} alt="" className="w-20 h-20 object-contain mb-4" />
            <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg mb-4">2</div>
            <h3 className="text-xl font-bold text-foreground mb-2">Chat met onze speelse AI bot Flori</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-xs">
              Chat met Flori, onze speelse AI matchmaker. Vertel over jezelf, wat je leuk vindt, wat je belangrijk vindt in een ander en wat jou uniek maakt.
            </p>
            <p className="font-caveat text-lg text-primary">Slim en verrassend</p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center">
            <img src={aiHeartChip} alt="" className="w-20 h-20 object-contain mb-4" />
            <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg mb-4">3</div>
            <h3 className="text-xl font-bold text-foreground mb-2">Jouw perfecte match wordt gezocht</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-xs">
              Jij leeft je leven. Flori zoekt jouw match. Achter de schermen wordt jouw profiel vergeleken met anderen op zoek naar die ene onverwachte klik.
            </p>
            <p className="font-caveat text-lg text-primary">Flori gaat voor je aan het werk</p>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center">
            <img src={matchCelebration} alt="" className="w-20 h-20 object-contain mb-4" />
            <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg mb-4">4</div>
            <h3 className="text-xl font-bold text-foreground mb-2">Een match! Ga het avontuur aan</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-xs">
              Is er een match dan ontvang je een uitnodiging voor een drankje bij een leuke lokale plek: een echte blind date.
            </p>
            <p className="font-caveat text-lg text-primary">Gaan jullie voor de blind date?</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RouteSection;
