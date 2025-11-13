import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Heart, Send, LogOut } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const welcomeMessage: Message = {
        id: "welcome",
        role: "agent",
        content: "Hoi! 👋 Ik ben Agent Flori, de matchmaker van In de Buurt. Ik zou je graag enkele leuke en luchtige vragen willen stellen over jou en jouw ideale date, die mij helpen om voor jou op zoek te gaan naar een match! Zullen we beginnen?",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);

      setIsLoading(false);
    };

    initChat();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Tot ziens! 💕" });
    navigate("/");
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const messageContent = inputValue;
    setInputValue("");
    setIsTyping(true);

    const { data: userMsgData, error: userMsgError } = await supabase
      .from("conversations")
      .insert({
        user_id: session.user.id,
        role: "user",
        content: messageContent,
      })
      .select()
      .single();

    if (userMsgError) {
      console.error("Error saving user message:", userMsgError);
      toast({
        title: "Fout",
        description: "Kon bericht niet opslaan",
        variant: "destructive",
      });
      setIsTyping(false);
      return;
    }

    const userMessage: Message = {
      id: userMsgData.id,
      role: "user",
      content: messageContent,
      timestamp: new Date(userMsgData.created_at),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('send-to-n8n', {
        body: {
          message: messageContent,
          user_message_id: userMsgData.id,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      if (data?.response) {
        const { data: agentMsgData } = await supabase
          .from("conversations")
          .insert({
            user_id: session.user.id,
            role: "agent",
            content: data.response,
          })
          .select()
          .single();

        const agentMessage: Message = {
          id: agentMsgData?.id || Date.now().toString(),
          role: "agent",
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, agentMessage]);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Fout",
        description: "Kon bericht niet versturen naar Agent Flori",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-12 h-12 text-primary fill-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Bezig met laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary fill-primary" />
            <h1 className="text-xl font-bold">Agent Flori</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Uitloggen
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[400px,1fr] gap-8 max-w-6xl mx-auto">
          {/* Rules Box */}
          <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-primary fill-primary" />
              <h3 className="font-semibold text-lg">De spelregels en verwachtingen</h3>
            </div>
            
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Welkom bij Agent Flori! 💕</h4>
                <p className="text-muted-foreground">
                  Voordat je begint met je gesprek, willen we je graag even meenemen in een paar simpele afspraken. Zo zorgen we ervoor dat iedereen een fijne en veilige ervaring heeft.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">De Spelregels:</h4>
              </div>

              <div>
                <h5 className="font-semibold mb-1">Wees jezelf, maar blijf respectvol</h5>
                <p className="text-muted-foreground">
                  Agent Flori stelt je leuke en persoonlijke vragen. Wees eerlijk in je antwoorden—dat geeft de beste kans op een échte match! Maar houd het altijd netjes en respectvol.
                </p>
              </div>

              <div>
                <h5 className="font-semibold mb-1">Het gesprek duurt ongeveer 5 minuten</h5>
                <p className="text-muted-foreground">
                  Neem rustig de tijd om je antwoorden te geven. Je kunt altijd opnieuw beginnen als je wilt.
                </p>
              </div>

              <div>
                <h5 className="font-semibold mb-1">Jouw privacy is heilig</h5>
                <p className="text-muted-foreground">
                  Alles wat je deelt blijft anoniem. We gebruiken je foto alleen om je uiterlijke kenmerken in kaart te brengen—daarna wordt deze direct verwijderd. Je foto wordt nooit getoond aan anderen.
                </p>
              </div>

              <div>
                <h5 className="font-semibold mb-1">Geen ongepaste opmerkingen</h5>
                <p className="text-muted-foreground">
                  Dit is een veilige plek voor iedereen. Ongepaste, discriminerende of kwetsende opmerkingen zijn niet toegestaan.
                </p>
              </div>

              <div>
                <h5 className="font-semibold mb-1">Geniet van de ervaring!</h5>
                <p className="text-muted-foreground">
                  Dit is jouw kans om op een ludieke en laagdrempelige manier iemand te ontmoeten uit jouw buurt. Heb er plezier in!
                </p>
              </div>

              <div className="pt-2 border-t">
                <p className="font-semibold text-primary">
                  Klaar om te beginnen? Agent Flori staat voor je klaar! 🚀
                </p>
              </div>
            </div>
          </div>

          {/* Chat Box */}
          <div className="bg-card rounded-2xl shadow-lg overflow-hidden flex flex-col" style={{ height: "700px" }}>
            {/* Chat Header */}
            <div className="bg-muted/50 border-b p-4 flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">AF</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-semibold">Agent Flori</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Online</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted/50 text-foreground"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted/50 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4 flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type je antwoord hier..."
                className="flex-1"
                disabled={isTyping}
              />
              <Button 
                onClick={handleSendMessage}
                className="bg-primary hover:bg-primary/90"
                disabled={isTyping}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
