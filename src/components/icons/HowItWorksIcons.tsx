// Hand-drawn style icons matching the Indebuurt Ontmoet design

export const SelfieIcon = () => (
  <svg viewBox="0 0 120 120" className="w-full h-full">
    {/* Hearts floating above */}
    <path d="M85 8 C88 4, 94 4, 97 8 C100 12, 100 18, 97 22 L91 28 L85 22 C82 18, 82 12, 85 8" 
      fill="hsl(var(--primary))" stroke="none" />
    <path d="M100 18 C102 15, 106 15, 108 18 C110 21, 110 25, 108 28 L104 32 L100 28 C98 25, 98 21, 100 18" 
      fill="hsl(var(--primary))" stroke="none" />
    
    {/* Person's head */}
    <ellipse cx="45" cy="50" rx="20" ry="24" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
    
    {/* Hair/curly top */}
    <path d="M30 38 Q25 30, 35 28 Q40 22, 50 25 Q60 22, 65 30 Q70 38, 62 42" 
      fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" />
    
    {/* Eyes */}
    <circle cx="38" cy="48" r="2.5" fill="hsl(var(--foreground))" />
    <circle cx="52" cy="48" r="2.5" fill="hsl(var(--foreground))" />
    
    {/* Smile */}
    <path d="M38 58 Q45 65, 52 58" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    
    {/* Neck and body */}
    <path d="M40 74 L40 85 Q30 90, 25 100" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M50 74 L50 85 Q60 88, 65 95" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    
    {/* Arm holding phone */}
    <path d="M65 95 Q75 85, 80 75" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    
    {/* Phone in hand */}
    <rect x="75" y="55" width="18" height="28" rx="3" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
    <rect x="78" y="60" width="12" height="18" fill="none" stroke="hsl(var(--foreground))" strokeWidth="1" />
    
    {/* Small heart on phone */}
    <path d="M82 65 C83 63, 85 63, 86 65 C87 67, 86 69, 84 71 C82 69, 81 67, 82 65" 
      fill="hsl(var(--primary))" stroke="none" />
  </svg>
);

export const ChatPhoneIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    {/* Heart on top */}
    <path d="M45 8 C48 2, 56 2, 59 8 C62 14, 60 22, 52 28 C44 22, 42 14, 45 8" 
      fill="hsl(var(--primary))" stroke="none" />
    
    {/* Phone/device body - rounded rectangle like chat bubble */}
    <path d="M25 35 L75 35 Q80 35, 80 40 L80 85 Q80 90, 75 90 L55 90 L50 98 L45 90 L25 90 Q20 90, 20 85 L20 40 Q20 35, 25 35" 
      fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    
    {/* Chat lines inside */}
    <line x1="30" y1="50" x2="55" y2="50" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    <line x1="30" y1="60" x2="70" y2="60" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
    <line x1="30" y1="70" x2="60" y2="70" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const MatchEnvelopesIcon = () => (
  <svg viewBox="0 0 120 100" className="w-full h-full">
    {/* Left envelope - tilted */}
    <g transform="rotate(-15, 40, 55)">
      <rect x="15" y="35" width="50" height="40" rx="2" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
      <path d="M15 38 L40 58 L65 38" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    
    {/* Right envelope - tilted opposite */}
    <g transform="rotate(15, 80, 55)">
      <rect x="55" y="35" width="50" height="40" rx="2" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
      <path d="M55 38 L80 58 L105 38" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    
    {/* Heart in center */}
    <path d="M55 45 C58 38, 68 38, 71 45 C74 52, 70 62, 63 70 C56 62, 52 52, 55 45" 
      fill="hsl(var(--primary))" stroke="none" />
    
    {/* Small hearts floating */}
    <path d="M45 20 C46 17, 49 17, 50 20 C51 23, 50 26, 47.5 29 C45 26, 44 23, 45 20" 
      fill="hsl(var(--primary))" stroke="none" />
    <path d="M75 15 C76 12, 79 12, 80 15 C81 18, 80 21, 77.5 24 C75 21, 74 18, 75 15" 
      fill="hsl(var(--primary))" stroke="none" />
  </svg>
);

export const DancingPersonIcon = () => (
  <svg viewBox="0 0 100 120" className="w-full h-full">
    {/* Heart above head */}
    <path d="M50 5 C54 -2, 64 -2, 68 5 C72 12, 68 22, 59 30 C50 22, 46 12, 50 5" 
      fill="hsl(var(--primary))" stroke="none" />
    
    {/* Head */}
    <circle cx="55" cy="45" r="12" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
    
    {/* Body - curved line suggesting movement */}
    <path d="M55 57 Q58 70, 50 85" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    
    {/* Left arm up - celebrating */}
    <path d="M55 62 Q35 55, 25 35" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Left hand */}
    <circle cx="23" cy="33" r="4" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
    
    {/* Right arm up - celebrating */}
    <path d="M55 62 Q75 50, 80 35" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    {/* Right hand */}
    <circle cx="82" cy="33" r="4" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
    
    {/* Left leg - jumping pose */}
    <path d="M50 85 Q35 95, 25 110" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    
    {/* Right leg - bent back */}
    <path d="M50 85 Q65 90, 75 80" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    
    {/* Small decorative lines suggesting movement */}
    <path d="M15 45 L20 45" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M85 55 L90 55" stroke="hsl(var(--foreground))" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const HeartIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full">
    {/* Main heart with cute face */}
    <path d="M30 55 C15 42, 5 30, 5 18 C5 8, 15 2, 25 8 C28 10, 30 14, 30 14 C30 14, 32 10, 35 8 C45 2, 55 8, 55 18 C55 30, 45 42, 30 55" 
      fill="hsl(var(--primary))" stroke="none" />
    
    {/* Cute closed eyes */}
    <path d="M20 24 Q23 20, 26 24" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round" fill="none" />
    <path d="M34 24 Q37 20, 40 24" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round" fill="none" />
    
    {/* Small smile */}
    <path d="M26 34 Q30 38, 34 34" stroke="hsl(var(--background))" strokeWidth="2" strokeLinecap="round" fill="none" />
    
    {/* Small hearts floating around */}
    <path d="M50 8 C51 5, 54 5, 55 8 C56 11, 55 14, 52.5 16 C50 14, 49 11, 50 8" 
      fill="hsl(var(--primary))" stroke="none" opacity="0.7" />
  </svg>
);

export const LogoHeart = () => (
  <svg viewBox="0 0 60 70" className="w-full h-full">
    {/* Main heart outline */}
    <path d="M30 60 C12 45, 2 32, 2 18 C2 6, 14 0, 24 6 C28 9, 30 14, 30 14 C30 14, 32 9, 36 6 C46 0, 58 6, 58 18 C58 32, 48 45, 30 60" 
      fill="hsl(var(--primary))" stroke="none" />
    
    {/* Inner heart cutout/design */}
    <path d="M30 50 C18 40, 12 32, 12 22 C12 14, 20 10, 26 14 C28 16, 30 19, 30 19 C30 19, 32 16, 34 14 C40 10, 48 14, 48 22 C48 32, 42 40, 30 50" 
      fill="hsl(var(--background))" stroke="none" />
    
    {/* Small floating hearts */}
    <path d="M48 5 C49 2, 52 2, 53 5 C54 8, 53 11, 50.5 13 C48 11, 47 8, 48 5" 
      fill="hsl(var(--primary))" stroke="none" />
    <path d="M55 12 C55.5 10, 57.5 10, 58 12 C58.5 14, 58 16, 56.5 17.5 C55 16, 54.5 14, 55 12" 
      fill="hsl(var(--primary))" stroke="none" />
  </svg>
);

export const DecorativeSwirl = () => (
  <svg viewBox="0 0 150 40" className="w-full h-full">
    <path 
      d="M5 20 Q25 5, 45 20 Q65 35, 85 20 Q105 5, 125 20 Q145 35, 145 20" 
      fill="none" 
      stroke="hsl(var(--foreground))" 
      strokeWidth="2" 
      strokeLinecap="round"
      opacity="0.3"
    />
  </svg>
);
