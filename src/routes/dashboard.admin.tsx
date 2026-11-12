import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, PageTitle, RoleGate, Section, Stat } from "@/components/app/shared";
import { addTeacher, changeRole } from "@/lib/noti/auth";
import { schoolReport } from "@/lib/noti/service";
import { runSecurityChecks, type CheckResult } from "@/lib/noti/security-checks";
import { useNoti } from "@/lib/noti/store";

export const Route = createFileRoute("/dashboard/admin")({
  component: () => <RoleGate role="admin"><AdminDashboard /></RoleGate>,
});

function AdminDashboard() {
  const { db, user } = useNoti();
  if (!db || !user) return null;
  const r = schoolReport(db, user);
  const school = db.schools.find((s) => s.id === user.schoolId);
  return (
    <>
      <PageTitle title={school?.name ?? "School"} subtitle="School overview, people and security." />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6">
        <Stat label="Teachers" value={r.teachers} />
        <Stat label="Students" value={r.students} />
        <Stat label="Parents" value={r.parents} />
        <Stat label="Lesson notes" value={r.notes} />
        <Stat label="Notes signed" value={`${r.signedPercent}%`} />
        <Stat label="Attendance" value={`${r.attendanceRate}%`} />
      </div>
      <Tabs defaultValue="people">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="audit">Activity log</TabsTrigger>
          <TabsTrigger value="security">Security check</TabsTrigger>
        </TabsList>
        <TabsContent value="people" className="mt-4"><PeoplePanel /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditPanel /></TabsContent>
        <TabsContent value="security" className="mt-4"><SecurityPanel /></TabsContent>
      </Tabs>
    </>
  );
}

function PeoplePanel() {
  const { db, user, run, runAsync } = useNoti();
  const [t, setT] = useState({ name: "", email: "", password: "" });
  if (!db || !user) return null;
  const people = db.users.filter((u) => u.schoolId === user.schoolId && u.role !== "admin");
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      <Section title="Add a teacher">
        <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); if (await runAsync((d, u) => addTeacher(d, u, t), "Teacher added")) setT({ name: "", email: "", password: "" }); }}>
          <Input placeholder="Full name" aria-label="Full name" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
          <Input placeholder="Email" aria-label="Email" type="email" value={t.email} onChange={(e) => setT({ ...t, email: e.target.value })} />
          <Input placeholder="Temporary password" aria-label="Temporary password" type="password" autoComplete="new-password" value={t.password} onChange={(e) => setT({ ...t, password: e.target.value })} />
          <Button type="submit" className="w-full">Add teacher</Button>
        </form>
      </Section>
      <Section title="People">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
            <TableBody>{people.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                <TableCell>
                  <Select value={p.role} onValueChange={(v) => run((d, u) => changeRole(d, u, p.id, v as "teacher"), "Role updated")}>
                    <SelectTrigger className="w-32" aria-label={`Role for ${p.name}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="teacher">Teacher</SelectItem><SelectItem value="student">Student</SelectItem><SelectItem value="parent">Parent</SelectItem></SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}

function AuditPanel() {
  const { db } = useNoti();
  if (!db) return null;
  const events = [...db.audit].sort((a, b) => b.at - a.at).slice(0, 100);
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? "Unknown";
  return (
    <Section title="Recent activity">
      <p className="text-sm text-muted-foreground mb-3">Every signing, edit, withdrawal and link is recorded here and cannot be changed.</p>
      {events.length === 0 ? <Empty>No activity yet.</Empty> : (
        <ul className="divide-y divide-border">{events.map((e) => (
          <li key={e.id} className="py-2 flex justify-between gap-2 text-sm">
            <span><span className="font-medium">{name(e.actorId)}</span> · {e.action.replace(".", " ").replace("_", " ")}</span>
            <span className="text-muted-foreground shrink-0">{format(e.at, "d MMM HH:mm")}</span>
          </li>
        ))}</ul>
      )}
    </Section>
  );
}

const checklist = [
  "Real database connected with Row-Level Security on every table",
  "Demo accounts and invented data deleted",
  "Site served only over HTTPS on the final domain",
  "Email confirmation and password reset turned on",
  "M-Pesa keys stored as server secrets, never in the code",
  "Consent collected from the school and each parent (Data Protection Act, 2019)",
  "Automated tests pass (npm test) and the security check below is all green",
  "Backups enabled and a restore tested once",
];

function SecurityPanel() {
  const { resetDemo } = useNoti();
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [ticked, setTicked] = useState<Record<number, boolean>>({});
  const passed = results?.filter((r) => r.passed).length ?? 0;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Automated security check" action={<Button size="sm" disabled={busy} onClick={async () => { setBusy(true); setResults(await runSecurityChecks()); setBusy(false); }}><ShieldCheck className="w-4 h-4" aria-hidden /> {busy ? "Running…" : "Run check"}</Button>}>
        <p className="text-sm text-muted-foreground mb-3">Tries to break the access rules using a separate copy of the demo data. Your real data is not touched.</p>
        {results && (
          <>
            <p className="mb-3"><Badge variant={passed === results.length ? "default" : "destructive"}>{passed} of {results.length} passed</Badge></p>
            <ul className="space-y-2">{results.map((r) => (
              <li key={r.id} className="flex gap-2 text-sm">
                {r.passed ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-label="Passed" /> : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-label="Failed" />}
                <span><span className="font-medium">{r.id}</span> {r.title}<span className="block text-xs text-muted-foreground">{r.detail}</span></span>
              </li>
            ))}</ul>
          </>
        )}
      </Section>
      <div className="space-y-4">
        <Section title="Before adding real users">
          <ul className="space-y-2">{checklist.map((c, i) => (
            <li key={c} className="flex items-start gap-2 text-sm">
              <Checkbox id={`ck-${i}`} checked={!!ticked[i]} onCheckedChange={(v) => setTicked({ ...ticked, [i]: !!v })} />
              <label htmlFor={`ck-${i}`}>{c}</label>
            </li>
          ))}</ul>
        </Section>
        <Section title="Demo data">
          <p className="text-sm text-muted-foreground mb-3">Put back the original invented accounts and notes. You will be signed out.</p>
          <Button variant="outline" onClick={() => { if (confirm("Reset all demo data?")) void resetDemo(); }}>Reset demo data</Button>
        </Section>
      </div>
    </div>
  );
}
