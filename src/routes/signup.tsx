import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AuthCard } from "@/components/app/AuthCard";
import { dashboardPathFor, useNoti } from "@/lib/noti/store";
import { signUpSchema } from "@/lib/noti/validation";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your account — Noti" },
      { name: "description", content: "Join Noti as a music tutor, student or parent." },
      { property: "og:title", content: "Create your account — Noti" },
      { property: "og:description", content: "Join Noti as a music tutor, student or parent and keep lessons on track." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

const roles = [
  { value: "teacher", label: "Tutor / Teacher", hint: "Write lesson notes and track learners" },
  { value: "student", label: "Student", hint: "Read and sign your lesson notes" },
  { value: "parent", label: "Parent / Guardian", hint: "Follow your child's progress" },
] as const;

function SignupPage() {
  const { signUp, user, ready } = useNoti();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" as string });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate({ to: dashboardPathFor(user.role), replace: true });
  }, [ready, user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    const r = await signUp(parsed.data);
    setBusy(false);
    if (r.error) setErrors({ form: r.error });
  }

  const field = (k: "name" | "email" | "password", label: string, type: string, auto: string) => (
    <div className="space-y-2">
      <Label htmlFor={k}>{label}</Label>
      <Input id={k} type={type} autoComplete={auto} value={form[k]} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-err` : undefined}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      {errors[k] && <p id={`${k}-err`} className="text-sm text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <AuthCard title="Create your account" subtitle="It takes less than a minute." footer={<>Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link></>}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {field("name", "Full name", "text", "name")}
        {field("email", "Email", "email", "email")}
        {field("password", "Password", "password", "new-password")}
        <p className="text-xs text-muted-foreground -mt-2">At least 10 characters, with upper and lower case letters and a number.</p>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-2">I am a…</legend>
          <RadioGroup value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
            {roles.map((r) => (
              <Label key={r.value} htmlFor={`role-${r.value}`} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer has-[[data-state=checked]]:border-primary">
                <RadioGroupItem id={`role-${r.value}`} value={r.value} className="mt-0.5" />
                <span><span className="block font-medium">{r.label}</span><span className="block text-xs text-muted-foreground font-normal">{r.hint}</span></span>
              </Label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">School owner accounts are set up by Noti, not through sign-up.</p>
        </fieldset>
        {errors["form"] && <p role="alert" className="text-sm text-destructive">{errors["form"]}</p>}
        <Button type="submit" className="w-full" disabled={busy || !ready}>{busy ? "Creating account…" : "Create account"}</Button>
      </form>
    </AuthCard>
  );
}
