import selfieHeart from "@/assets/illustrations/selfie-heart-new.png";
import chatBubbleHeart from "@/assets/illustrations/chat-bubble-heart.png";
import aiHeartChip from "@/assets/illustrations/ai-heart-chip-new.png";
import matchCelebration from "@/assets/illustrations/match-celebration.png";

const RouteSection = () => {
  return (
    <section className="py-16 md:py-24 px-4 md:px-8 relative overflow-hidden">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-foreground mb-16 md:mb-20">
          De route
        </h2>

        {/* Steps container with curved path */}
        <div className="relative">
          {/* SVG curved path connecting the dots - Desktop */}
          <svg
            className="absolute left-1/2 -translate-x-1/2 top-0 w-[300px] h-full pointer-events-none hidden md:block"
            viewBox="0 0 300 1100"
            preserveAspectRatio="xMidYMin meet"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M150 20 
                 Q150 40, 180 80
                 Q220 140, 200 200
                 Q180 260, 100 280
                 Q40 300, 60 360
                 Q80 420, 150 460
                 Q220 500, 200 560
                 Q180 620, 100 660
                 Q40 700, 60 760
                 Q80 820, 150 860
                 Q200 890, 150 940
                 Q100 990, 100 1040"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          </svg>

          {/* Step 1 */}
          <div className="relative mb-20 md:mb-28">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-0">
              {/* Text - Left side */}
              <div className="flex-1 text-center md:text-right md:pr-8 order-2 md:order-1">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  Login en<br />maak een selfie
                </h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xs mx-auto md:ml-auto md:mr-0">
                  Je selfie blijft anoniem! We gebruiken deze om jouw uitstraling vast te leggen, zodat Flori kan zoeken naar mensen die passen bij wat jij aantrekkelijk vindt.
                </p>
                <p className="font-caveat text-xl text-primary" style={{ transform: 'rotate(-2deg)' }}>
                  Privacy staat voorop!
                </p>
              </div>

              {/* Number dot - Center */}
              <div className="w-10 h-10 md:w-11 md:h-11 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 z-10 order-1 md:order-2">
                1
              </div>

              {/* Image - Right side */}
              <div className="flex-1 flex justify-center md:justify-start md:pl-8 order-3">
                <img
                  src={selfieHeart}
                  alt=""
                  className="w-28 h-28 md:w-32 md:h-32 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative mb-20 md:mb-28">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-0">
              {/* Image - Left side */}
              <div className="flex-1 flex justify-center md:justify-end md:pr-8 order-1">
                <img
                  src={chatBubbleHeart}
                  alt=""
                  className="w-24 h-24 md:w-28 md:h-28 object-contain"
                />
              </div>

              {/* Number dot - Center */}
              <div className="w-10 h-10 md:w-11 md:h-11 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 z-10 order-2">
                2
              </div>

              {/* Text - Right side */}
              <div className="flex-1 text-center md:text-left md:pl-8 order-3">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  Chat met onze<br />speelse AI bot Flori
                </h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xs mx-auto md:mx-0">
                  Chat met Flori, onze speelse AI matchmaker. Vertel over jezelf, wat je leuk vindt, wat je belangrijk vindt in een ander en wat jou uniek maakt. Flori analyseert jouw antwoorden en bouwt daarmee jouw persoonlijke profiel op.
                </p>
                <p className="font-caveat text-xl text-primary" style={{ transform: 'rotate(-2deg)' }}>
                  Slim en verrassend
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative mb-20 md:mb-28">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-0">
              {/* Text - Left side */}
              <div className="flex-1 text-center md:text-right md:pr-8 order-2 md:order-1">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  Jouw perfecte<br />match wordt gezocht
                </h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xs mx-auto md:ml-auto md:mr-0">
                  Jij leeft je leven. Flori zoekt jouw match. Achter de schermen wordt jouw profiel vergeleken met anderen op zoek naar die ene onverwachte klik. Je hoeft alleen maar te wachten tot het moment daar is. Altijd met respect voor jouw privacy.
                </p>
                <p className="font-caveat text-xl text-primary" style={{ transform: 'rotate(-2deg)' }}>
                  Flori gaat voor je aan het werk
                </p>
              </div>

              {/* Number dot - Center */}
              <div className="w-10 h-10 md:w-11 md:h-11 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 z-10 order-1 md:order-2">
                3
              </div>

              {/* Image - Right side */}
              <div className="flex-1 flex justify-center md:justify-start md:pl-8 order-3">
                <img
                  src={aiHeartChip}
                  alt=""
                  className="w-28 h-28 md:w-32 md:h-32 object-contain"
                />
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-0">
              {/* Image - Left side */}
              <div className="flex-1 flex justify-center md:justify-end md:pr-8 order-1">
                <img
                  src={matchCelebration}
                  alt=""
                  className="w-28 h-28 md:w-32 md:h-32 object-contain"
                />
              </div>

              {/* Number dot - Center */}
              <div className="w-10 h-10 md:w-11 md:h-11 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 z-10 order-2">
                4
              </div>

              {/* Text - Right side */}
              <div className="flex-1 text-center md:text-left md:pl-8 order-3">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                  Een match!<br />Ga het avontuur aan
                </h3>
                <p className="text-sm text-muted-foreground mb-3 max-w-xs mx-auto md:mx-0">
                  Is er een match dan ontvang je een uitnodiging voor een drankje bij een leuke lokale plek: een echte blind date. Vind je dat een stap te ver dan kun je natuurlijk eerst contactgegevens uitwisselen en elkaar rustig leren kennen.
                </p>
                <p className="font-caveat text-xl text-primary" style={{ transform: 'rotate(-2deg)' }}>
                  Gaan jullie voor de blind date?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RouteSection;
