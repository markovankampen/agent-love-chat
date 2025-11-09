import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens bevatten"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = registerSchema.safeParse({ email, password, confirmPassword });
      
      if (!result.success) {
        const error = result.error.errors[0];
        toast({
          title: "Validatiefout",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/complete-profile`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account bestaat al",
            description: "Dit e-mailadres is al geregistreerd. Probeer in te loggen.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Registratie succesvol!",
          description: "Check je e-mail om je account te verifiëren.",
        });
        navigate("/verify-email");
      }
    } catch (error: any) {
      toast({
        title: "Registratie mislukt",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Agent Flori</h1>
          <p className="text-muted-foreground">Maak een account aan</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              placeholder="naam@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimaal 8 tekens"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Herhaal je wachtwoord"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Bezig met registreren..." : "Registreren"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Heb je al een account?{" "}
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={() => navigate("/auth")}
          >
            Log hier in
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Register;
