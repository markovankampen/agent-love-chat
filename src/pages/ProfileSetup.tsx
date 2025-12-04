import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, Camera } from "lucide-react";

// List of offensive/inappropriate names to filter
const offensiveNames = [
  "fuck", "shit", "ass", "bitch", "bastard", "damn", "cunt", "dick", "pussy",
  "whore", "slut", "fag", "nigger", "nigga", "retard", "kut", "hoer", "lul",
  "eikel", "klootzak", "kanker", "tyfus", "tering", "godverdomme", "homo",
  "nazi", "hitler", "satan", "devil", "porn", "xxx", "sex", "cock", "penis",
  "vagina", "anus", "dildo", "vibrator", "orgasm", "rape", "molest", "pedo",
  "admin", "test", "fake", "anonymous", "unknown", "nobody", "null", "undefined"
];

const isOffensiveName = (name: string): boolean => {
  const lowerName = name.toLowerCase().trim();
  return offensiveNames.some(offensive => 
    lowerName.includes(offensive) || lowerName === offensive
  );
};

const isValidDateFormat = (dateStr: string): boolean => {
  // Check mm/dd/yyyy format
  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/;
  return regex.test(dateStr);
};

const parseDate = (dateStr: string): Date | null => {
  if (!isValidDateFormat(dateStr)) return null;
  const [month, day, year] = dateStr.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  // Validate the date is real (e.g., not Feb 31)
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
};

const isAtLeast18 = (dateStr: string): boolean => {
  const birthDate = parseDate(dateStr);
  if (!birthDate) return false;
  
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d/]/g, '');
    
    // Auto-format with slashes
    if (value.length === 2 && !value.includes('/')) {
      value = value + '/';
    } else if (value.length === 5 && value.split('/').length === 2) {
      value = value + '/';
    }
    
    // Limit length to mm/dd/yyyy (10 chars)
    if (value.length <= 10) {
      setDateOfBirth(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate first name
    const trimmedName = firstName.trim();
    if (!trimmedName) {
      toast({
        title: "Voornaam verplicht",
        description: "Vul je voornaam in om door te gaan",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName.length < 2) {
      toast({
        title: "Ongeldige voornaam",
        description: "Je voornaam moet minimaal 2 tekens bevatten",
        variant: "destructive",
      });
      return;
    }

    if (isOffensiveName(trimmedName)) {
      toast({
        title: "Ongeldige voornaam",
        description: "Gebruik je echte voornaam",
        variant: "destructive",
      });
      return;
    }

    // Validate date of birth
    if (!dateOfBirth) {
      toast({
        title: "Vul je geboortedatum in",
        description: "Geboortedatum is verplicht",
        variant: "destructive",
      });
      return;
    }

    if (!isValidDateFormat(dateOfBirth)) {
      toast({
        title: "Ongeldig datumformaat",
        description: "Gebruik het formaat mm/dd/yyyy",
        variant: "destructive",
      });
      return;
    }

    if (!parseDate(dateOfBirth)) {
      toast({
        title: "Ongeldige datum",
        description: "Deze datum bestaat niet",
        variant: "destructive",
      });
      return;
    }

    if (!isAtLeast18(dateOfBirth)) {
      toast({
        title: "Leeftijdsbeperking",
        description: "Je moet minimaal 18 jaar oud zijn om deze app te gebruiken",
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

    if (!userId) {
      toast({
        title: "Niet ingelogd",
        description: "Log opnieuw in en probeer het nog een keer",
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

      // Convert date from mm/dd/yyyy to yyyy-mm-dd for storage
      const [month, day, year] = dateOfBirth.split('/');
      const formattedDate = `${year}-${month}-${day}`;

      // Upload photo to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos-temp')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Fout bij uploaden van foto. Controleer je internetverbinding en probeer opnieuw.");
      }

      // Generate signed URL (valid for 60 minutes)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('profile-photos-temp')
        .createSignedUrl(fileName, 3600);

      if (signedUrlError || !signedUrlData) {
        console.error("Signed URL error:", signedUrlError);
        // Clean up uploaded file
        await supabase.storage.from('profile-photos-temp').remove([fileName]);
        throw new Error("Fout bij genereren van toegang tot foto");
      }

      setUploading(false);
      setAnalyzing(true);

      toast({
        title: "Foto analyseren...",
        description: "Je foto wordt geanalyseerd. Dit kan even duren.",
      });

      // Call analyze-photo function with both URL and fileName for reliable deletion
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-photo', {
        body: {
          photoUrl: signedUrlData.signedUrl,
          photoPath: fileName,
          userId,
          firstName: trimmedName,
          dateOfBirth: formattedDate,
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
      
      // Handle specific error cases - face detection is the key one
      if (error.message?.toLowerCase().includes("face") || 
          error.message?.toLowerCase().includes("gezicht") ||
          error.message?.includes("No faces detected")) {
        errorTitle = "Geen gezicht gevonden";
        errorDescription = "Upload een duidelijke foto waarop je gezicht goed zichtbaar is. Zorg voor goede belichting en kijk recht in de camera.";
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
            <Label htmlFor="firstName">Voornaam <span className="text-destructive">*</span></Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Je voornaam"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Geboortedatum <span className="text-destructive">*</span></Label>
            <Input
              id="dateOfBirth"
              type="text"
              value={dateOfBirth}
              onChange={handleDateChange}
              placeholder="mm/dd/yyyy"
              maxLength={10}
              required
            />
            <p className="text-xs text-muted-foreground">Je moet minimaal 18 jaar oud zijn</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo" className="text-sm text-muted-foreground">
              NB: je foto wordt alleen gebruikt ter check of je jezelf goed beschrijft, de foto wordt verder aan niemand getoond. Upload een foto met je gezicht duidelijk zichtbaar.
            </Label>
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
              <p className="text-xs text-muted-foreground">Max. 10MB</p>
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
