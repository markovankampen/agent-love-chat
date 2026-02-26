import { Helmet } from "react-helmet-async";
import floriLogo from "@/assets/flori-logo.png";
import heartRedGlow from "@/assets/illustrations/heart-red-glow.png";
import IndebuurtOntmoet from "@/assets/Indebuurt_Ontmoet_Logo_FC_CMYK.png";

const Maintenance = () => {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="Retry-After" content="3600" />
        <title>Onderhoud – indebuurt ontmoet</title>
      </Helmet>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(220,10%,97%)] px-4 relative overflow-hidden">
        {/* Decorative background circles */}
        <div
          className="absolute top-[-120px] right-[-80px] w-[300px] h-[300px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, hsl(245 85% 60%), transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-100px] left-[-60px] w-[250px] h-[250px] rounded-full opacity-[0.05]"
          style={{ background: "radial-gradient(circle, hsl(245 85% 60%), transparent 70%)" }}
        />

        {/* Content card */}
        <div className="text-center max-w-md z-10">
          {/* Flori mascot */}
          <div className="flex justify-center mb-6">
            <img
              src={floriLogo}
              alt="Flori"
              className="w-28 h-28 md:w-36 md:h-36 object-contain"
            />
          </div>

          {/* Decorative heart accent */}
          <div className="flex justify-center mb-4">
            <img src={heartRedGlow} alt="" className="w-8 h-8 object-contain opacity-80" />
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold text-[hsl(220,15%,20%)] mb-3 leading-snug">
            Flori is currently undergoing maintenance.
          </h1>

          <p className="text-base md:text-lg text-[hsl(220,10%,45%)] mb-8">
            We will be back shortly.
          </p>

          {/* Subtle divider */}
          <div className="w-16 h-[2px] bg-[hsl(245,85%,60%)] opacity-30 mx-auto mb-8 rounded-full" />

          {/* Logo */}
          <div className="flex justify-center">
            <img
              src={IndebuurtOntmoet}
              alt="indebuurt ontmoet"
              className="w-16 h-16 object-contain opacity-60"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default Maintenance;
