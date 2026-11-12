import { ShieldCheck, Clock, CheckCircle2, Target, Users, BookOpen } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Role-based access", desc: "Each user sees only what's relevant — securely isolated by role." },
  { icon: Clock, title: "Real-time updates", desc: "Notes, goals, and assignments sync instantly across every dashboard." },
  { icon: CheckCircle2, title: "Signature workflow", desc: "Auditable acknowledgements ensure notes don't slip through the cracks." },
  { icon: Target, title: "Goal tracking", desc: "Term goals visible to students and parents keep everyone aligned." },
  { icon: Users, title: "Multi-child support", desc: "Parents monitor every child from one account with individual stats." },
  { icon: BookOpen, title: "Private & school classes", desc: "Tutors and schools, side-by-side — managed in one platform." },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-secondary/40 border-y border-border/60">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl mb-14">
          <p className="text-sm uppercase tracking-widest text-primary mb-3">Platform features</p>
          <h2 className="text-4xl md:text-5xl">Thoughtful tools that disappear into your day.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-card border border-border p-6">
              <Icon className="w-5 h-5 mb-4" style={{ color: "var(--primary)" }} />
              <h3 className="text-lg mb-1.5 font-medium font-sans tracking-normal">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
