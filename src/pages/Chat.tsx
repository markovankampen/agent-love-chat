import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Heart, Send, LogOut, ChevronLeft, Menu } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const welcomeMessage: Message = {
        id: "welcome",
        role: "agent",
        content: "Hoi! 👋 Ik ben Matchmaker Flori van {{IN_DE_BUURT_LINK}}. Ik zou je graag enkele leuke en luchtige vragen willen stellen over jou en jouw ideale date, die mij helpen om voor jou op zoek te gaan naar een match! Zullen we beginnen?",
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

  useEffect(() => {
    if (!isTyping && !isLoading) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isTyping, isLoading]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Tot ziens! 💕" });
    navigate("/");
  };

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
        description: "Kon bericht niet versturen naar Matchmaker Flori",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Heart className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  const SidebarContent = () => (
    <div className="p-6 space-y-6">
      {/* Illustration */}
      <div className="flex justify-center">
        <div className="w-40 h-40">
          <svg viewBox="0 0 160 160" className="w-full h-full">
            {/* Simple hand-drawn style figure */}
            <circle cx="80" cy="50" r="25" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <path d="M70 45 Q75 40, 80 45 Q85 40, 90 45" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <circle cx="72" cy="47" r="2" fill="hsl(var(--foreground))" />
            <circle cx="88" cy="47" r="2" fill="hsl(var(--foreground))" />
            <path d="M75 58 Q80 62, 85 58" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
            {/* Body */}
            <path d="M60 75 L65 100 M100 75 L95 100" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <path d="M65 100 L55 130 M95 100 L105 130" stroke="hsl(var(--foreground))" strokeWidth="2" />
            {/* Arm with heart */}
            <path d="M55 85 L35 70" stroke="hsl(var(--foreground))" strokeWidth="2" />
            <path d="M33 60 Q38 50, 43 60 Q48 50, 53 60 L43 75 Z" fill="hsl(var(--primary))" />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="font-semibold text-foreground">Hallo!</p>
          <p className="text-sm text-muted-foreground">
            Ik ben Matchmaker Flori, en ik ga je helpen om een geweldige match te vinden. Ik zal je enkele vragen stellen om jou beter te leren kennen!
          </p>
        </div>

        <div>
          <p className="font-semibold text-foreground mb-2">Wat kun je verwachten?</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Ik stel je persoonlijke vragen over jezelf en je ideale partner</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Ik probeer een beeld te krijgen van wie je bent en wat je zoekt</span>
            </li>
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Op basis van jouw antwoorden en foto ga ik op zoek naar een match</span>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-foreground mb-2">De spelregels</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
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
            <li className="flex items-start gap-2">
              <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Bij een match sturen we jou en je date een mail om een afspraak in te plannen</span>
            </li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        PS: Dit gesprek blijft tussen ons.<br />
        Jouw privacy is belangrijk!
      </p>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-foreground text-background py-2 px-4 text-center text-sm">
        <span className="inline-flex items-center gap-2">
          <Heart className="w-4 h-4 fill-primary text-primary" />
          indebuurt ontmoet is een initiatief van{" "}
          <a href="https://indebuurt.nl" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            indebuurt.nl
          </a>
        </span>
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden md:flex flex-col h-full pt-10 transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0'} border-r border-border bg-background overflow-hidden`}>
        <div className="p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <SidebarContent />
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 pt-10">
        {/* Chat Header */}
        <div className="border-b border-border bg-background px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Trigger */}
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="h-[85vh]">
                <DrawerHeader>
                  <DrawerTitle>Spelregels & Verwachtingen</DrawerTitle>
                </DrawerHeader>
                <ScrollArea className="flex-1">
                  <SidebarContent />
                </ScrollArea>
              </DrawerContent>
            </Drawer>

            <Avatar className="h-10 w-10 border-2 border-border">
              <AvatarFallback className="bg-secondary text-foreground font-semibold">
                MF
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold text-foreground">Matchmaker Flori</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary"></span>
                Online
              </p>
            </div>
          </div>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="icon"
            className="hover:bg-secondary"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 md:px-6 py-6 bg-secondary/20">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground border border-border shadow-sm"
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                    {message.content.includes("{{IN_DE_BUURT_LINK}}") ? (
                      <>
                        {message.content.split("{{IN_DE_BUURT_LINK}}")[0]}
                        <a 
                          href="https://indebuurt.nl/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:opacity-80 transition-opacity"
                        >
                          indebuurt
                        </a>
                        {message.content.split("{{IN_DE_BUURT_LINK}}")[1]}
                      </>
                    ) : (
                      message.content
                    )}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-background rounded-2xl px-5 py-3 border border-border shadow-sm">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">Matchmaker Flori denkt na...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-background p-4 md:p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Typ je bericht..."
                  className="w-full rounded-full border-border bg-secondary/50 px-5 py-6 text-base focus:border-primary/50 transition-all"
                  disabled={isTyping}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="rounded-full h-12 w-12 p-0 bg-primary hover:bg-primary/90"
                size="icon"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Decorative arrow */}
          <div className="hidden md:block absolute bottom-20 right-8 opacity-30">
            <svg viewBox="0 0 60 40" className="w-16 h-12">
              <path d="M5 35 Q30 10, 50 20" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
              <path d="M45 15 L55 20 L48 28" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
