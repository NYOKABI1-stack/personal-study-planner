import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Reset password — AZ-900 Study Planner" }, { name: "description", content: "Set a new password for your AZ-900 Study Planner account." },
    { property: "og:title", content: "Reset your study planner password" }, { property: "og:description", content: "Return to your personal AZ-900 study plan." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }), component: ResetPassword,
});
function ResetPassword() {
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    const valid = new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
    if (valid) { try { sessionStorage.setItem("planner-recovery", "yes"); } catch { /* optional refresh marker */ } }
    try { setRecovery(valid || sessionStorage.getItem("planner-recovery") === "yes"); } catch { setRecovery(valid); }
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8 || password.length > 128) { setMessage("Use between 8 and 128 characters."); return; }
    if (password !== confirmation) { setMessage("Passwords do not match. Enter the same password again."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    setSuccess(!error);
    setMessage(error ? "The link may have expired. Request a new reset link on the sign-in page." : "Password updated. You can return to your plan.");
    if (!error) { try { sessionStorage.removeItem("planner-recovery"); } catch { /* optional marker */ } }
  }
  return <main className="mx-auto max-w-xl px-4 py-10"><h1 tabIndex={-1} className="font-display text-4xl font-extrabold">Reset password.</h1>
    {!recovery ? <p className="mt-5" role="status">Open the password reset link from your email, or request a new link on the sign-in page.</p> : !success && <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="grid gap-1 font-bold">New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label className="grid gap-1 font-bold">Confirm new password<input type="password" autoComplete="new-password" maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      <Button type="submit" disabled={busy}>{busy ? "Updating…" : "Set new password"}</Button>
    </form>}
    <p role={success ? "status" : "alert"} className="mt-4">{message}</p>
    <Link to={success ? "/" : "/auth"} className="mt-5 inline-block text-primary underline">{success ? "Return to your plan" : "Back to sign in"}</Link>
  </main>;
}