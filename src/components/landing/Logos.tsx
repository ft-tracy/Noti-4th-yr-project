export function Logos() {
  const items = ["Westfield Academy", "Bright Tutors", "Maple Grove School", "Linden Prep", "EduCollective"];
  return (
    <section className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground">
        <span className="text-xs uppercase tracking-widest">Trusted by educators at</span>
        {items.map((i) => (
          <span key={i} className="font-display text-lg" style={{ color: "var(--ink-soft)" }}>{i}</span>
        ))}
      </div>
    </section>
  );
}
