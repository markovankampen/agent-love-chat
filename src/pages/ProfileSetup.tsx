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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !dateOfBirth) {
      toast({
        title: "Vul je geboortedatum in",
        description: "Geboortedatum is verplicht",
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "Upload een foto",
        description: "Upload een foto om door te gaan",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      toast({
        title: "Foto uploaden...",
        description: "Je foto wordt geüpload naar de server",
      });

      // Upload photo to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos-temp')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Fout bij uploaden van foto. Controleer je internetverbinding en probeer opnieuw.");
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos-temp')
        .getPublicUrl(fileName);

      setUploading(false);
      setAnalyzing(true);

      toast({
        title: "Foto analyseren...",
        description: "Je foto wordt geanalyseerd. Dit kan even duren.",
      });

      // Call analyze-photo function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-photo', {
        body: {
          photoUrl: publicUrl,
          userId,
          firstName,
          dateOfBirth,
        },
      });

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        throw new Error(analysisError.message || "Fout bij analyseren van foto");
      }

      // Check if the response contains an error
      if (analysisData?.error) {
        throw new Error(analysisData.error);
      }

      setAnalyzing(false);

      toast({
        title: "Analyse voltooid!",
        description: "Je profiel is succesvol ingesteld. Je wordt doorgestuurd naar de chat...",
      });

      setTimeout(() => {
        navigate("/chat");
      }, 1500);

    } catch (error: any) {
      console.error("Error:", error);
      
      // Determine the most appropriate error message
      let errorTitle = "Er ging iets mis";
      let errorDescription = error.message || "Probeer het opnieuw";
      
      // Handle specific error cases
      if (error.message?.includes("face")) {
        errorTitle = "Geen gezicht gevonden";
        errorDescription = "Upload een duidelijke foto met je gezicht erop";
      } else if (error.message?.includes("timeout") || error.message?.includes("timed out")) {
        errorTitle = "Time-out";
        errorDescription = "De analyse duurde te lang. Probeer een kleinere foto";
      } else if (error.message?.includes("network") || error.message?.includes("verbinding")) {
        errorTitle = "Verbindingsprobleem";
        errorDescription = "Controleer je internetverbinding en probeer opnieuw";
      } else if (error.message?.includes("authentication") || error.message?.includes("Unauthorized")) {
        errorTitle = "Authenticatie mislukt";
        errorDescription = "Log opnieuw in en probeer het nog een keer";
      }

      toast({
        title: errorTitle,
        description: errorDescription,
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
            <Label htmlFor="photo">Profielfoto</Label>
            <div className="flex flex-col gap-4">
              {previewUrl && (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className={`w-full h-full object-cover transition-all duration-300 ${
                      analyzing ? 'blur-md brightness-75' : ''
                    }`}
                  />
                  {analyzing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm font-medium text-foreground">Foto wordt geanalyseerd...</p>
                    </div>
                  )}
                </div>
              )}
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
                disabled={analyzing}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={uploading || analyzing || !selectedFile}
          >
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {analyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? "Uploaden..." : analyzing ? "Analyseren..." : "Doorgaan"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ProfileSetup;
