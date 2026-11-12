import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttendanceSummary, Empty, GoalList, HomeworkList, NoteItem, PageTitle, RepertoireTree, RoleGate, Section, SignedProgress } from "@/components/app/shared";
import { NotiError, notesFor, parentChildIds, progressRatio, redeemLinkCode } from "@/lib/noti/service";
import { useNoti } from "@/lib/noti/store";

export const Route = createFileRoute("/dashboard/parent")({
  component: () => <RoleGate role="parent"><ParentDashboard /></RoleGate>,
});

function LinkChildDialog() {
  const { run } = useNoti();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    let msg: string | undefined;
    const ok = run((d, u) => {
      try {
        const r = redeemLinkCode(d, u, code);
        msg = r.error;
        return r.db;
      } catch (err) {
        if (err instanceof NotiError) { msg = err.message; return d; }
        throw err;
      }
    });
    if (ok && !msg) { setOpen(false); setCode(""); setError(null); }
    else setError(msg ?? "Could not link this child");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Link2 className="w-4 h-4" aria-hidden /> Link a child</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link your child</DialogTitle>
          <DialogDescription>Enter the 8-character code from your child's teacher. Codes work once and expire after 7 days.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Label htmlFor="code">Link code</Label>
          <Input id="code" value={code} maxLength={8} autoComplete="off" className="font-mono tracking-widest uppercase" onChange={(e) => setCode(e.target.value)} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">Link child</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ParentDashboard() {
  const { db, user } = useNoti();
  const [selected, setSelected] = useState<string | null>(null);
  if (!db || !user) return null;
  const childIds = parentChildIds(db, user.id);
  const children = db.users.filter((u) => childIds.includes(u.id));
  const childId = selected && childIds.includes(selected) ? selected : children[0]?.id;
  const child = children.find((c) => c.id === childId);

  return (
    <>
      <PageTitle title="Family hub" subtitle="Follow lessons, practice and attendance for each child." action={<LinkChildDialog />} />
      {!child ? (
        <Section title="No children linked yet"><Empty>Ask your child's teacher for a link code, then press "Link a child".</Empty></Section>
      ) : (
        <div className="space-y-4">
          {children.length > 1 && (
            <div className="max-w-xs">
              <Label htmlFor="child" className="mb-2 block">Viewing</Label>
              <Select value={child.id} onValueChange={setSelected}>
                <SelectTrigger id="child"><SelectValue /></SelectTrigger>
                <SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Section title={`${child.name.split(" ")[0]}'s progress`}><SignedProgress {...progressRatio(db, user, child.id)} /></Section>
            <Section title="Attendance this week"><AttendanceSummary studentId={child.id} /></Section>
            <Section title="Homework"><HomeworkList items={db.homework.filter((h) => h.studentId === child.id)} /></Section>
            <Section title="Term goals"><GoalList goals={db.goals.filter((g) => g.studentId === child.id)} /></Section>
          </div>
          <Section title="Growth tree"><RepertoireTree items={db.repertoire.filter((r) => r.studentId === child.id)} /></Section>
          <Section title="Lesson notes">
            <div className="space-y-3">
              {notesFor(db, user, child.id).map((n) => <NoteItem key={n.id} db={db} note={n} />)}
              {notesFor(db, user, child.id).length === 0 && <Empty>No notes yet.</Empty>}
            </div>
          </Section>
        </div>
      )}
    </>
  );
}
