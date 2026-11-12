import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
            <Bell className="w-4 h-4" aria-hidden />
          </div>
          <span className="font-display text-3xl">Noti</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <h1 className="font-display text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>
          {children}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
      </div>
    </div>
  );
}
