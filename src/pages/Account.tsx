import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Loader2, Trash2, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Profile {
  id: string;
  first_name: string | null;
  email: string | null;
  username: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
  hair_color: string | null;
  eye_color: string | null;
}

const Account = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
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
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Fout",
          description: "Kon profiel niet laden",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate, toast]);

  const handleSave = async () => {
    if (!profile) return;

    const trimmedFirstName = firstName.trim();
    const trimmedUsername = username.trim();

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
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        first_name: trimmedFirstName,
        username: trimmedUsername || null,
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

  const handleDeleteAccount = async () => {
    setDeleting(true);

    try {
      // Sign out first
      await supabase.auth.signOut();

      toast({
        title: "Account verwijderd",
        description: "Je account en gegevens zijn verwijderd",
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Fout",
        description: "Kon account niet verwijderen. Neem contact op met support.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 px-3 py-6 sm:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/chat")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Mijn Account</h1>
        </div>

        {/* Profile Card */}
        <Card className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              {profile?.photo_url ? (
                <AvatarImage src={profile.photo_url} alt="Profielfoto" />
              ) : (
                <AvatarFallback>
                  <User className="w-10 h-10 text-muted-foreground" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">
                {profile?.first_name || "Gebruiker"}
              </h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          {/* Editable Fields */}
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

            {/* Read-only Fields */}
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

            {profile?.hair_color && (
              <div className="space-y-2">
                <Label>Haarkleur</Label>
                <Input value={profile.hair_color} disabled className="bg-muted" />
              </div>
            )}

            {profile?.eye_color && (
              <div className="space-y-2">
                <Label>Oogkleur</Label>
                <Input value={profile.eye_color} disabled className="bg-muted" />
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Wijzigingen opslaan
              </>
            )}
          </Button>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-destructive/50">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Gevaarzone
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Als je je account verwijdert, worden al je gegevens permanent
            verwijderd. Deze actie kan niet ongedaan worden gemaakt.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Account verwijderen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
                <AlertDialogDescription>
                  Deze actie kan niet ongedaan worden gemaakt. Al je gegevens,
                  inclusief je profiel en chatgeschiedenis, worden permanent
                  verwijderd.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Verwijderen..." : "Ja, verwijder mijn account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </div>
    </div>
  );
};

export default Account;
