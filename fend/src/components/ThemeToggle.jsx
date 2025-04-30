"use client";

import * as React from "react";
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const getCurrentThemeDisplay = () => {
    switch (theme) {
      case "light":
        return { icon: <Sun className="h-4 w-4 mr-2" />, label: "Light" };
      case "dark":
        return { icon: <Moon className="h-4 w-4 mr-2" />, label: "Dark" };
      default:
        return { icon: <Monitor className="h-4 w-4 mr-2" />, label: "System" };
    }
  };

  const currentDisplay = getCurrentThemeDisplay();

  return (
    <div
      className="px-3"
    >
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start px-3">
          {currentDisplay.icon}
          <span>{currentDisplay.label}</span>
          <ChevronDown className="ml-auto h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}