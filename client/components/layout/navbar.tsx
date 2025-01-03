"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "../ui/button";
import { BarChart3Icon } from "lucide-react";
export default function Navbar() {
  const isAuthenticated = false;

  return (
    <div className="border-b ">
      <div className="flex h-12 items-center container mx-auto">
        <div className="flex items-center space-x-2">
          <BarChart3Icon className="w-6 h-6" />
          <span className="font-bold text-xl">CryptoPredict</span>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button size="sm">Logout</Button>
          ) : (
            <Button>Login</Button>
          )}
        </div>
      </div>
    </div>
  );
}
