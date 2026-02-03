import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * API Verify Route
 * This route is called when user clicks the verification link in their email.
 * It verifies the email and redirects to /verify which will detect the verification
 * and redirect to profile-setup.
 * 
 * This ensures everything happens in ONE tab.
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
          
          // Check if already verified
          if (error.message?.includes("already") && error.message?.includes("verified")) {
            // Already verified - just redirect to profile-setup
            navigate("/profile-setup", { replace: true });
            return;
          }
          
          // Other error - go back to verify with error
          navigate("/verify?error=verification_failed", { replace: true });
          return;
        }

        if (!data.user) {
          console.error("No user returned after verification");
          navigate("/verify?error=verification_failed", { replace: true });
          return;
        }

        console.log("Email verified successfully!");

        // Clear the pending email
        sessionStorage.removeItem("pendingVerificationEmail");

        // Set a flag that verification just completed
        sessionStorage.setItem("justVerified", "true");

        // Redirect to /verify which will immediately detect verification
        // and redirect to profile-setup
        navigate("/verify", { replace: true });

      } catch (error) {
        console.error("Unexpected error:", error);
        navigate("/verify?error=unexpected_error", { replace: true });
      }
    };

    handleVerification();
  }, [searchParams, navigate]);

  // Show loading state while verifying
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Email verifiëren...</p>
      </div>
    </div>
  );
};

export default ApiVerify;
