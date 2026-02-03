import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * API Verify Route
 * Handles email verification when user clicks link from email.
 * After verification, signals the waiting /verify tab to close.
 */
const ApiVerify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (!tokenHash) {
          console.error("No token_hash found");
          navigate("/verify?error=invalid_link", { replace: true });
          return;
        }

        console.log("Verifying email with token_hash...");

        // Verify the email
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === "signup" ? "signup" : "email",
        });

        if (error) {
          console.error("Verification error:", error);

          if (error.message?.includes("already") && error.message?.includes("verified")) {
            // Already verified - go to profile-setup
            navigate("/profile-setup", { replace: true });
            return;
          }

          navigate("/verify?error=verification_failed", { replace: true });
          return;
        }

        if (!data.user) {
          console.error("No user returned after verification");
          navigate("/verify?error=verification_failed", { replace: true });
          return;
        }

        console.log("Email verified successfully!");

        // Clean up
        sessionStorage.removeItem("pendingVerificationEmail");

        // Signal any waiting /verify tabs to close
        try {
          localStorage.setItem("email_verified_close_tab", "true");
          setTimeout(() => {
            localStorage.removeItem("email_verified_close_tab");
          }, 1000);
        } catch (e) {
          console.log("localStorage not available:", e);
        }

        // Set flag for this tab
        sessionStorage.setItem("justVerified", "true");

        // Redirect to /verify which will immediately redirect to /profile-setup
        navigate("/verify", { replace: true });
      } catch (error) {
        console.error("Unexpected error:", error);
        navigate("/verify?error=unexpected_error", { replace: true });
      }
    };

    handleVerification();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">Email verifiëren...</p>
      </div>
    </div>
  );
};

export default ApiVerify;
