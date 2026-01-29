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
        <div className="hidden md:block relative" style={{ height: '1400px' }}>
          {/* SVG curved path - smooth S-curve */}
          <svg
            className="absolute left-1/2 -translate-x-1/2 top-0 w-full h-full pointer-events-none"
            viewBox="0 0 800 1400"
            preserveAspectRatio="xMidYMin meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M400 0
                 C400 100, 550 150, 550 250
                 C550 400, 250 500, 250 700
                 C250 900, 550 1000, 550 1150
                 C550 1300, 400 1350, 400 1400"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Step 1 - Text LEFT, Number CENTER-RIGHT, Image RIGHT */}
          <div className="absolute" style={{ top: '40px', left: '0', right: '0' }}>
            {/* Text block - LEFT side */}
            <div className="absolute text-left" style={{ left: '60px', top: '0', width: '280px' }}>
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

            {/* Number badge - on the line */}
            <div className="absolute" style={{ left: '50%', transform: 'translateX(30px)', top: '20px' }}>
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
            </div>

            {/* Illustration - RIGHT side */}
            <div className="absolute" style={{ right: '80px', top: '-20px' }}>
              <img
                src={selfieHeart}
                alt=""
                className="w-28 h-28 object-contain"
              />
            </div>
          </div>

          {/* Step 2 - Image LEFT, Number CENTER-LEFT, Text RIGHT */}
          <div className="absolute" style={{ top: '340px', left: '0', right: '0' }}>
            {/* Illustration - LEFT side */}
            <div className="absolute" style={{ left: '100px', top: '-30px' }}>
              <img
                src={chatBubbleHeart}
                alt=""
                className="w-24 h-24 object-contain"
              />
            </div>

            {/* Number badge - on the line */}
            <div className="absolute" style={{ left: '50%', transform: 'translateX(-70px)', top: '60px' }}>
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
            </div>

            {/* Text block - RIGHT side */}
            <div className="absolute text-left" style={{ right: '60px', top: '0', width: '300px' }}>
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

          {/* Step 3 - Text LEFT, Number CENTER-RIGHT, Image RIGHT */}
          <div className="absolute" style={{ top: '700px', left: '0', right: '0' }}>
            {/* Text block - LEFT side */}
            <div className="absolute text-left" style={{ left: '60px', top: '0', width: '280px' }}>
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

            {/* Number badge - on the line */}
            <div className="absolute" style={{ left: '50%', transform: 'translateX(30px)', top: '80px' }}>
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
            </div>

            {/* Illustration - RIGHT side */}
            <div className="absolute" style={{ right: '80px', top: '0' }}>
              <img
                src={aiHeartChip}
                alt=""
                className="w-28 h-28 object-contain"
              />
            </div>
          </div>

          {/* Step 4 - Image LEFT, Number CENTER-LEFT, Text RIGHT */}
          <div className="absolute" style={{ top: '1050px', left: '0', right: '0' }}>
            {/* Illustration - LEFT side */}
            <div className="absolute" style={{ left: '80px', top: '0' }}>
              <img
                src={matchCelebration}
                alt=""
                className="w-28 h-28 object-contain"
              />
            </div>

            {/* Number badge - on the line */}
            <div className="absolute" style={{ left: '50%', transform: 'translateX(-70px)', top: '50px' }}>
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-xl">
                4
              </div>
            </div>

            {/* Text block - RIGHT side */}
            <div className="absolute text-left" style={{ right: '60px', top: '0', width: '300px' }}>
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
