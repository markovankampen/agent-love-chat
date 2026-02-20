import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, CheckCircle, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ReuploadPhoto = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Ongeldige link</h1>
          <p className="text-muted-foreground">
            Deze link is ongeldig. Controleer je e-mail voor de juiste link.
          </p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Bedankt! 🎉</h1>
          <p className="text-muted-foreground text-lg">
            Je selfie is succesvol geüpload en opgeslagen. We gaan nu aan de slag met het vinden van je perfecte match!
          </p>
          <p className="text-sm text-muted-foreground">
            Je kunt dit venster sluiten.
          </p>
        </Card>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Foto is te groot. Upload een foto kleiner dan 10MB.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      setError("Geen toegang tot camera. Probeer een foto te uploaden.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
          setSelectedFile(file);
          setPreviewUrl(canvas.toDataURL("image/jpeg"));
          setError(null);
          stopCamera();
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) return;

    setUploading(true);
    setError(null);

    try {
      // Convert file to JPEG base64
      let base64: string;
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();

      if (fileExt !== "jpg" && fileExt !== "jpeg") {
        // Convert to JPEG
        const bitmap = await createImageBitmap(selectedFile);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0);
          base64 = canvas.toDataURL("image/jpeg", 0.9);
        } else {
          base64 = await fileToBase64(selectedFile);
        }
      } else {
        base64 = await fileToBase64(selectedFile);
      }

      // Call the process-reupload edge function
      const { data, error: fnError } = await supabase.functions.invoke("process-reupload", {
        body: {
          token,
          photoBase64: base64,
          photoFileName: selectedFile.name,
        },
      });

      if (data?.error) {
        throw new Error(data.error);
      }

      if (fnError) {
        // Try to extract error message from response
        const errMsg = fnError.message || "";
        const jsonMatch = errMsg.match(/\{"error":"([^"]+)"\}/);
        throw new Error(jsonMatch?.[1] || "Er ging iets mis bij het uploaden. Probeer opnieuw.");
      }

      setSuccess(true);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Er ging iets mis. Probeer opnieuw.");
    } finally {
      setUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-4">
      <Card className="p-6 sm:p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">📸 Upload je selfie</h1>
          <p className="text-muted-foreground">
            Maak een duidelijke selfie of upload een foto waarbij je gezicht goed zichtbaar is.
          </p>
        </div>

        {/* Camera view */}
        {showCamera && (
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-[3/4] object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button
                variant="secondary"
                size="icon"
                onClick={stopCamera}
                className="rounded-full w-12 h-12"
              >
                <X className="w-6 h-6" />
              </Button>
              <Button
                onClick={capturePhoto}
                className="rounded-full w-16 h-16 bg-white hover:bg-gray-100"
              >
                <div className="w-12 h-12 rounded-full border-4 border-primary" />
              </Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {previewUrl && !showCamera && (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full aspect-[3/4] object-cover rounded-lg"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 rounded-full"
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Action buttons */}
        {!showCamera && !previewUrl && (
          <div className="space-y-3">
            <Button
              onClick={startCamera}
              className="w-full h-14 text-base"
              variant="outline"
            >
              <Camera className="w-5 h-5 mr-2" />
              Selfie maken
            </Button>

            <label className="block">
              <Button
                asChild
                className="w-full h-14 text-base"
                variant="outline"
              >
                <span>
                  <Upload className="w-5 h-5 mr-2" />
                  Foto uploaden
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Upload button */}
        {previewUrl && !showCamera && (
          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full h-14 text-base"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Bezig met uploaden...
              </span>
            ) : (
              "✅ Foto versturen"
            )}
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Je foto wordt veilig opgeslagen en alleen gebruikt voor matching.
        </p>
      </Card>
    </div>
  );
};

export default ReuploadPhoto;
