import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";

const VerifyEmail = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Check je e-mail</h1>
          <p className="text-muted-foreground">
            Bedankt voor je registratie! We hebben een verificatielink naar je
            e-mailadres gestuurd.
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
          Klik op de link in de e-mail om je account te verifiëren en je profiel
          compleet te maken.
        </div>

        <p className="text-xs text-muted-foreground">
          Geen e-mail ontvangen? Check je spam folder.
        </p>
      </Card>
    </div>
  );
};

export default VerifyEmail;
