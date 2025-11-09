import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  firstName: z.string().min(2, "Voornaam moet minimaal 2 tekens bevatten").max(50, "Voornaam mag maximaal 50 tekens bevatten"),
  dateOfBirth: z.string().refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 18 && age <= 100;
  }, "Je moet tussen de 18 en 100 jaar oud zijn"),
});

const CompleteProfile = () => {
  const [firstName, setFirstName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/register");
      }
    };
    checkAuth();
  }, [navigate]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5242880) {
        toast({
          title: "Bestand te groot",
          description: "De foto mag maximaal 5MB zijn.",
          variant: "destructive",
        });
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({
          title: "Ongeldig bestandstype",
          description: "Alleen JPG, PNG en WEBP afbeeldingen zijn toegestaan.",
          variant: "destructive",
        });
        return;
      }
      setPhoto(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = profileSchema.safeParse({ firstName, dateOfBirth });
      
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

      if (!photo) {
        toast({
          title: "Foto vereist",
          description: "Upload een profielfoto om door te gaan.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Niet ingelogd");

      setAnalyzing(true);

      // Upload photo to temporary storage
      const fileExt = photo.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-photos-temp')
        .upload(fileName, photo);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos-temp')
        .getPublicUrl(fileName);

      // Call n8n webhook for photo analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-photo', {
        body: {
          photoUrl: publicUrl,
          userId: user.id,
          firstName,
          dateOfBirth,
        }
      });

      if (analysisError) throw analysisError;

      toast({
        title: "Profiel succesvol aangemaakt!",
        description: "Je foto is geanalyseerd en veilig verwijderd.",
      });

      navigate("/chat");
    } catch (error: any) {
      console.error("Profile completion error:", error);
      toast({
        title: "Er ging iets mis",
        description: error.message || "Probeer het opnieuw.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Maak je profiel compleet</h1>
          <p className="text-muted-foreground">
            Vertel ons meer over jezelf
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Voornaam</Label>
            <Input
              id="firstName"
              type="text"
              placeholder="Je voornaam"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Geboortedatum</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Profielfoto</Label>
            <div className="flex items-center gap-4">
              <Input
                id="photo"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photo')?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {photo ? photo.name : "Upload foto"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Je foto wordt alleen gebruikt voor AI-analyse en wordt direct daarna verwijderd.
            </p>
          </div>

          {analyzing && (
            <div className="bg-primary/10 p-4 rounded-lg flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Foto wordt geanalyseerd...</p>
                <p className="text-muted-foreground">Dit kan even duren</p>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Bezig...
              </>
            ) : (
              "Profiel voltooien"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CompleteProfile;
