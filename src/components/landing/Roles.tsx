import { GraduationCap, BookOpen, Heart, CheckCircle2 } from "lucide-react";

const roles = [
  { icon: GraduationCap, title: "Students", tag: "Stay on top of every lesson",
    points: ["Personalised welcome & stats", "Recent notes feed", "Homework & goals at a glance"] },
  { icon: BookOpen, title: "Teachers", tag: "A content & class management hub",
    points: ["Manage private + school rosters", "Create notes, homework & goals", "Track signed vs. pending"] },
  { icon: Heart, title: "Parents", tag: "Real-time visibility, zero chasing",
    points: ["Monitor multiple children", "Progress bar per child", "Open notes & goals instantly"] },
];

export function Roles() {
  return (
    <section id="roles" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm uppercase tracking-widest text-primary mb-3">Three dashboards. One story.</p>
          <h2 className="text-4xl md:text-5xl">A dedicated experience for every role.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {roles.map(({ icon: Icon, title, tag, points }) => (
            <div key={title} className="group relative rounded-3xl bg-card border border-border p-7 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5 text-primary-foreground" style={{ background: "var(--gradient-warm)" }}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-2xl mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground mb-5">{tag}</p>
              <ul className="space-y-2.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--primary)" }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
