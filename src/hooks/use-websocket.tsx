import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "WebSocket connection established",
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        toast({
          title: "Disconnected",
          description: "WebSocket connection closed",
          variant: "destructive",
        });
        // Attempt to reconnect after 5 seconds
        setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to establish WebSocket connection",
          variant: "destructive",
        });
      };

      setSocket(ws);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to establish WebSocket connection",
        variant: "destructive",
      });
    }
  }, [url, toast]);

  useEffect(() => {
    connect();
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    }
  }, [socket, isConnected]);

  return { isConnected, sendMessage };
}