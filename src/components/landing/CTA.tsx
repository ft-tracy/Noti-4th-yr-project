import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative rounded-[2rem] overflow-hidden p-12 md:p-16 text-center text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 30% 20%, var(--primary-foreground), transparent 50%)" }} />
          <h2 className="relative text-4xl md:text-5xl mb-4">Bridge the gap. Today.</h2>
          <p className="relative max-w-xl mx-auto opacity-90 mb-8 text-lg">
            Join the schools and tutors using Noti to create transparent, accountable
            learning environments their families love.
          </p>
          <div className="relative flex items-center justify-center gap-3">
            <Button size="lg" variant="secondary" className="rounded-full h-12 px-7 text-base">
              Get started free <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="ghost" className="rounded-full h-12 px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Talk to us
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
