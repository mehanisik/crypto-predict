"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { ThemeToggle } from "../theme/theme-toggle";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "../ui/button";

export function Navbar() {
  const { isConnected, error, reconnect } = useWebSocket();

  return (
    <nav className="border-b h-14">
      <div className="container mx-auto flex h-full items-center px-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold">CryptoPredict</span>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          {/* WebSocket Connection Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-lg border">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {error && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={reconnect}
                className="text-red-500 hover:text-red-600"
              >
                <RefreshCw className="h-4 w-4" />
                Reconnect
              </Button>
            )}
          </div>
          
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
