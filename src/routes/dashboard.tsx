import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNoti } from "@/lib/noti/store";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — Noti" }, { name: "robots", content: "noindex" }] }),
  component: DashboardLayout,
});

const roleLabel = { teacher: "Tutor", student: "Student", parent: "Parent", admin: "School owner" } as const;

function DashboardLayout() {
  const { ready, user, signOut } = useNoti();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !user) navigate({ to: "/login", replace: true });
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground" role="status">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
              <Bell className="w-4 h-4" aria-hidden />
            </div>
            <span className="font-display text-2xl">Noti</span>
          </Link>
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-right min-w-0 hidden sm:block">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Badge variant="secondary">{roleLabel[user.role]}</Badge>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate({ to: "/login", replace: true }); }}>
              <LogOut className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
