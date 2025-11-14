import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welkom terug!",
          description: "Je bent succesvol ingelogd.",
        });
        navigate("/chat");
      } else {
        const redirectUrl = `${window.location.origin}/chat`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              username: username,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Account aangemaakt!",
          description: "Check je email om je account te bevestigen.",
        });
      }
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Heart className="w-8 h-8 text-primary fill-primary" />
          </div>
          <h1 className="text-3xl font-bold">
            {isLogin ? "Inloggen" : "Registreren"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin
              ? "Log in om verder te gaan met Agent Flori"
              : "Maak een account aan om te beginnen"}
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? "Bezig..." : isLogin ? "Inloggen" : "Registreren"}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin
              ? "Nog geen account? Registreer hier"
              : "Heb je al een account? Log in"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
