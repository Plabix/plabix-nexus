"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { DashboardNav } from "@/components/dashboard/nav";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface DashboardShellProps {
  organizationName: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function DashboardShell({
  organizationName,
  userName,
  userEmail,
  children,
}: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/dashboard" className="font-display text-lg font-semibold tracking-tight">
            Second Brain
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <DashboardNav />
        </div>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          <p className="truncate font-medium text-foreground">{organizationName}</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle className="font-display">Second Brain</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <DashboardNav onNavigate={() => setMobileNavOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-medium text-sm lg:hidden">{organizationName}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu name={userName} email={userEmail} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
