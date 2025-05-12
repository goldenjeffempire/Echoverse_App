
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const { messages, status, sendMessage } = useWebSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [localMessages, setLocalMessages] = useState([
    { type: "bot", content: "Hello! I'm your Echo Assistant. How can I help you today?" }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setLocalMessages(prev => {
        const existingContents = new Set(prev.map(m => m.content));
        const newMessages = messages.filter(m => !existingContents.has(m.content));
        return [...prev, ...newMessages];
      });
    }
  }, [messages]);

  const toggleChat = () => {
    if (!isOpen) {
      setIsMinimized(false);
    }
    setIsOpen(!isOpen);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    
    setLocalMessages(prev => [...prev, { type: "user", content: newMessage }]);
    
    const sent = sendMessage(newMessage);
    setNewMessage("");
    
    if (!sent) {
      setTimeout(() => {
        setLocalMessages(prev => [
          ...prev, 
          { 
            type: "bot", 
            content: "I'm having trouble connecting to the server. Please try again later." 
          }
        ]);
      }, 1000);
    }
  };

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-glow bg-primary hover:bg-primary-light z-50"
        onClick={toggleChat}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        <span className="absolute top-0 right-0 h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-cyan"></span>
        </span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(
              "fixed bottom-24 right-6 w-[400px] bg-dark-card border border-primary/30 rounded-xl shadow-glow overflow-hidden z-50 flex flex-col",
              isMinimized ? "h-auto" : "h-[600px]"
            )}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-dark-base p-4 flex justify-between items-center border-b border-primary/20">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/assets/ai-assistant.svg" />
                  <AvatarFallback className="bg-gradient-cosmic">E</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-white font-medium">Echo Assistant</h3>
                  <div className="flex items-center">
                    {status === 'open' ? (
                      <>
                        <span className="h-2 w-2 bg-success rounded-full mr-2"></span>
                        <span className="text-xs text-light-base/60">Online</span>
                      </>
                    ) : status === 'connecting' ? (
                      <>
                        <span className="h-2 w-2 bg-warning rounded-full mr-2"></span>
                        <span className="text-xs text-light-base/60">Connecting...</span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 bg-destructive rounded-full mr-2"></span>
                        <span className="text-xs text-light-base/60">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleMinimize}
                >
                  {isMinimized ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleChat}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div className="flex-1 p-4 overflow-y-auto bg-dark-base space-y-4">
                  {localMessages.map((message, index) => (
                    <motion.div 
                      key={index} 
                      className={`flex ${message.type === "user" ? "justify-end" : "items-start space-x-2"}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {message.type !== "user" && (
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarImage src="/assets/ai-assistant.svg" />
                          <AvatarFallback className="bg-gradient-cosmic">E</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn(
                        "p-3 rounded-lg max-w-[80%]",
                        message.type === "user" 
                          ? "bg-primary text-white" 
                          : "bg-dark-card text-light-base/80"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="p-4 border-t border-primary/20 bg-dark-base">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Type your message..." 
                      className="w-full bg-dark-card border border-primary/30 focus:border-primary rounded-lg pr-10 pl-4 py-2 text-light-base/90 placeholder-light-base/50 focus:outline-none transition-colors"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button 
                      type="submit"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      disabled={status !== 'open'}
                    >
                      {status === 'connecting' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                  {status !== 'open' && status !== 'connecting' && (
                    <p className="mt-2 text-xs text-destructive">Connection lost. Reconnecting...</p>
                  )}
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AIChatWidget;
