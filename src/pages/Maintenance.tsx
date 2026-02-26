import { Helmet } from "react-helmet-async";

const Maintenance = () => {
  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <meta httpEquiv="Retry-After" content="3600" />
        <title>Onderhoud – indebuurt ontmoet</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,10%,97%)] px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-[hsl(220,15%,20%)] mb-4">
            Flori is currently undergoing maintenance.
          </h1>
          <p className="text-base text-[hsl(220,10%,45%)]">
            We will be back shortly.
          </p>
        </div>
      </div>
    </>
  );
};

export default Maintenance;
