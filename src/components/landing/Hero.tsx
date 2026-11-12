import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import heroImg from "@/assets/noti-dashboard.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-mesh)" }} />
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground mb-8">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Built for modern classrooms & private tutors
        </div>
        <h1 className="font-display text-5xl md:text-7xl leading-[1.05] text-balance">
          Every note, goal, and milestone —
          <span className="italic" style={{ color: "var(--primary)" }}> in one place.</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
          Noti is the calm, role-based platform that keeps students, teachers, and parents
          perfectly in sync. Share lesson notes, track homework, set goals, and watch
          progress unfold — in real time.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button size="lg" className="rounded-full h-12 px-7 text-base shadow-[var(--shadow-glow)]">
            Start free trial <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="ghost" className="rounded-full h-12 px-6 text-base">
            Book a demo
          </Button>
        </div>
        <div className="mt-16 relative mx-auto max-w-5xl">
          <div className="absolute -inset-6 rounded-[2rem] blur-2xl opacity-60" style={{ background: "var(--gradient-warm)" }} />
          <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-[var(--shadow-soft)]">
            <img src={heroImg} alt="Noti dashboard preview" width={1536} height={1152} className="w-full h-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
