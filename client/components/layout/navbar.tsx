"use client";

import { ThemeToggle } from "../theme/theme-toggle";
import { ConnectionStatus } from "../ui/connection-status";
import { useModelSocket } from "@/hooks/use-socket";

export function Navbar() {
  const { isConnected, error } = useModelSocket();

  return (
    <nav className="border-b h-14">
      <div className="container mx-auto flex h-full items-center px-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold">CryptoPredict</span>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          {/* WebSocket Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : error ? 'Error' : 'Connecting...'}
            </span>
          </div>
          
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
