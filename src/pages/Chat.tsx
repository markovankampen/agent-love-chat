import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Heart, Send, ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import chatBg from "@/assets/chat-bg.jpg";

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
  const [isRulesOpen, setIsRulesOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
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
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const messageContent = inputValue;
    setInputValue("");
    setIsTyping(true);

    const { data: userMsgData, error: userMsgError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
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

      if (data?.content) {
        const agentMessage: Message = {
          id: data.id || Date.now().toString(),
          role: "agent",
          content: data.content,
          timestamp: new Date(data.created_at || new Date()),
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
      <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${chatBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        </div>
        <Heart className="h-12 w-12 text-primary animate-pulse-heart relative z-10" />
      </div>
    );
  }

  const RulesContent = () => (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-semibold text-primary">De spelregels en verwachtingen</h2>
      <div className="space-y-3 text-sm text-foreground/80">
        <p className="font-medium text-foreground">Hallo! 👋</p>
        <p>
          Ik ben Agent Flori, en ik ga je helpen om een geweldige match te vinden. Ik zal je
          enkele vragen stellen om jou beter te leren kennen!
        </p>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Wat je kunt verwachten:</p>
          <ul className="space-y-1.5 ml-4">
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Ik stel je persoonlijke vragen over jezelf en je ideale date</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Ik probeer een beeld te krijgen van wie je bent en wat je zoekt</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Op basis van jouw antwoorden ga ik op zoek naar een match</span>
            </li>
          </ul>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">Spelregels:</p>
          <ul className="space-y-1.5 ml-4">
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Wees eerlijk - dat helpt mij om de beste match te vinden</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Neem de tijd voor je antwoorden</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Er zijn geen foute antwoorden - gewoon jouw antwoorden!</span>
            </li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground italic">
          PS: Dit gesprek blijft tussen ons. Jouw privacy is belangrijk! 🔒
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${chatBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      </div>

      {/* Desktop Sidebar - Collapsible */}
      <div className="hidden md:block relative z-10">
        <Collapsible open={isRulesOpen} onOpenChange={setIsRulesOpen}>
          <div className={`h-full transition-all duration-300 ${isRulesOpen ? 'w-80' : 'w-12'} border-r border-border bg-card/50 backdrop-blur-sm`}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="m-2 hover:bg-primary/10"
              >
                {isRulesOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ScrollArea className="h-[calc(100vh-60px)]">
                <RulesContent />
              </ScrollArea>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 w-full relative z-10">
        {/* Premium Header with Glassmorphism */}
        <div className="backdrop-blur-xl bg-card/70 border-b border-glass-border shadow-soft">
          <div className="flex items-center justify-between px-4 md:px-6 h-16">
            <div className="flex items-center gap-3">
              {/* Mobile Rules Drawer Trigger */}
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden hover:bg-primary/10">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[85vh]">
                  <DrawerHeader>
                    <DrawerTitle>Spelregels & Verwachtingen</DrawerTitle>
                  </DrawerHeader>
                  <ScrollArea className="flex-1 overflow-y-auto">
                    <RulesContent />
                  </ScrollArea>
                </DrawerContent>
              </Drawer>

              <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-glow">
                <AvatarFallback className="bg-gradient-romantic text-white font-semibold">
                  AF
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-foreground">Agent Flori</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse-soft"></span>
                  Online
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 md:px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-[20px] px-5 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-romantic text-white shadow-float ml-auto"
                      : "bg-secondary/80 text-foreground shadow-soft"
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-secondary/80 rounded-[20px] px-5 py-3 shadow-soft">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary animate-pulse-heart" />
                    <span className="text-sm text-muted-foreground">Agent Flori denkt na...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Premium Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Typ je bericht..."
                  className="w-full rounded-[20px] border-border/50 bg-background/80 backdrop-blur-sm px-5 py-6 text-base shadow-soft focus:shadow-glow focus:border-primary/50 transition-all"
                  disabled={isTyping}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="rounded-full h-12 w-12 p-0 bg-gradient-romantic hover:shadow-glow transition-all hover:scale-105 shadow-float"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
