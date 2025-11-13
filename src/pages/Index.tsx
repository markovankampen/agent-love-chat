import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, Send } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      content: "Hoi! 👋 Ik ben Agent Flori, de matchmaker van In de Buurt. Ik zou je graag enkele leuke en luchtige vragen willen stellen over jou en jouw ideale date, die mij helpen om voor jou op zoek te gaan naar een match! Zullen we beginnen?",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const messageContent = inputValue;
    setInputValue("");

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Simulate agent response
    setIsTyping(true);
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: "Bedankt voor je bericht! Ik ben hier om je te helpen je perfecte match te vinden.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">Home</a>
              <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">Events</a>
              <a href="#" className="text-primary font-semibold">Activiteiten</a>
            </div>
            
            <div className="text-2xl font-bold">
              ONTM<span className="text-primary">❤️</span>ET
            </div>
            
            <div className="flex items-center gap-8">
              <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">Over Ons</a>
              <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">Evenementen</a>
              <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">Blog</a>
              <a href="#" className="text-foreground hover:text-foreground/80 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            VIND JOUW MATCH: DE DIGITAL DATE <Heart className="inline w-10 h-10 text-primary fill-primary" />
          </h1>
          
          <p className="text-lg text-white/90 max-w-3xl mx-auto">
            Onze agent stelt vragen. Jij vindt antwoorden. En hopelijk jouw partner
          </p>
        </div>
      </section>

      {/* Main Content - Chat Interface */}
      <section className="flex-1 bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-[400px,1fr] gap-8 max-w-6xl mx-auto">
            {/* Rules Box */}
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 h-fit">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary fill-primary" />
                <h3 className="font-semibold text-lg">De Spelregels & Verwachtanigen</h3>
              </div>
              
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Wat je kunt vereakenten: 10-15 vragen. Wat wel/mgl taaleqtuinq:</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Respectvol taalutstiuq.</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Privacy. Anoni verkletuinq</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Volgende Slap: Persoonlijk profiel</span>
                </li>
              </ul>
            </div>

            {/* Chat Box */}
            <div className="bg-card rounded-2xl shadow-lg overflow-hidden flex flex-col" style={{ height: "600px" }}>
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
                />
                <Button 
                  onClick={handleSendMessage}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  Start Chat
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[hsl(215,28%,17%)] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-8">
              ONTM<span className="text-primary">❤️</span>ET
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a href="#" className="hover:text-primary transition-colors">Home</a>
              <a href="#" className="hover:text-primary transition-colors">Blog</a>
              <a href="#" className="hover:text-primary transition-colors">Over Ons</a>
              <a href="#" className="text-primary font-semibold">Activiteiten</a>
              <a href="#" className="hover:text-primary transition-colors">Brouwerij</a>
              <a href="#" className="hover:text-primary transition-colors">Event's</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="text-center text-sm text-white/60">
            © 2025 In de buurt ontmoet
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
