const steps = [
  { n: "01", title: "Teachers create", desc: "Lesson notes, homework, and term goals — published with a click." },
  { n: "02", title: "Students engage", desc: "Notes appear instantly in their feed, ready to read and sign." },
  { n: "03", title: "Parents observe", desc: "A live progress bar shows engagement, signed notes, and goals." },
];

export function Workflow() {
  return (
    <section id="workflow" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm uppercase tracking-widest text-primary mb-3">How it works</p>
          <h2 className="text-4xl md:text-5xl">Three steps. Total transparency.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="rounded-3xl p-8 bg-card border border-border">
              <div className="font-display text-5xl mb-4" style={{ color: "var(--primary)" }}>{s.n}</div>
              <h3 className="text-xl mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
