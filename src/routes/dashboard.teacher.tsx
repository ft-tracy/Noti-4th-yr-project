import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, GoalList, HomeworkList, NoteItem, PageTitle, RepertoireTree, RoleGate, Section, Stat } from "@/components/app/shared";
import {
  addRepertoire, advanceRepertoire, assignHomework, canEditNote, createClass, createNote, createSlot, editNote,
  enrolStudent, issueLinkCode, markAttendance, notesFor, setGoal, signatureFor, teacherStudentIds, toggleGoal, withdrawNote,
} from "@/lib/noti/service";
import { NOTE_BODY_MAX } from "@/lib/noti/validation";
import { useNoti } from "@/lib/noti/store";
import type { AttendanceStatus } from "@/lib/noti/types";

export const Route = createFileRoute("/dashboard/teacher")({
  component: () => <RoleGate role="teacher"><TeacherDashboard /></RoleGate>,
});

const today = () => new Date().toISOString().slice(0, 10);

function TeacherDashboard() {
  const { db, user } = useNoti();
  const [studentId, setStudentId] = useState<string | null>(null);
  if (!db || !user) return null;
  const myClasses = db.classes.filter((c) => c.teacherId === user.id);
  const ids = teacherStudentIds(db, user.id);
  const students = db.users.filter((u) => ids.has(u.id));
  const current = students.find((s) => s.id === studentId) ?? students[0];
  const myNotes = db.notes.filter((n) => n.teacherId === user.id && n.status === "sent");
  const unsigned = myNotes.filter((n) => !signatureFor(db, n.id)).length;
  const upcoming = db.slots.filter((s) => s.teacherId === user.id && s.start > Date.now()).length;

  return (
    <>
      <PageTitle title={`Karibu, ${user.name.replace(/^(Mr|Ms|Mrs)\.\s*/, "").split(" ")[0]}`} subtitle="Your learners, notes and lessons." />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Learners" value={students.length} />
        <Stat label="Classes" value={myClasses.length} />
        <Stat label="Awaiting signature" value={unsigned} />
        <Stat label="Upcoming slots" value={upcoming} />
      </div>
      <Tabs defaultValue="learners">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="learners">Learners</TabsTrigger>
          <TabsTrigger value="schedule">Schedule & attendance</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>
        <TabsContent value="learners" className="mt-4">
          {!current ? <Section title="No learners yet"><Empty>Create a class and enrol learners in the Classes tab.</Empty></Section> : (
            <div className="space-y-4">
              <div className="max-w-xs">
                <Label htmlFor="learner" className="mb-2 block">Learner</Label>
                <Select value={current.id} onValueChange={setStudentId}>
                  <SelectTrigger id="learner"><SelectValue /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <LearnerPanel studentId={current.id} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="schedule" className="mt-4"><SchedulePanel /></TabsContent>
        <TabsContent value="classes" className="mt-4"><ClassesPanel /></TabsContent>
      </Tabs>
    </>
  );
}

function LearnerPanel({ studentId }: { studentId: string }) {
  const { db, user, run } = useNoti();
  const [code, setCode] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", body: "" });
  const [goal, setGoalForm] = useState({ title: "", startDate: today(), targetDate: "" });
  const [hw, setHw] = useState({ title: "", dueDate: "" });
  const [piece, setPiece] = useState({ title: "", composer: "", grade: "" });
  useEffect(() => setCode(null), [studentId]);
  if (!db || !user) return null;
  const notes = notesFor(db, user, studentId);
  const classes = db.classes.filter((c) => c.teacherId === user.id && db.enrolments.some((e) => e.classId === c.id && e.studentId === studentId));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <NoteComposer studentId={studentId} classId={classes[0]?.id ?? ""} />
        <Section title="Notes sent">
          <div className="space-y-3">
            {notes.length === 0 && <Empty>No notes yet.</Empty>}
            {notes.map((n) => editing === n.id ? (
              <form key={n.id} className="space-y-2 rounded-xl border border-primary p-4" onSubmit={(e) => { e.preventDefault(); if (run((d, u) => editNote(d, u, n.id, edit), "Note updated")) setEditing(null); }}>
                <Input aria-label="Title" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
                <Textarea aria-label="Body" rows={4} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
                <div className="flex gap-2"><Button size="sm" type="submit">Save</Button><Button size="sm" variant="ghost" type="button" onClick={() => setEditing(null)}>Cancel</Button></div>
              </form>
            ) : (
              <NoteItem key={n.id} db={db} note={n} actions={canEditNote(db, user, n) ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(n.id); setEdit({ title: n.title, body: n.body }); }}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => run((d, u) => withdrawNote(d, u, n.id), "Note withdrawn")}>Withdraw</Button>
                  <span className="text-xs text-muted-foreground self-center">Editable until {format(n.createdAt + 86400000, "d MMM HH:mm")}</span>
                </>
              ) : n.status === "sent" && n.teacherId === user.id ? (
                <Button size="sm" variant="ghost" onClick={() => run((d, u) => withdrawNote(d, u, n.id), "Note withdrawn")}>Withdraw</Button>
              ) : null} />
            ))}
          </div>
        </Section>
      </div>
      <div className="space-y-4">
        <Section title="Parent link code">
          <p className="text-sm text-muted-foreground mb-3">Give this one-time code to the parent. It expires in 7 days.</p>
          {code ? (
            <div className="flex items-center gap-2">
              <code className="font-mono text-2xl tracking-[0.3em] rounded-lg bg-muted px-4 py-2">{code}</code>
              <Button size="icon" variant="ghost" aria-label="Copy code" onClick={() => { navigator.clipboard?.writeText(code); toast.success("Copied"); }}><Copy className="w-4 h-4" /></Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => run((d, u) => { const r = issueLinkCode(d, u, studentId); setCode(r.code); return r.db; })}><KeyRound className="w-4 h-4" aria-hidden /> Generate code</Button>
          )}
        </Section>
        <Section title="Term goals">
          <GoalList goals={db.goals.filter((g) => g.studentId === studentId)} onToggle={(id) => run((d, u) => toggleGoal(d, u, id))} />
          <form className="grid gap-2 mt-4" onSubmit={(e) => { e.preventDefault(); if (run((d, u) => setGoal(d, u, { ...goal, studentId }), "Goal set")) setGoalForm({ title: "", startDate: today(), targetDate: "" }); }}>
            <Input placeholder="New goal, e.g. Pass Grade 3" aria-label="Goal" value={goal.title} onChange={(e) => setGoalForm({ ...goal, title: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><Label htmlFor="gs" className="text-xs">Start</Label><Input id="gs" type="date" value={goal.startDate} onChange={(e) => setGoalForm({ ...goal, startDate: e.target.value })} /></div>
              <div><Label htmlFor="gt" className="text-xs">Target</Label><Input id="gt" type="date" value={goal.targetDate} onChange={(e) => setGoalForm({ ...goal, targetDate: e.target.value })} /></div>
            </div>
            <Button type="submit" size="sm" variant="secondary">Add goal</Button>
          </form>
        </Section>
        <Section title="Homework">
          <HomeworkList items={db.homework.filter((h) => h.studentId === studentId)} />
          <form className="grid grid-cols-[1fr_auto] gap-2 mt-4" onSubmit={(e) => { e.preventDefault(); if (run((d, u) => assignHomework(d, u, { ...hw, studentId }), "Homework assigned")) setHw({ title: "", dueDate: "" }); }}>
            <Input placeholder="Practice task" aria-label="Homework" value={hw.title} onChange={(e) => setHw({ ...hw, title: e.target.value })} />
            <Input type="date" aria-label="Due date" value={hw.dueDate} onChange={(e) => setHw({ ...hw, dueDate: e.target.value })} />
            <Button type="submit" size="sm" variant="secondary" className="col-span-2">Assign</Button>
          </form>
        </Section>
        <Section title="Growth tree">
          <RepertoireTree items={db.repertoire.filter((r) => r.studentId === studentId)} onAdvance={(id) => run((d, u) => advanceRepertoire(d, u, id))} />
          <form className="grid grid-cols-3 gap-2 mt-4" onSubmit={(e) => { e.preventDefault(); if (run((d, u) => addRepertoire(d, u, { ...piece, studentId }), "Piece added")) setPiece({ title: "", composer: "", grade: "" }); }}>
            <Input placeholder="Piece" aria-label="Piece" value={piece.title} onChange={(e) => setPiece({ ...piece, title: e.target.value })} />
            <Input placeholder="Composer" aria-label="Composer" value={piece.composer} onChange={(e) => setPiece({ ...piece, composer: e.target.value })} />
            <Input placeholder="Grade" aria-label="Grade" value={piece.grade} onChange={(e) => setPiece({ ...piece, grade: e.target.value })} />
            <Button type="submit" size="sm" variant="secondary" className="col-span-3">Add piece</Button>
          </form>
        </Section>
      </div>
    </div>
  );
}

/** Drafts are kept in this browser and saved as you type, so nothing is lost before sending. */
function NoteComposer({ studentId, classId }: { studentId: string; classId: string }) {
  const { user, run } = useNoti();
  const key = `noti.draft.${user?.id}.${studentId}`;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(key) ?? "null");
      setTitle(d?.title ?? ""); setBody(d?.body ?? ""); setSavedAt(d ? Date.now() : null);
    } catch { setTitle(""); setBody(""); }
  }, [key]);

  useEffect(() => {
    if (!title && !body) return;
    const t = setTimeout(() => { localStorage.setItem(key, JSON.stringify({ title, body })); setSavedAt(Date.now()); }, 800);
    return () => clearTimeout(t);
  }, [title, body, key]);

  function send(e: FormEvent) {
    e.preventDefault();
    if (run((d, u) => createNote(d, u, { studentId, classId, title, body }), "Note sent")) {
      localStorage.removeItem(key); setTitle(""); setBody(""); setSavedAt(null);
    }
  }

  return (
    <Section title="Write a lesson note" action={savedAt ? <span className="text-xs text-muted-foreground">Draft saved</span> : null}>
      <form onSubmit={send} className="space-y-3">
        <Input placeholder="Title, e.g. Scales and Minuet" aria-label="Note title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="What you worked on, what went well, what to practise…" aria-label="Note body" rows={5} maxLength={NOTE_BODY_MAX} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{body.length}/{NOTE_BODY_MAX}</span>
          <Button type="submit" disabled={!classId}>Send note</Button>
        </div>
      </form>
    </Section>
  );
}

function SchedulePanel() {
  const { db, user, run } = useNoti();
  const [slot, setSlot] = useState({ classId: "", start: "", durationMin: "45" });
  if (!db || !user) return null;
  const myClasses = db.classes.filter((c) => c.teacherId === user.id);
  const slots = db.slots.filter((s) => s.teacherId === user.id).sort((a, b) => b.start - a.start);
  const now = Date.now();
  const name = (id?: string) => db.users.find((u) => u.id === id)?.name;
  const statusFor = (slotId: string) => db.attendance.find((a) => a.slotId === slotId)?.status;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <Section title="Add a lesson slot">
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault();
          const start = new Date(slot.start).getTime();
          if (run((d, u) => createSlot(d, u, { classId: slot.classId || myClasses[0]?.id, start: Number.isNaN(start) ? 0 : start, durationMin: Number(slot.durationMin) }), "Slot added"))
            setSlot({ ...slot, start: "" });
        }}>
          <div><Label htmlFor="sc" className="text-xs">Class</Label>
            <Select value={slot.classId || myClasses[0]?.id || ""} onValueChange={(v) => setSlot({ ...slot, classId: v })}>
              <SelectTrigger id="sc"><SelectValue placeholder="Choose class" /></SelectTrigger>
              <SelectContent>{myClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label htmlFor="ss" className="text-xs">Start</Label><Input id="ss" type="datetime-local" value={slot.start} onChange={(e) => setSlot({ ...slot, start: e.target.value })} /></div>
          <div><Label htmlFor="sd" className="text-xs">Minutes</Label><Input id="sd" type="number" min={15} max={180} step={15} value={slot.durationMin} onChange={(e) => setSlot({ ...slot, durationMin: e.target.value })} /></div>
          <Button type="submit" className="w-full">Add slot</Button>
        </form>
      </Section>
      <Section title="Lessons">
        {slots.length === 0 ? <Empty>No slots yet.</Empty> : (
          <ul className="space-y-2">{slots.map((s) => {
            const past = s.start <= now;
            const st = statusFor(s.id);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                <span>
                  <span className="font-medium block">{format(s.start, "EEE d MMM, HH:mm")} · {s.durationMin} min</span>
                  <span className="text-xs text-muted-foreground">{s.bookedBy ? `Booked by ${name(s.bookedBy)}` : "Open"}</span>
                </span>
                {past && s.bookedBy ? (
                  <div className="flex gap-1" role="group" aria-label="Attendance">
                    {(["present", "absent", "excused"] as AttendanceStatus[]).map((a) => (
                      <Button key={a} size="sm" variant={st === a ? "default" : "outline"} aria-pressed={st === a}
                        onClick={() => run((d, u) => markAttendance(d, u, s.id, a), "Attendance saved")} className="capitalize">{a}</Button>
                    ))}
                  </div>
                ) : !past && s.bookedBy ? <span className="text-xs text-muted-foreground">Upcoming</span> : null}
              </li>
            );
          })}</ul>
        )}
      </Section>
    </div>
  );
}

function ClassesPanel() {
  const { db, user, run } = useNoti();
  const [cls, setCls] = useState({ name: "", instrument: "", fee: "" });
  const [enrol, setEnrol] = useState<Record<string, string>>({});
  if (!db || !user) return null;
  const myClasses = db.classes.filter((c) => c.teacherId === user.id);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <Section title="New class">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (run((d, u) => createClass(d, u, cls.name, cls.instrument, Number(cls.fee || 0)), "Class created")) setCls({ name: "", instrument: "", fee: "" }); }}>
          <Input placeholder="Class name" aria-label="Class name" value={cls.name} onChange={(e) => setCls({ ...cls, name: e.target.value })} />
          <Input placeholder="Instrument" aria-label="Instrument" value={cls.instrument} onChange={(e) => setCls({ ...cls, instrument: e.target.value })} />
          <Input placeholder="Term fee (KES)" aria-label="Term fee in KES" type="number" min={0} value={cls.fee} onChange={(e) => setCls({ ...cls, fee: e.target.value })} />
          <Button type="submit" className="w-full">Create class</Button>
        </form>
      </Section>
      <Section title="My classes">
        {myClasses.length === 0 ? <Empty>No classes yet.</Empty> : (
          <ul className="space-y-3">{myClasses.map((c) => (
            <li key={c.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{c.name}</span>
                <span className="text-sm text-muted-foreground">{c.instrument} · KES {c.termFeeKes.toLocaleString()}/term</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {db.enrolments.filter((e) => e.classId === c.id).map((e) => db.users.find((u) => u.id === e.studentId)?.name).join(", ") || "No learners yet"}
              </p>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (run((d, u) => enrolStudent(d, u, c.id, enrol[c.id] ?? ""), "Learner enrolled")) setEnrol({ ...enrol, [c.id]: "" }); }}>
                <Input placeholder="Student's account email" aria-label={`Enrol student in ${c.name}`} type="email" value={enrol[c.id] ?? ""} onChange={(e) => setEnrol({ ...enrol, [c.id]: e.target.value })} />
                <Button type="submit" size="sm" variant="secondary">Enrol</Button>
              </form>
            </li>
          ))}</ul>
        )}
      </Section>
    </div>
  );
}
