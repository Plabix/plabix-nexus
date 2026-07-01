"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme is read from localStorage on the client; avoid a hydration
  // mismatch by only rendering the active state after mount.
  useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how Second Brain looks on this device.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex flex-1 flex-col items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary",
              mounted && theme === option.value && "border-primary bg-secondary"
            )}
          >
            <option.icon className="size-4" />
            {option.label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
