import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Trash2, Bell, Heart, Mail, Phone } from "lucide-react";
import Footer from "@/components/Footer";
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
  phone_number: string | null;
}

interface NotificationSettings {
  match_notifications: boolean;
  update_notifications: boolean;
  email_notifications: boolean;
}

const Account = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notifications, setNotifications] = useState<NotificationSettings>({
    match_notifications: true,
    update_notifications: true,
    email_notifications: true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
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

        const [profileResult, notificationResult] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase.from("notification_settings").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

        if (profileResult.error) throw profileResult.error;

        if (profileResult.data) {
          setProfile(profileResult.data);
          setFirstName(profileResult.data.first_name || "");
          setUsername(profileResult.data.username || "");
          setPhoneNumber(profileResult.data.phone_number || "");
        }

        if (notificationResult.data) {
          setNotifications({
            match_notifications: notificationResult.data.match_notifications,
            update_notifications: notificationResult.data.update_notifications,
            email_notifications: notificationResult.data.email_notifications,
          });
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

  const handleNotificationChange = async (
    key: keyof NotificationSettings,
    value: boolean
  ) => {
    if (!profile) return;

    const newSettings = { ...notifications, [key]: value };
    setNotifications(newSettings);
    setSavingNotifications(true);

    try {
      const { error } = await supabase
        .from("notification_settings")
        .upsert({
          user_id: profile.id,
          ...newSettings,
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast({
        title: "Opgeslagen",
        description: "Notificatie-instellingen bijgewerkt",
      });
    } catch (error: any) {
      console.error("Error saving notification settings:", error);
      setNotifications(notifications);
      toast({
        title: "Fout",
        description: "Kon instellingen niet opslaan",
        variant: "destructive",
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);

    try {
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
        {/* Simple spinner using CSS only - no icon component */}
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

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Notificaties</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="match-notifications" className="text-sm font-medium">
                    Match notificaties
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ontvang een melding bij een nieuwe match
                  </p>
                </div>
              </div>
              <Switch
                id="match-notifications"
                checked={notifications.match_notifications}
                onCheckedChange={(checked) =>
                  handleNotificationChange("match_notifications", checked)
                }
                disabled={savingNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="update-notifications" className="text-sm font-medium">
                    Updates & nieuws
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ontvang meldingen over updates en nieuws
                  </p>
                </div>
              </div>
              <Switch
                id="update-notifications"
                checked={notifications.update_notifications}
                onCheckedChange={(checked) =>
                  handleNotificationChange("update_notifications", checked)
                }
                disabled={savingNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="email-notifications" className="text-sm font-medium">
                    E-mail notificaties
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ontvang notificaties via e-mail
                  </p>
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={notifications.email_notifications}
                onCheckedChange={(checked) =>
                  handleNotificationChange("email_notifications", checked)
                }
                disabled={savingNotifications}
              />
            </div>
          </div>
        </Card>

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
                  {deleting ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Verwijderen...
                    </span>
                  ) : (
                    "Ja, verwijder mijn account"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>

        <Footer />
      </div>
    </div>
  );
};

export default Account;