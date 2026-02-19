import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, UserCircle, Eye, EyeOff } from "lucide-react";
import Footer from "@/components/Footer";
import { getPostAuthRoute } from "@/lib/getPostAuthRoute";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Handle invalid credentials / unregistered user
          if (error.message === "Invalid login credentials") {
            toast({
              title: "Inloggen mislukt",
              description: "Ongeldig e-mailadres of wachtwoord. Heb je al een account?",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
          throw error;
        }

        // Check if email is verified
        if (!data.user?.email_confirmed_at) {
          toast({
            title: "Email niet geverifieerd",
            description: "Controleer je inbox en verifieer je email om door te gaan.",
          });
          sessionStorage.setItem("pendingVerificationEmail", email);
          navigate("/verify");
          return;
        }

        const route = await getPostAuthRoute(data.user!.id);
        navigate(route);

        toast({
          title: "Welkom terug!",
          description: "Je bent succesvol ingelogd.",
        });
      } else {
        // Validate password match
        if (password !== confirmPassword) {
          toast({
            title: "Wachtwoorden komen niet overeen",
            description: "Controleer of beide wachtwoorden hetzelfde zijn.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Sign up flow
        console.log("Starting signup process...");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username,
            },
          },
        });

        if (error) {
          console.error("Signup error:", error);
          throw error;
        }

        console.log("Signup response:", data);

        // Send custom verification email via edge function
        try {
          const baseUrl = window.location.origin;
          const response = await supabase.functions.invoke("send-verification-email", {
            body: {
              email,
              redirectUrl: `${baseUrl}/api-verify`,
            },
          });
          console.log("Verification email response:", response);
          if (response.error) {
            console.error("Failed to send verification email:", response.error);
          }
        } catch (emailError) {
          console.error("Error calling send-verification-email:", emailError);
        }

        // Store email for verification screen display
        sessionStorage.setItem("pendingVerificationEmail", email);

        toast({
          title: "Bijna klaar!",
          description: "Check je email om je account te verifiëren.",
        });

        navigate("/verify");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!showGuestInput) {
      setShowGuestInput(true);
      return;
    }

    if (!guestEmail || !guestEmail.includes("@")) {
      toast({
        title: "Fout",
        description: "Voer een geldig emailadres in",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const guestId = crypto.randomUUID();
      const guestUsername = `Gast_${guestId.slice(0, 8)}`;
      const guestPassword = crypto.randomUUID();

      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
        options: {
          data: {
            username: guestUsername,
          },
        },
      });

      if (error) throw error;

      // Auto sign in after signup (no email verification for guests)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: guestEmail,
        password: guestPassword,
      });

      if (signInError) throw signInError;

      toast({
        title: "Welkom!",
        description: `Je bent ingelogd als gast`,
      });
      navigate("/profile-setup");
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
        <Card className="w-full max-w-md p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-primary fill-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">{isLogin ? "Inloggen" : "Registreren"}</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              {isLogin ? "Log in om verder te gaan met Matchmaker Flori" : "Maak een account aan om te beginnen"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Gebruikersnaam</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Jouw naam"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.nl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Herhaal wachtwoord</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">Wachtwoorden komen niet overeen</p>
                )}
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      toast({
                        title: "Vul je email in",
                        description: "Voer eerst je emailadres in om je wachtwoord te resetten.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setLoading(true);
                    try {
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) throw error;
                      toast({
                        title: "Email verzonden",
                        description: "Check je inbox voor de wachtwoord reset link.",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Fout",
                        description: error.message,
                        variant: "destructive",
                      });
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Wachtwoord vergeten?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? "Bezig..." : isLogin ? "Inloggen" : "Registreren"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Of</span>
            </div>
          </div>

          {showGuestInput && (
            <div className="space-y-2 mb-4">
              <Label htmlFor="guestEmail">Email voor gast account</Label>
              <Input
                id="guestEmail"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="jouw@email.nl"
                required
              />
            </div>
          )}

          {/* <Button onClick={handleGuestLogin} variant="outline" className="w-full" disabled={loading}>
            <UserCircle className="mr-2 h-4 w-4" />
            {showGuestInput ? "Bevestig & doorgaan" : "Doorgaan als gast"}
          </Button> */}

          <div className="text-center mt-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "Nog geen account? Registreer hier" : "Heb je al een account? Log in"}
            </button>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
