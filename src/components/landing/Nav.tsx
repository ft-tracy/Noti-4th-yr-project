import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
            <Bell className="w-4 h-4" />
          </div>
          <span className="font-display text-2xl">Noti</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#roles" className="hover:text-foreground transition">For You</a>
          <a href="#features" className="hover:text-foreground transition">Features</a>
          <a href="#workflow" className="hover:text-foreground transition">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
          <Button size="sm" className="rounded-full" asChild><Link to="/signup">Get started</Link></Button>
        </div>
      </div>
    </header>
  );
}
