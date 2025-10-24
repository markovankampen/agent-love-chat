import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Heart, Send, LogOut, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  const [webhookUrl, setWebhookUrl] = useState(
    localStorage.getItem("n8n_webhook_url") || ""
  );
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
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

      setUserEmail(session.user.email || "");

      // Get username from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.username) {
        setUsername(profile.username);
      }

      // Load conversation history from database
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading conversations:", error);
      } else if (conversations && conversations.length > 0) {
        const loadedMessages: Message[] = conversations.map((conv) => ({
          id: conv.id,
          role: conv.role as "user" | "agent",
          content: conv.content,
          timestamp: new Date(conv.created_at),
        }));
        setMessages(loadedMessages);
      } else {
        // First time user - show welcome message
        const welcomeMessage: Message = {
          id: "welcome",
          role: "agent",
          content: "Hey there! 👋 I'm Agent Love, your personal matchmaker from Twente! Ready to find your perfect match? Let's start by getting to know you a bit better. What brings you here today?",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        
        // Save welcome message to database
        await supabase.from("conversations").insert({
          user_id: session.user.id,
          role: "agent",
          content: welcomeMessage.content,
        });
      }

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
    toast({ title: "See you soon! 💕" });
    navigate("/");
  };

  const saveWebhookUrl = () => {
    localStorage.setItem("n8n_webhook_url", webhookUrl);
    setIsConfigOpen(false);
    toast({ 
      title: "Configuration saved! ✅", 
      description: "Your n8n webhook is now connected." 
    });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (!webhookUrl) {
      toast({
        title: "Webhook not configured",
        description: "Please configure your n8n webhook URL in settings",
        variant: "destructive",
      });
      setIsConfigOpen(true);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const messageContent = inputValue;
    setInputValue("");
    setIsTyping(true);

    // Save user message to database
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
        title: "Error",
        description: "Failed to save your message",
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
      console.log("Sending message to n8n:", webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_email: userEmail,
          username: username,
          user_id: session.user.id,
          message: messageContent,
          timestamp: new Date().toISOString(),
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received response from n8n:", data);

      const agentContent = data.response || data.message || "I received your message! Let me think about that... 🤔";

      // Save agent response to database
      const { data: agentMsgData, error: agentMsgError } = await supabase
        .from("conversations")
        .insert({
          user_id: session.user.id,
          role: "agent",
          content: agentContent,
        })
        .select()
        .single();

      if (agentMsgError) {
        console.error("Error saving agent message:", agentMsgError);
      }

      const agentMessage: Message = {
        id: agentMsgData?.id || (Date.now() + 1).toString(),
        role: "agent",
        content: agentContent,
        timestamp: new Date(agentMsgData?.created_at || new Date()),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error("Error calling n8n webhook:", error);
      toast({
        title: "Connection error",
        description: "Failed to reach n8n. Please check your webhook URL and try again.",
        variant: "destructive",
      });

      // Remove the user message from UI and database if webhook fails
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      await supabase.from("conversations").delete().eq("id", userMessage.id);
    } finally {
      setIsTyping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-purple rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-soft">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <p className="text-muted-foreground">Loading your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-purple rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">
                {username ? `Hey, ${username}!` : "Agent Love"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {webhookUrl ? "Connected to n8n ✓" : "Configure n8n webhook"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>n8n Webhook Configuration</DialogTitle>
                  <DialogDescription>
                    Enter your n8n webhook URL to connect Agent Love with your workflows
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook">n8n Webhook URL</Label>
                    <Input
                      id="webhook"
                      placeholder="https://your-n8n-instance.com/webhook/..."
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create a webhook trigger in n8n and paste the URL here
                    </p>
                  </div>
                  <Button onClick={saveWebhookUrl} className="w-full">
                    Save Configuration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-slide-up ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "agent" && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-purple text-white text-xs">
                    AL
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-warm text-white"
                    : "bg-card border"
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
              {message.role === "user" && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-secondary text-white text-xs">
                    {username ? username.substring(0, 2).toUpperCase() : "You"}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 justify-start animate-pulse-soft">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-purple text-white text-xs">
                  AL
                </AvatarFallback>
              </Avatar>
              <div className="bg-card border rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="border-t bg-card shadow-lg">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button 
              type="submit" 
              size="icon" 
              className="bg-gradient-warm hover:opacity-90 transition-opacity"
              disabled={!inputValue.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default Chat;
