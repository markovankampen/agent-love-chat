import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Phone } from "lucide-react";
import Footer from "@/components/Footer";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface Profile {
  id: string;
  first_name: string | null;
  email: string | null;
  username: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  hair_color: string | null;
  eye_color: string | null;
  phone_number: string | null;
}

function AvatarWithSignedUrl({ photoUrl, size = "w-12 h-12", iconSize = "w-6 h-6" }: { photoUrl: string | null | undefined; size?: string; iconSize?: string }) {
  const signedUrl = useSignedUrl(photoUrl);
  return (
    <Avatar className={size}>
      {signedUrl ? (
        <AvatarImage src={signedUrl} alt="Profielfoto" className="object-cover object-top" />
      ) : (
        <AvatarFallback>
          <User className={`${iconSize} text-muted-foreground`} />
        </AvatarFallback>
      )}
    </Avatar>
  );
}

const Account = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile(data);
          setFirstName(data.first_name || "");
          setUsername(data.username || "");
          setPhoneNumber(data.phone_number || "");
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Fout",
          description: "Kon gegevens niet laden",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast]);

  const handleSave = async () => {
    if (!profile) return;

    const trimmedFirstName = firstName.trim();
    const trimmedUsername = username.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    if (!trimmedFirstName) {
      toast({
        title: "Voornaam verplicht",
        description: "Vul je voornaam in",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: trimmedFirstName,
          username: trimmedUsername || null,
          phone_number: trimmedPhoneNumber || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        first_name: trimmedFirstName,
        username: trimmedUsername || null,
        phone_number: trimmedPhoneNumber || null,
      });

      toast({
        title: "Opgeslagen",
        description: "Je profiel is bijgewerkt",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Fout",
        description: "Kon profiel niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-3 py-6 sm:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Mijn Account</h1>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <AvatarWithSignedUrl photoUrl={profile?.photo_url} size="w-20 h-20" iconSize="w-10 h-10" />
            <div>
              <h2 className="text-xl font-semibold">
                {profile?.first_name || "Gebruiker"}
              </h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Voornaam</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Je voornaam"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Gebruikersnaam</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Je gebruikersnaam"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefoonnummer
                </div>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+31 6 12345678"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Geboortedatum</Label>
              <Input
                value={formatDate(profile?.date_of_birth)}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* Save Button - TEXT ONLY, NO ICON */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Opslaan...
              </span>
            ) : (
              "Wijzigingen opslaan"
            )}
          </Button>
        </Card>

        <Footer />
      </div>
    </div>
  );
};

export default Account;
