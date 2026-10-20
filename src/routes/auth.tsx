import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/use-account";
import { signInSchema, signUpSchema } from "@/lib/account-validation";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — AZ-900 Study Planner" }, { name: "description", content: "Sign in or create an account to save your personal AZ-900 study plan." },
    { property: "og:title", content: "Sign in to AZ-900 Study Planner" }, { property: "og:description", content: "Keep your study plan and completed sessions in your own account." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: SignIn,
});

function SignIn() {
  const { user, loading } = useAccount();
  const navigate = useNavigate();
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!loading && user) void navigate({ to: "/", replace: true }); }, [user, loading, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setMessage("");
    const result = (create ? signUpSchema : signInSchema).safeParse({ email, password, displayName, confirmation });
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); return;
    }
    setErrors({}); setBusy(true);
    try {
      if (create) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setMessage("Check your email for a confirmation link before signing in. If it does not arrive, check spam or try again later.");
        else await navigate({ to: "/" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        await navigate({ to: "/" });
      }
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      setErrors({ form: code === "email_not_confirmed" ? "Confirm your email first. Check your inbox and spam folder for the signup link." : code === "invalid_credentials" ? "Email or password is incorrect. Check both, or reset your password below." : code.includes("rate") ? "Too many attempts. Wait a few minutes before trying again." : create ? "Could not create your account. Check your details, use a stronger password, or try signing in if you already have an account." : "Could not sign in. Check your connection and try again." });
    } finally { setBusy(false); }
  }
  async function resetPassword() {
    const valid = signInSchema.shape.email.safeParse(email);
    if (!valid.success) { setErrors({ email: "Enter your email address above to request a reset link." }); return; }
    setBusy(true); setErrors({});
    const { error } = await supabase.auth.resetPasswordForEmail(valid.data, { redirectTo: `${window.location.origin}/reset-password` });
    setMessage(error ? "Could not send a reset link. Check your connection and try again later." : "If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.");
    setBusy(false);
  }
  return <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
    <p className="font-mono text-xs uppercase text-muted-foreground">Your own study notebook</p>
    <h1 tabIndex={-1} className="mt-2 font-display text-4xl font-extrabold">{create ? "Create account" : "Sign in"}<span className="text-review">.</span></h1>
    <p className="mt-3 text-muted-foreground">Keep your AZ-900 plan and completed sessions in your own account.</p>
    <label className="mt-6 flex items-center gap-2 font-bold"><input type="checkbox" checked={create} onChange={(event) => { setCreate(event.target.checked); setErrors({}); setMessage(""); }} />Create account</label>
    <form onSubmit={submit} noValidate className="mt-6 space-y-5">
      {create && <Field name="displayName" label="Display name" value={displayName} change={setDisplayName} error={errors.displayName} autoComplete="nickname" maxLength={100} />}
      <Field name="email" label="Email" type="email" value={email} change={setEmail} error={errors.email} autoComplete="email" maxLength={255} />
      <Field name="password" label="Password" type="password" value={password} change={setPassword} error={errors.password} autoComplete={create ? "new-password" : "current-password"} maxLength={128} />
      <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      {create && <Field name="confirmation" label="Confirm password" type="password" value={confirmation} change={setConfirmation} error={errors.confirmation} autoComplete="new-password" maxLength={128} />}
      {errors.form && <p role="alert" className="text-sm text-destructive">{errors.form}</p>}
      {message && <p role="status" className="border-l-4 border-learn pl-3 text-sm">{message}</p>}
      <Button type="submit" disabled={busy || loading} className="btn btn-primary h-auto">{busy ? "Please wait…" : create ? "Create account" : "Sign in"}</Button>
      {!create && <Button type="button" variant="link" disabled={busy} onClick={resetPassword}>Forgot password?</Button>}
    </form>
    <p className="mt-8"><Link to="/" className="font-bold text-primary underline">Continue without an account →</Link></p>
    <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">Accounts and personal plans use Lovable Cloud. Guest plans are saved on this device only. Never share your password on a shared device.</p>
  </main>;
}

function Field({ name, label, type = "text", value, change, error, autoComplete, maxLength }: { name: string; label: string; type?: string; value: string; change: (value: string) => void; error?: string; autoComplete: string; maxLength: number }) {
  return <div><label htmlFor={name} className="block text-sm font-bold">{label}</label><input id={name} name={name} type={type} value={value} onChange={(event) => change(event.target.value)} required maxLength={maxLength} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} className="mt-1 w-full py-2" />{error && <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-destructive">{error}</p>}</div>;
}