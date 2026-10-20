import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, LogOut, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";

export function SiteNavigation() {
  const { user, displayName, loading, message, signOut } = useAccount();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setOpen(false);
    const timer = setTimeout(() => document.querySelector<HTMLElement>("main h1")?.focus(), 80);
    return () => clearTimeout(timer);
  }, [pathname]);
  const linkClass = "px-3 py-2 font-bold hover:bg-accent";
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-3">Skip to content</a>
    <header className="border-b-[1.5px] border-foreground bg-card pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 font-display text-lg font-semibold"><BookOpen className="h-5 w-5 shrink-0 text-learn" />AZ-900 <span className="hidden sm:inline">Study Planner</span></Link>
        <Button variant="ghost" size="icon" className="sm:hidden" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="site-links" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
        <nav id="site-links" aria-label="Main navigation" onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); document.querySelector<HTMLElement>('[aria-controls="site-links"]')?.focus(); } }} className={`${open ? "flex" : "hidden"} w-full flex-col gap-1 sm:flex sm:w-auto sm:flex-row sm:items-center`}>
          <Link to="/" className={linkClass} activeOptions={{ exact: true }} activeProps={{ className: "bg-accent underline", "aria-current": "page" }} onClick={() => setOpen(false)}>Home</Link>
          <Link to="/about" className={linkClass} activeProps={{ className: "bg-accent underline", "aria-current": "page" }} onClick={() => setOpen(false)}>About</Link>
          {!loading && (user ? <div className="flex min-w-0 flex-wrap items-center gap-2 px-3"><span className="max-w-48 break-words font-bold">{displayName}</span><Button variant="outline" disabled={busy} onClick={async () => { setBusy(true); await signOut(); setBusy(false); setOpen(false); }}><LogOut />Sign out</Button></div> : <Link to="/auth" className={linkClass} activeProps={{ className: "bg-accent underline", "aria-current": "page" }} onClick={() => setOpen(false)}>Sign in</Link>)}
        </nav>
      </div>
    </header>
    {message && <p role="status" className="mx-auto max-w-6xl px-4 py-3 text-sm">{message}</p>}
    <div id="main-content" />
  </>;
}