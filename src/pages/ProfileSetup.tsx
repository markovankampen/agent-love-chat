import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, AlertCircle, X, Upload } from "lucide-react";
import Footer from "@/components/Footer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Offensive names filter
const offensiveNames = [
  "fuck",
  "shit",
  "ass",
  "bitch",
  "bastard",
  "damn",
  "cunt",
  "dick",
  "pussy",
  "whore",
  "slut",
  "fag",
  "nigger",
  "nigga",
  "retard",
  "kut",
  "hoer",
  "lul",
  "eikel",
  "klootzak",
  "kanker",
  "tyfus",
  "tering",
  "godverdomme",
  "homo",
  "nazi",
  "hitler",
  "satan",
  "devil",
  "porn",
  "xxx",
  "sex",
  "cock",
  "penis",
  "vagina",
  "anus",
  "dildo",
  "vibrator",
  "orgasm",
  "rape",
  "molest",
  "pedo",
  "admin",
  "test",
  "fake",
  "anonymous",
  "unknown",
  "nobody",
  "null",
  "undefined",
];

const isOffensiveName = (name: string): boolean => {
  const lowerName = name.toLowerCase().trim();
  return offensiveNames.some((offensive) => lowerName.includes(offensive) || lowerName === offensive);
};

// European date format: DD/MM/YYYY
const isValidDateFormat = (dateStr: string): boolean => {
  const regex = /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  return regex.test(dateStr);
};

const parseDate = (dateStr: string): Date | null => {
  if (!isValidDateFormat(dateStr)) return null;
  const [day, month, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);
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

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("31")) {
    const cleaned = digits.substring(2);
    if (cleaned.length <= 1) return `+31 ${cleaned}`;
    if (cleaned.length <= 9) return `+31 ${cleaned[0]} ${cleaned.substring(1)}`;
    return `+31 ${cleaned[0]} ${cleaned.substring(1, 9)}`;
  } else if (digits.startsWith("0")) {
    const cleaned = digits.substring(1);
    if (cleaned.length === 0) return "+31 ";
    if (cleaned.length === 1) return `+31 ${cleaned}`;
    if (cleaned.length <= 9) return `+31 ${cleaned[0]} ${cleaned.substring(1)}`;
    return `+31 ${cleaned[0]} ${cleaned.substring(1, 9)}`;
  } else {
    if (digits.length === 0) return "";
    if (digits.length === 1) return `+31 ${digits}`;
    if (digits.length <= 9) return `+31 ${digits[0]} ${digits.substring(1)}`;
    return `+31 ${digits[0]} ${digits.substring(1, 9)}`;
  }
};

const ProfileSetup = () => {
  const [searchParams] = useSearchParams();
  const photoOnly = searchParams.get("photo-only") === "true";
  
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);

        // Load existing profile data
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, username, phone_number, date_of_birth")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          if (profile.first_name) setFirstName(profile.first_name);
          if (profile.username) setUsername(profile.username);
          if (profile.phone_number) setPhoneNumber(profile.phone_number);
          if (profile.date_of_birth) {
            const [year, month, day] = profile.date_of_birth.split("-");
            setDateOfBirth(`${day}/${month}/${year}`);
          }
        }
        setProfileLoaded(true);
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
      
      // Validate it's an image
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Ongeldig bestand",
          description: "Upload een foto (JPG, PNG of HEIC)",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      setShowVerificationPrompt(false);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setShowCamera(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Geen toegang tot camera. Controleer je browser instellingen.");
      toast({
        title: "Camera niet beschikbaar",
        description: "Geef toestemming voor camera toegang of upload een foto",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
          setSelectedFile(file);
          setPreviewUrl(canvas.toDataURL("image/jpeg"));
          setShowVerificationPrompt(false);
          stopCamera();

          toast({
            title: "Foto gemaakt!",
            description: "Je selfie is klaar voor upload",
          });
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d/]/g, "");

    if (value.length === 2 && !value.includes("/")) {
      value = value + "/";
    } else if (value.length === 5 && value.split("/").length === 2) {
      value = value + "/";
    }

    if (value.length <= 10) {
      setDateOfBirth(value);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // In photo-only mode, skip field validations — use existing profile data
    if (!photoOnly) {
      // Validate first name
      const trimmedNameVal = firstName.trim();
      if (!trimmedNameVal) {
        toast({
          title: "Voornaam verplicht",
          description: "Vul je voornaam in om door te gaan",
          variant: "destructive",
        });
        return;
      }

      if (trimmedNameVal.length < 2) {
        toast({
          title: "Ongeldige voornaam",
          description: "Je voornaam moet minimaal 2 tekens bevatten",
          variant: "destructive",
        });
        return;
      }

      if (isOffensiveName(trimmedNameVal)) {
        toast({
          title: "Ongeldige voornaam",
          description: "Gebruik je echte voornaam",
          variant: "destructive",
        });
        return;
      }

      // Validate username
      const trimmedUsernameVal = username.trim();
      if (!trimmedUsernameVal) {
        toast({
          title: "Gebruikersnaam verplicht",
          description: "Vul een gebruikersnaam in om door te gaan",
          variant: "destructive",
        });
        return;
      }

      if (trimmedUsernameVal.length < 2) {
        toast({
          title: "Ongeldige gebruikersnaam",
          description: "Gebruikersnaam moet minimaal 2 tekens bevatten",
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
          description: "Gebruik het formaat dd/mm/jjjj",
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

      // Validate phone number
      const trimmedPhoneVal = phoneNumber.trim();
      if (trimmedPhoneVal && trimmedPhoneVal.length < 12) {
        toast({
          title: "Ongeldig telefoonnummer",
          description: "Voer een geldig Nederlands telefoonnummer in",
          variant: "destructive",
        });
        return;
      }
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

    const trimmedName = firstName.trim();
    const trimmedUsername = username.trim();
    const trimmedPhone = phoneNumber.trim();

    try {
      setUploading(true);

      toast({
        title: "Foto uploaden...",
        description: "Je foto wordt geüpload naar de server",
      });

      // Convert date from dd/mm/yyyy to yyyy-mm-dd
      const [day, month, year] = dateOfBirth.split("/");
      const formattedDate = `${year}-${month}-${day}`;

      // Convert to JPEG and resize to stay under Face++ 2MB limit (max 1280px)
      let uploadFile: File | Blob = selectedFile;
      let finalExt = "jpeg";
      
      try {
        const bitmap = await createImageBitmap(selectedFile);
        const maxDim = 1280;
        const ratio = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
        const w = Math.round(bitmap.width * ratio);
        const h = Math.round(bitmap.height * ratio);
        
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, w, h);
          
          // Try quality levels until under 1.8MB
          let quality = 0.85;
          let blob: Blob | null = null;
          while (quality >= 0.3) {
            blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, "image/jpeg", quality)
            );
            if (blob && blob.size <= 1800 * 1024) break;
            quality -= 0.1;
          }
          
          if (blob) {
            uploadFile = blob;
            console.log(`📐 Resized to ${w}x${h}, ${(blob.size / 1024).toFixed(0)}KB, quality=${quality.toFixed(1)}`);
          }
        }
      } catch (convErr) {
        console.warn("Image resize failed, uploading original:", convErr);
      }

      // Upload photo to PERMANENT storage first
      const fileName = `${userId}/${Date.now()}.${finalExt}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, uploadFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Fout bij uploaden van foto. Controleer je internetverbinding en probeer opnieuw.");
      }

      // Generate signed URL for AI/Face++ processing
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(fileName, 3600);

      if (signedUrlError || !signedUrlData) {
        console.error("Signed URL error:", signedUrlError);
        await supabase.storage.from("profile-photos").remove([fileName]);
        throw new Error("Fout bij genereren van toegang tot foto");
      }

      setUploading(false);
      setAnalyzing(true);

      toast({
        title: "Foto analyseren...",
        description: "Je foto wordt geanalyseerd. Dit kan even duren.",
      });

      // ✅ CRITICAL FIX: Pass username to the edge function
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke("analyze-photo", {
        body: {
          photoUrl: signedUrlData.signedUrl,
          photoPath: fileName,
          userId,
          firstName: trimmedName,
          username: trimmedUsername || null, // ✅ Added username
          dateOfBirth: formattedDate,
          phoneNumber: trimmedPhone || null,
        },
      });

      // Check for error in response
      if (analysisData?.error) {
        throw new Error(analysisData.error);
      }

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        let errorMsg = "Fout tijdens het analyseren van de foto, upload een geldige selfie";

        const errorMessage = analysisError.message || "";
        const jsonMatch = errorMessage.match(/\{"error":"([^"]+)"\}/);
        if (jsonMatch && jsonMatch[1]) {
          errorMsg = jsonMatch[1];
        } else if (analysisError.context?.error) {
          errorMsg = analysisError.context.error;
        }

        throw new Error(errorMsg);
      }

      setAnalyzing(false);

      toast({
        title: "Analyse voltooid!",
        description: "Je profiel is succesvol ingesteld. We zoeken nu naar matches...",
      });

      // Trigger matchmaking in the background (don't wait for it)
      supabase.functions.invoke("find-match", {
        body: { user_id: userId }
      }).then(({ data, error }) => {
        if (error) {
          console.error("Matchmaking error:", error);
        } else {
          console.log("Matchmaking result:", data);
        }
      });

      // Wait a bit then navigate to home (profile is now complete)
      setTimeout(() => {
        navigate("/home", { replace: true });
      }, 1500);
    } catch (error: any) {
      console.error("Error:", error);

      const isSelfieError =
        error.message?.toLowerCase().includes("face") ||
        error.message?.toLowerCase().includes("gezicht") ||
        error.message?.toLowerCase().includes("persoon") ||
        error.message?.toLowerCase().includes("selfie") ||
        error.message?.toLowerCase().includes("close-up") ||
        error.message?.toLowerCase().includes("meerdere") ||
        error.message?.includes("No faces detected");

      if (isSelfieError) {
        const noteMessage = error.message?.includes("Upload")
          ? error.message
          : "Upload een duidelijke selfie waarop je gezicht goed zichtbaar is en je recht in de camera kijkt.";
        setVerificationMessage(noteMessage);
        setShowVerificationPrompt(true);
        return;
      }

      let errorTitle = "Er ging iets mis";
      let errorDescription = error.message || "Probeer het opnieuw";

      if (error.message?.includes("timeout") || error.message?.includes("timed out")) {
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
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex-1 flex items-center justify-center px-3 py-6 sm:p-4">
        <Card className="w-full max-w-md p-4 sm:p-8 space-y-4 sm:space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-2 sm:mb-4">
              <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {photoOnly ? "Upload je profielfoto" : "Stel je profiel in"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {photoOnly
                ? "Upload een selfie om je profiel compleet te maken"
                : "Upload een foto en vertel ons over jezelf"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!photoOnly && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    Voornaam <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Je voornaam"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Gebruikersnaam (optioneel)</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Je gebruikersnaam"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">
                    Geboortedatum <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="dateOfBirth"
                    type="text"
                    value={dateOfBirth}
                    onChange={handleDateChange}
                    placeholder="dd/mm/jjjj"
                    maxLength={10}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Je moet minimaal 18 jaar oud zijn</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Telefoonnummer (optioneel)</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="+31 6 12345678"
                    maxLength={14}
                  />
                  <p className="text-xs text-muted-foreground">Bijvoorbeeld: +31 6 12345678</p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="photo" className="font-medium">
                Profielfoto <span className="text-destructive">*</span>
              </Label>
              <div className="p-2.5 sm:p-3 bg-muted/50 rounded-lg border border-border/50 space-y-1.5 sm:space-y-2">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <strong>Jouw foto is privé</strong> – deze wordt aan niemand getoond maar is wel belangrijk voor een
                  potentiële match.
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  <strong>Foto vereisten:</strong>
                </p>
                <ul className="text-xs sm:text-sm text-muted-foreground list-disc list-inside space-y-0.5 sm:space-y-1">
                  <li>Duidelijke selfie met je gezicht goed zichtbaar</li>
                  <li>Kijk recht in de camera</li>
                  <li>Goede belichting (niet te donker)</li>
                  <li>Alleen jij op de foto</li>
                </ul>
                <p className="text-xs sm:text-sm text-primary font-medium">💡 Tip: Een live selfie werkt het beste!</p>
              </div>
              <div className="flex flex-col gap-4">
                {previewUrl && !showCamera && (
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        analyzing ? "blur-md brightness-75" : ""
                      }`}
                    />
                    {analyzing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        {/* Simple CSS spinner - no Loader2 icon */}
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-foreground">Foto wordt geanalyseerd...</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="default"
                    onClick={startCamera}
                    disabled={analyzing || showCamera}
                    className="flex-1 text-sm sm:text-base"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Neem live selfie
                  </Button>
                  <label className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={analyzing}
                      className="w-full text-sm sm:text-base"
                      asChild
                    >
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload foto
                      </span>
                    </Button>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={analyzing}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Max. 10MB</p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={uploading || analyzing || !selectedFile}>
              <span className="flex items-center justify-center gap-2">
                {(uploading || analyzing) && (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>
                  {uploading ? "Uploaden..." : analyzing ? "Analyseren..." : "Doorgaan"}
                </span>
              </span>
            </Button>
          </form>
        </Card>
      </div>

      {/* Camera Dialog */}
      <Dialog
        open={showCamera}
        onOpenChange={(open) => {
          if (!open) stopCamera();
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-3 sm:p-4 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Neem een selfie
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Positioneer je gezicht in het midden en kijk recht in de camera
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[3/4] sm:aspect-[4/3] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/90 p-4">
                <p className="text-center text-sm text-muted-foreground">{cameraError}</p>
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-48 sm:w-48 sm:h-64 border-2 border-dashed border-white/50 rounded-full" />
            </div>
          </div>
          <div className="p-3 sm:p-4 flex gap-2">
            <Button variant="outline" onClick={stopCamera} className="flex-1 text-sm sm:text-base">
              <X className="mr-1.5 sm:mr-2 h-4 w-4" />
              Annuleren
            </Button>
            <Button onClick={capturePhoto} className="flex-1 text-sm sm:text-base" disabled={!cameraStream}>
              <Camera className="mr-1.5 sm:mr-2 h-4 w-4" />
              Maak foto
            </Button>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>

      {/* Photo Verification Failed Dialog */}
      <Dialog open={showVerificationPrompt} onOpenChange={setShowVerificationPrompt}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <DialogTitle className="text-base sm:text-lg">Foto verificatie mislukt</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-xs sm:text-sm">{verificationMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:gap-3 pt-3 sm:pt-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Tips voor een goede selfie:</p>
            <ul className="text-xs sm:text-sm text-muted-foreground list-disc list-inside space-y-0.5 sm:space-y-1">
              <li>Kijk recht in de camera</li>
              <li>Zorg voor goede belichting</li>
              <li>Zorg dat je gezicht duidelijk zichtbaar is</li>
              <li>Gebruik een recente foto van jezelf</li>
            </ul>
            <Button onClick={() => setShowVerificationPrompt(false)} className="mt-2 text-sm sm:text-base">
              Nieuwe foto uploaden
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ProfileSetup;
