import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { Db, Goal, Homework, ProgressNote, RepertoireItem, Role } from "@/lib/noti/types";
import { signatureFor, weeklyRollup } from "@/lib/noti/service";
import { dashboardPathFor, useNoti } from "@/lib/noti/store";

/** Blocks a signed-in user from opening another role's dashboard (AUTH-06). */
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useNoti();
  if (!user) return null;
  if (user.role !== role) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <ShieldAlert className="w-10 h-10 mx-auto text-destructive" aria-hidden />
        <h1 className="font-display text-3xl mt-4">Access denied</h1>
        <p className="text-muted-foreground mt-2">This area is not available for your account.</p>
        <Link to={dashboardPathFor(user.role)} className="inline-block mt-6 text-primary font-medium hover:underline">Go to your dashboard</Link>
      </div>
    );
  }
  return <>{children}</>;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-4xl">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-4xl mt-1">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-lg">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{children}</p>;
}

export function NoteStatus({ db, note }: { db: Db; note: ProgressNote }) {
  if (note.status === "withdrawn") return <Badge variant="outline">Withdrawn</Badge>;
  const sig = signatureFor(db, note.id);
  return sig ? (
    <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" aria-hidden />Signed {format(sig.signedAt, "d MMM, HH:mm")}</Badge>
  ) : (
    <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" aria-hidden />Pending signature</Badge>
  );
}

export function NoteItem({ db, note, actions }: { db: Db; note: ProgressNote; actions?: ReactNode }) {
  const teacher = db.users.find((u) => u.id === note.teacherId);
  return (
    <article className="rounded-xl border border-border p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{note.title}</h3>
          <p className="text-xs text-muted-foreground">
            {teacher?.name} · {formatDistanceToNow(note.createdAt, { addSuffix: true })}{note.editedAt ? " · edited" : ""}
          </p>
        </div>
        <NoteStatus db={db} note={note} />
      </div>
      <p className="text-sm whitespace-pre-wrap">{note.body}</p>
      {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
    </article>
  );
}

export function SignedProgress({ signed, total, percent }: { signed: number; total: number; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span>{signed} of {total} notes signed</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <Progress value={percent} aria-label={`${percent}% of notes signed`} />
    </div>
  );
}

export function GoalList({ goals, onToggle }: { goals: Goal[]; onToggle?: (id: string) => void }) {
  if (!goals.length) return <Empty>No goals set yet.</Empty>;
  return (
    <ul className="space-y-2">
      {goals.map((g) => (
        <li key={g.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className={g.achieved ? "line-through text-muted-foreground" : "font-medium"}>{g.title}</p>
            <p className="text-xs text-muted-foreground">Target {format(new Date(g.targetDate), "d MMM yyyy")}</p>
          </div>
          {onToggle ? (
            <button type="button" className="text-xs text-primary hover:underline shrink-0" onClick={() => onToggle(g.id)}>{g.achieved ? "Reopen" : "Mark achieved"}</button>
          ) : g.achieved ? <Badge>Achieved</Badge> : <Badge variant="secondary">In progress</Badge>}
        </li>
      ))}
    </ul>
  );
}

export function HomeworkList({ items, onToggle }: { items: Homework[]; onToggle?: (id: string) => void }) {
  if (!items.length) return <Empty>No homework right now.</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((h) => (
        <li key={h.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <Checkbox id={`hw-${h.id}`} checked={!!h.completedAt} disabled={!onToggle} onCheckedChange={() => onToggle?.(h.id)} aria-label={`Mark "${h.title}" done`} />
          <label htmlFor={`hw-${h.id}`} className="flex-1">
            <span className={h.completedAt ? "line-through text-muted-foreground" : ""}>{h.title}</span>
            <span className="block text-xs text-muted-foreground">Due {format(new Date(h.dueDate), "EEE d MMM")}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

const stages = [
  { key: "learning", label: "Learning" },
  { key: "polishing", label: "Polishing" },
  { key: "mastered", label: "Mastered" },
] as const;

/** The learner's growth tree: pieces grouped by how far along they are. */
export function RepertoireTree({ items, onAdvance }: { items: RepertoireItem[]; onAdvance?: (id: string) => void }) {
  if (!items.length) return <Empty>No pieces added yet.</Empty>;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stages.map((s) => (
        <div key={s.key} className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{s.label} · {items.filter((i) => i.status === s.key).length}</p>
          <ul className="space-y-2">
            {items.filter((i) => i.status === s.key).map((i) => (
              <li key={i.id} className="rounded-lg bg-card border border-border p-2.5">
                <p className="text-sm font-medium">{i.title}</p>
                <p className="text-xs text-muted-foreground">{i.composer} · {i.grade}</p>
                {onAdvance && (
                  <button type="button" className="text-xs text-primary hover:underline mt-1" onClick={() => onAdvance(i.id)}>
                    {i.status === "mastered" ? "Move back to learning" : "Move forward"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AttendanceSummary({ studentId }: { studentId: string }) {
  const { db, user } = useNoti();
  if (!db || !user) return null;
  const r = weeklyRollup(db, user, studentId);
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {[["Present", r.present], ["Absent", r.absent], ["Excused", r.excused], ["Rate", `${r.rate}%`]].map(([l, v]) => (
        <div key={l} className="rounded-lg bg-muted/50 p-3">
          <p className="font-display text-2xl">{v}</p>
          <p className="text-xs text-muted-foreground">{l}</p>
        </div>
      ))}
    </div>
  );
}
