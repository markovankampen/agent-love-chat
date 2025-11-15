import { Heart } from "lucide-react";
import { Card } from "@/components/ui/card";

const Verify = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Heart className="w-8 h-8 text-primary fill-primary" />
          </div>
          <h1 className="text-3xl font-bold">Bijna klaar!</h1>
          <p className="text-muted-foreground">
            Je account is aangemaakt. Check je inbox voor de verificatie email, of klik op de link in de email om je profiel in te stellen.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Verify;
