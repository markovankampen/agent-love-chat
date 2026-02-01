import selfieHeart from "@/assets/illustrations/selfie-heart-new.png";
import chatBubbleHeart from "@/assets/illustrations/chat-bubble-heart.png";
import aiHeartChip from "@/assets/illustrations/ai-heart-chip-new.png";
import matchCelebration from "@/assets/illustrations/match-celebration.png";

const RouteSection = () => {
  return (
    <section className="py-16 md:py-24 px-4 md:px-8 relative overflow-hidden mb-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center text-foreground mb-16 md:mb-20">
          De route
        </h2>

        {/* Desktop layout with curved path */}
        <div className="hidden md:block relative" style={{ height: "1300px" }}>
          {/* SVG curved path - smooth S-curve down the center */}
          {/* className="absolute left-0 top-0 w-full h-full pointer-events-none" */}
          <svg
            className="absolute -left-20 top-0 w-full h-[1250px] pointer-events-none"
            viewBox="0 0 400 1200"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
          >
            <path
              d="
      M270 40
      C300 150, 300 280, 220 360
      C120 460, 20 530, 220 700
      C330 780, 420 880, 220 1050
      C60 1170, 290 1580, 160 1220
    "
              stroke="#ef4444"
              stroke-width="6"
              stroke-linecap="round"
            />
          </svg>

          {/* Step 1 - Text LEFT, Number on curve, Icon RIGHT */}
          <div className="absolute" style={{ top: "0px", left: "0", right: "0" }}>
            {/* Text block - LEFT side */}
            <div className="absolute" style={{ left: "120px", top: "0px", width: "280px" }}>
              <h3 className="text-[25px] font-semibold text-black mb-2 leading-tight font-sans text-center ">
                Login en
                <br />
                maak een selfie
              </h3>
              <p className="text-xs text-black -mb-1 leading-relaxed text-center">
                Je selfie blijft anoniem! We gebruiken deze om jouw uitstraling vast te leggen, zodat Flori kan zoeken
                naar mensen die passen bij wat jij aantrekkelijk vindt.
              </p>
              <p className="font-caveat text-[#2e2e2e] font-semibold text-2xl text-primary italic text-center">Privacy staat voorop!</p>
            </div>

            {/* Number badge - ON the curve */}
            <div className="absolute" style={{ left: "49.5%", transform: "translateX(-20px)", top: "30px" }}>
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl relative z-10">
                1
              </div>
            </div>

            {/* Illustration - RIGHT side */}
            <div className="absolute" style={{ right: "280px", top: "-20px" }}>
              <img
                src={selfieHeart}
                alt=""
                className="w-32 h-32 object-contain"
                style={{ transform: "scaleX(-1)" }} // this mirrors the image
              />
            </div>
          </div>

          {/* Step 2 - Icon LEFT, Number on curve, Text RIGHT */}
          <div className="absolute" style={{ top: "320px", left: "0", right: "0" }}>
            {/* Illustration - LEFT side */}
            <div className="absolute" style={{ left: "190px", top: "50px" }}>
              <img src={chatBubbleHeart} alt="" className="w-32 h-32 object-contain" />
            </div>

            {/* Number badge - ON the curve */}
            <div className="absolute" style={{ left: "47.8%", transform: "translateX(-180px)", top: "190px" }}>
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl relative z-10">
                2
              </div>
            </div>

            {/* Text block - RIGHT side */}
            <div className="absolute" style={{ right: "270px", top: "110px", width: "300px" }}>
              <h3 className="text-[25px] font-semibold text-black mb-2 leading-tight font-sans text-center">
                Chat met onze
                <br />
                speelse AI bot Flori
              </h3>
              <p className="text-xs text-black -mb-1 leading-relaxed text-center">
                Chat met Flori, onze speelse AI matchmaker. Vertel over jezelf, wat je leuk vindt, wat je belangrijk
                vindt in een ander en wat jou uniek maakt. Flori analyseert jouw antwoorden en bouwt daarmee jouw
                persoonlijke profiel op.
              </p>
              <p className="font-caveat text-[#2e2e2e] font-semibold text-2xl text-primary italic text-center">Slim en verrassend</p>
            </div>
          </div>

          {/* Step 3 - Text LEFT, Number on curve, Icon RIGHT */}
          <div className="absolute" style={{ top: "660px", left: "0", right: "0" }}>
            {/* Text block - LEFT side */}
            <div className="absolute" style={{ left: "150px", top: "140px", width: "280px" }}>
              <h3 className="text-[25px] font-semibold text-black mb-2 leading-tight font-sans text-center">
                Jouw perfecte
                <br />
                match wordt gezocht
              </h3>
              <p className="text-xs text-black -mb-1 leading-relaxed text-center">
                Jij leeft je leven. Flori zoekt jouw match. Achter de schermen wordt jouw profiel vergeleken met anderen
                op zoek naar die ene onverwachte klik. Je hoeft alleen maar te wachten tot het moment daar is. Altijd
                met respect voor jouw privacy.
              </p>
              <p className="font-caveat text-[#2e2e2e] font-semibold text-2xl text-primary italic text-center">Flori gaat voor je aan het werk</p>
            </div>

            {/* Number badge - ON the curve */}
            <div className="absolute" style={{ left: "43.5%", transform: "translateX(100px)", top: "220px" }}>
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl relative z-10">
                3
              </div>
            </div>

            {/* Illustration - RIGHT side */}
            <div className="absolute" style={{ right: "230px", top: "100px" }}>
              <img src={aiHeartChip} alt="" className="w-32 h-32 object-contain" style={{ transform: "rotate(-20deg)" }} />
            </div>
          </div>

          {/* Step 4 - Icon LEFT, Number on curve, Text RIGHT */}
          <div className="absolute" style={{ top: "1000px", left: "0", right: "0" }}>
            {/* Illustration - LEFT side */}
            <div className="absolute" style={{ left: "180px", top: "210px" }}>
              <img src={matchCelebration} alt="" className="w-32 h-32 object-contain" />
            </div>

            {/* Number badge - ON the curve */}
            <div className="absolute" style={{ left: "54%", transform: "translateX(-180px)", top: "230px" }}>
              <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl relative z-10">
                4
              </div>
            </div>

            {/* Text block - RIGHT side */}
            <div className="absolute" style={{ right: "220px", top: "170px", width: "300px" }}>
              <h3 className="text-[25px] font-semibold text-black mb-2 leading-tight font-sans text-center">
                Een match!
                <br />
                Ga het avontuur aan
              </h3>
              <p className="text-xs text-black -mb-1 leading-relaxed text-center">
                Is er een match dan ontvang je een uitnodiging voor een drankje bij een leuke lokale plek: een echte
                blind date. Vind je dat een stap te ver dan kun je natuurlijk eerst contactgegevens uitwisselen en
                elkaar rustig leren kennen.
              </p>
              <p className="font-caveat text-[#2e2e2e] font-semibold text-2xl text-primary italic text-center">Gaan jullie voor de blind date?</p>
            </div>
          </div>
        </div>

        {/* Mobile layout - stacked vertical */}
        <div className="md:hidden space-y-16">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center">
            <img src={selfieHeart} alt="" className="w-20 h-20 object-contain mb-4" />
            <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg mb-4">
              1
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Login en maak een selfie</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-xs">
              Je selfie blijft anoniem! We gebruiken deze om jouw uitstraling vast te leggen, zodat Flori kan zoeken
              naar mensen die passen bij wat jij aantrekkelijk vindt.
            </p>
            <p className="font-caveat text-lg text-primary">Privacy staat voorop!</p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center">
            <img src={chatBubbleHeart} alt="" className="w-20 h-20 object-contain mb-4" />
            <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg mb-4">
              2
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Chat met onze speelse AI bot Flori</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-xs">
              Chat met Flori, onze speelse AI matchmaker. Vertel over jezelf, wat je leuk vindt, wat je belangrijk vindt
              in een ander en wat jou uniek maakt.
            </p>
            <p className="font-caveat text-lg text-primary">Slim en verrassend</p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center">
            <img src={aiHeartChip} alt="" className="w-20 h-20 object-contain mb-4" />
            <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg mb-4">
              3
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Jouw perfecte match wordt gezocht</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-xs">
              Jij leeft je leven. Flori zoekt jouw match. Achter de schermen wordt jouw profiel vergeleken met anderen
              op zoek naar die ene onverwachte klik.
            </p>
            <p className="font-caveat text-lg text-primary">Flori gaat voor je aan het werk</p>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center">
            <img src={matchCelebration} alt="" className="w-20 h-20 object-contain mb-4" />
            <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center font-bold text-lg mb-4">
              4
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Een match! Ga het avontuur aan</h3>
            <p className="text-sm text-muted-foreground mb-2 max-w-xs">
              Is er een match dan ontvang je een uitnodiging voor een drankje bij een leuke lokale plek: een echte blind
              date.
            </p>
            <p className="font-caveat text-lg text-primary">Gaan jullie voor de blind date?</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RouteSection;