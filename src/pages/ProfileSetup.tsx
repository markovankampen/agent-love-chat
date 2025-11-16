import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Camera } from "lucide-react";

const ProfileSetup = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Bestand te groot",
          description: "Upload een foto kleiner dan 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSkip = async () => {
    if (!userId || !dateOfBirth) {
      toast({
        title: "Vul je geboortedatum in",
        description: "Geboortedatum is verplicht",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Update only date of birth without photo or name
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          date_of_birth: dateOfBirth,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      toast({
        title: "Opgeslagen!",
        description: "Je wordt doorgestuurd naar de chat...",
      });

      setTimeout(() => {
        navigate("/chat");
      }, 1000);

    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Er ging iets mis",
        description: error.message || "Probeer het opnieuw",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !firstName || !dateOfBirth) {
      toast({
        title: "Vul alle velden in",
        description: "Voer je naam en geboortedatum in",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Upload een foto",
        description: "Upload een foto of klik op 'Overslaan'",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload photo to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos-temp')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos-temp')
        .getPublicUrl(fileName);

      setUploading(false);
      setAnalyzing(true);

      // Call analyze-photo function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-photo', {
        body: {
          photoUrl: publicUrl,
          userId,
          firstName,
          dateOfBirth,
        },
      });

      if (analysisError) throw analysisError;

      toast({
        title: "Profiel succesvol aangemaakt!",
        description: "Je wordt doorgestuurd naar de chat...",
      });

      setTimeout(() => {
        navigate("/chat");
      }, 1500);

    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Er ging iets mis",
        description: error.message || "Probeer het opnieuw",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Stel je profiel in</h1>
          <p className="text-muted-foreground">
            Upload een foto en vertel ons over jezelf
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Voornaam (optioneel)</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Je voornaam"
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
            <Label htmlFor="photo">Profielfoto (optioneel)</Label>
            <div className="flex flex-col gap-4">
              {previewUrl && (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              disabled={uploading || analyzing}
            >
              Overslaan
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={uploading || analyzing}
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? "Uploaden..." : analyzing ? "Analyseren..." : "Voltooien"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProfileSetup;
