import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceSummary, Empty, GoalList, HomeworkList, NoteItem, PageTitle, RepertoireTree, RoleGate, Section, SignedProgress, Stat } from "@/components/app/shared";
import { bookSlot, cancelBooking, notesFor, progressRatio, signatureFor, signNote, toggleHomework } from "@/lib/noti/service";
import { useNoti } from "@/lib/noti/store";

export const Route = createFileRoute("/dashboard/student")({
  component: () => <RoleGate role="student"><StudentDashboard /></RoleGate>,
});

function StudentDashboard() {
  const { db, user, run } = useNoti();
  if (!db || !user) return null;
  const notes = notesFor(db, user, user.id);
  const ratio = progressRatio(db, user, user.id);
  const homework = db.homework.filter((h) => h.studentId === user.id);
  const goals = db.goals.filter((g) => g.studentId === user.id);
  const classIds = new Set(db.enrolments.filter((e) => e.studentId === user.id).map((e) => e.classId));
  const now = Date.now();
  const openSlots = db.slots.filter((s) => classIds.has(s.classId) && !s.bookedBy && s.start > now).sort((a, b) => a.start - b.start);
  const mySlots = db.slots.filter((s) => s.bookedBy === user.id && s.start > now).sort((a, b) => a.start - b.start);
  const className = (id: string) => db.classes.find((c) => c.id === id)?.name ?? "";
  const pending = notes.filter((n) => !signatureFor(db, n.id)).length;

  return (
    <>
      <PageTitle title={`Hi, ${user.name.split(" ")[0]}`} subtitle="Your lessons, practice and progress in one place." />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Notes to sign" value={pending} />
        <Stat label="Homework left" value={homework.filter((h) => !h.completedAt).length} />
        <Stat label="Active goals" value={goals.filter((g) => !g.achieved).length} />
        <Stat label="Upcoming lessons" value={mySlots.length} />
      </div>
      <Tabs defaultValue="notes">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="notes">Lesson notes</TabsTrigger>
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="growth">Growth tree</TabsTrigger>
          <TabsTrigger value="lessons">Book lessons</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="space-y-4 mt-4">
          <Section title="Signing progress"><SignedProgress {...ratio} /></Section>
          {notes.length === 0 && <Empty>Your teacher hasn't sent any notes yet.</Empty>}
          {notes.map((n) => (
            <NoteItem key={n.id} db={db} note={n} actions={!signatureFor(db, n.id) && (
              <AlertDialog>
                <AlertDialogTrigger asChild><Button size="sm"><PenLine className="w-4 h-4" aria-hidden /> Read and sign</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign "{n.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>Signing confirms you have read this note. Your name and the time are recorded and cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => run((d, u) => signNote(d, u, n.id), "Note signed")}>Sign note</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )} />
          ))}
        </TabsContent>

        <TabsContent value="practice" className="grid gap-4 md:grid-cols-2 mt-4">
          <Section title="Homework"><HomeworkList items={homework} onToggle={(id) => run((d, u) => toggleHomework(d, u, id))} /></Section>
          <Section title="Term goals"><GoalList goals={goals} /></Section>
          <Section title="This week's attendance"><AttendanceSummary studentId={user.id} /></Section>
        </TabsContent>

        <TabsContent value="growth" className="mt-4">
          <Section title="My repertoire"><RepertoireTree items={db.repertoire.filter((r) => r.studentId === user.id)} /></Section>
        </TabsContent>

        <TabsContent value="lessons" className="grid gap-4 md:grid-cols-2 mt-4">
          <Section title="My upcoming lessons">
            {mySlots.length === 0 ? <Empty>No lessons booked.</Empty> : (
              <ul className="space-y-2">{mySlots.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <span><span className="font-medium block">{format(s.start, "EEE d MMM, HH:mm")}</span><span className="text-xs text-muted-foreground">{className(s.classId)} · {s.durationMin} min</span></span>
                  <Button size="sm" variant="outline" onClick={() => run((d, u) => cancelBooking(d, u, s.id), "Booking cancelled")}>Cancel</Button>
                </li>))}
              </ul>
            )}
          </Section>
          <Section title="Open slots">
            {openSlots.length === 0 ? <Empty>No open slots right now.</Empty> : (
              <ul className="space-y-2">{openSlots.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <span><span className="font-medium block">{format(s.start, "EEE d MMM, HH:mm")}</span><span className="text-xs text-muted-foreground">{className(s.classId)} · {s.durationMin} min</span></span>
                  <Button size="sm" onClick={() => run((d, u) => bookSlot(d, u, s.id), "Lesson booked")}>Book</Button>
                </li>))}
              </ul>
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </>
  );
}
