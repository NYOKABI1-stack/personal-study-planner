import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { buildPlan, planAsText, type Day, type Phase, type PlanInput, type Topic, type Weight } from "@/lib/planner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AZ-900 Study Planner — Azure Fundamentals Study Plan" },
      { name: "description", content: "Unofficial community tool: build a personalised AZ-900 study plan from your exam date, free hours and weak topics." },
      { property: "og:title", content: "AZ-900 Study Planner" },
      { property: "og:description", content: "A day-by-day Azure Fundamentals study plan with spaced review and mock exams. Unofficial, not affiliated with Microsoft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PHASE_LABEL: Record<Phase, string> = { learn: "Learn", practice: "Practice", review: "Review", mock: "Mock", recap: "Recap" };
const PHASE_BG: Record<Phase, string> = { learn: "bg-learn", practice: "bg-practice", review: "bg-review", mock: "bg-mock", recap: "bg-recap" };
const GUIDE: Record<Phase, string> = {
  learn: "Work through the matching Microsoft Learn module, then write a one-line definition of each service from memory.",
  practice: "Answer practice questions on the topic and log every mistake.",
  review: "Recall from memory, then redo the questions you got wrong.",
  mock: "A full timed practice test with no notes.",
  recap: "Light recall only — skim your mistake log and one-line definitions.",
};
const DISCLAIMER = "Unofficial community tool — not affiliated with or endorsed by Microsoft.";
const STUDY_GUIDE = "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900";
const KEY = "az900-planner-v1";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s + "T00:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const hm = (m: number) => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? String(r).padStart(2, "0") : ""}` : `${r}m`; };
const uid = () => Math.random().toString(36).slice(2, 9);

const G1 = "1 · Describe cloud concepts", G2 = "2 · Azure architecture and services", G3 = "3 · Azure management and governance";
const AZ_TOPICS: [string, string, Weight, number][] = [
  [G1, "Cloud computing & shared responsibility model", "light", 4],
  [G1, "Public, private & hybrid cloud; consumption-based pricing", "light", 4],
  [G1, "IaaS, PaaS & SaaS", "light", 3],
  [G1, "High availability, scalability, elasticity & reliability", "light", 3],
  [G2, "Regions, availability zones, resource groups, subscriptions & management groups", "heavy", 2],
  [G2, "Compute: VMs, App Service, containers, Functions", "heavy", 2],
  [G2, "Networking: virtual networks, VPN Gateway, ExpressRoute, DNS", "heavy", 1],
  [G2, "Storage: blob, files, redundancy options & tiers", "heavy", 2],
  [G2, "Databases", "heavy", 3],
  [G2, "Identity & security: Entra ID, MFA, conditional access, RBAC, Zero Trust, defence in depth", "heavy", 1],
  [G3, "Cost management: pricing & TCO calculators, tags", "normal", 3],
  [G3, "Governance: Azure Policy, resource locks, Purview, Service Trust Portal", "normal", 2],
  [G3, "Management tools: portal, CLI, PowerShell, Cloud Shell, Arc, ARM templates", "normal", 3],
  [G3, "Monitoring: Advisor, Service Health, Azure Monitor", "normal", 2],
];

function example(today: string): PlanInput {
  return {
    examName: "AZ-900",
    startDate: today,
    examDate: addDays(today, 35),
    weeklyHours: [1, 1, 1.5, 1, 1, 3, 0],
    sessionMinutes: 45,
    topics: AZ_TOPICS.map(([group, name, weight, confidence], i) => ({ id: `az${i}`, group, name, weight, confidence })),
  };
}

interface Saved { input: PlanInput; done: Record<string, boolean>; isExample: boolean }

function Index() {
  const hydrated = useHydrated();
  const [state, setState] = useState<Saved | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    const t = iso(new Date());
    setToday(t);
    let s: Saved | null = null;
    try { const raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch { s = null; }
    setState(s && s.input ? s : { input: example(t), done: {}, isExample: true });
  }, []);
  useEffect(() => {
    if (!state) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  }, [state]);

  if (!hydrated || !state) return <main className="p-8 font-display text-2xl">Sharpening pencils…</main>;
  return <Planner state={state} setState={(f) => setState((s) => (s ? f(s) : s))} today={today} />;
}

function Planner({ state, setState, today }: { state: Saved; setState: (f: (s: Saved) => Saved) => void; today: string }) {
  const { input, done } = state;
  const plan = useMemo(() => buildPlan(input), [input]);
  const set = (p: Partial<PlanInput>) => setState((s) => ({ ...s, input: { ...s.input, ...p } }));
  const setTopic = (id: string, p: Partial<Topic>) => set({ topics: input.topics.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  const toggle = (id: string) => setState((s) => ({ ...s, done: { ...s.done, [id]: !s.done[id] } }));

  const allSessions = plan.days.flatMap((d) => d.sessions);
  const doneCount = allSessions.filter((s) => done[s.id]).length;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Azure Fundamentals · runway to exam day</p>
        <h1 className="font-display text-4xl font-extrabold leading-none sm:text-6xl">AZ-900 Study Planner<span className="text-review">.</span></h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">Set your exam date, your free hours and how confident you feel on each skill area. You get a plan with your weakest topics first, spaced review and timed mock exams near the end.</p>
        <p className="mt-2 max-w-2xl text-xs text-muted-foreground">{DISCLAIMER} <a className="underline" href={STUDY_GUIDE} target="_blank" rel="noreferrer">Official study guide on Microsoft Learn</a>.</p>
      </header>

      {state.isExample && (
        <div role="status" className="sheet mb-6 flex flex-wrap items-center justify-between gap-3 bg-highlight p-3">
          <span><strong>Example starting point</strong> — the AZ-900 topics with sample confidence ratings. Adjust them to you, or start blank.</span>
          <button className="btn" onClick={() => setState(() => ({ isExample: false, done: {}, input: { examName: "AZ-900", startDate: today, examDate: addDays(today, 28), weeklyHours: [1, 1, 1, 1, 1, 2, 0], sessionMinutes: 45, topics: [{ id: uid(), name: "", confidence: 3, weight: "normal" }] } }))}>Clear example</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <InputsPanel input={input} set={set} setTopic={setTopic} onEdit={() => state.isExample && setState((s) => ({ ...s, isExample: false }))} />
        <div className="min-w-0 space-y-6">
          {plan.error ? (
            <div role="alert" className="sheet border-destructive p-4 text-destructive"><strong>Can't build a plan:</strong> {plan.error}</div>
          ) : (
            <>
              {plan.warnings.length > 0 && (
                <ul role="status" className="sheet space-y-1 bg-accent p-4 text-sm">
                  {plan.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
                </ul>
              )}
              <Summary plan={plan} />
              <RunwayChart days={plan.days} today={today} />
              <TopicBars plan={plan} />
              <WeekPlan days={plan.days} done={done} toggle={toggle} today={today} doneCount={doneCount} total={allSessions.length} input={input} plan={plan} />
              <HowItWorks />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function InputsPanel({ input, set, setTopic, onEdit }: { input: PlanInput; set: (p: Partial<PlanInput>) => void; setTopic: (id: string, p: Partial<Topic>) => void; onEdit: () => void }) {
  const totalWeek = input.weeklyHours.reduce((a, b) => a + (b || 0), 0);
  return (
    <section aria-labelledby="inputs-h" className="sheet h-fit space-y-5 p-4 lg:sticky lg:top-4" onChange={onEdit}>
      <h2 id="inputs-h" className="font-display text-2xl font-semibold">Your inputs</h2>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-bold">Start date
            <input type="date" value={input.startDate} onChange={(e) => set({ startDate: e.target.value })} className="font-mono font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-bold">Exam date
            <input type="date" value={input.examDate} onChange={(e) => set({ examDate: e.target.value })} className="font-mono font-normal" />
          </label>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Hours per day <span className="font-mono font-normal text-muted-foreground">({totalWeek}h/week · 0 = rest)</span></legend>
        <div className="grid grid-cols-7 gap-1">
          {DOW.map((d, i) => (
            <label key={d} className="grid gap-1 text-center text-xs">
              {d}
              <input type="number" min={0} max={16} step={0.5} inputMode="decimal" aria-label={`Hours on ${d}`}
                value={input.weeklyHours[i]} className="px-0.5 text-center font-mono"
                onChange={(e) => { const w = [...input.weeklyHours]; w[i] = Math.max(0, Number(e.target.value) || 0); set({ weeklyHours: w }); }} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Focus session length</legend>
        <div className="flex flex-wrap gap-2">
          {[30, 45, 60, 90].map((m) => (
            <label key={m} className={`btn cursor-pointer font-mono ${input.sessionMinutes === m ? "btn-primary" : ""}`}>
              <input type="radio" name="len" className="sr-only" checked={input.sessionMinutes === m} onChange={() => set({ sessionMinutes: m })} />
              {m}m
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">Topics <span className="font-normal text-muted-foreground">— confidence 1 shaky · 5 strong</span></legend>
        <p className="mb-2 text-xs text-muted-foreground">Weights are suggestions. Check the current percentages in the <a className="underline" href={STUDY_GUIDE} target="_blank" rel="noreferrer">official study guide</a> — they change between exam updates.</p>
        {[...new Set(input.topics.map((t) => t.group || "Your own topics"))].map((g) => (
          <div key={g} className="mb-3">
            <h3 className="mb-2 font-display text-base font-semibold">{g}</h3>
            <ul className="space-y-3">
              {input.topics.map((t, i) => (t.group || "Your own topics") !== g ? null : (
                <li key={t.id} className="space-y-2 border-b border-dashed pb-3">
                  <div className="flex gap-2">
                    <input aria-label={`Topic ${i + 1} name`} value={t.name} placeholder="Topic name" className="flex-1" onChange={(e) => setTopic(t.id, { name: e.target.value })} />
                    <button type="button" className="btn px-2" aria-label={`Remove ${t.name || `topic ${i + 1}`}`} onClick={() => { onEdit(); set({ topics: input.topics.filter((x) => x.id !== t.id) }); }}>✕</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-2">Confidence
                      <input type="range" min={1} max={5} value={t.confidence} onChange={(e) => setTopic(t.id, { confidence: Number(e.target.value) })} className="w-24 border-0 p-0 accent-primary" />
                      <span className="font-mono font-bold">{t.confidence}</span>
                    </label>
                    <label className="flex items-center gap-1">Weight
                      <select value={t.weight} onChange={(e) => setTopic(t.id, { weight: e.target.value as Weight })} className="py-0.5">
                        <option value="light">light</option><option value="normal">normal</option><option value="heavy">heavy</option>
                      </select>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <button type="button" className="btn mt-1" onClick={() => { onEdit(); set({ topics: [...input.topics, { id: uid(), name: "", confidence: 3, weight: "normal" }] }); }}>+ Add your own topic</button>
      </fieldset>
    </section>
  );
}

function Summary({ plan }: { plan: ReturnType<typeof buildPlan> }) {
  const items = [
    ["Days to exam", String(plan.daysToExam)],
    ["Study time", hm(plan.totalMinutes)],
    ["Study days", String(plan.studyDays)],
    ["Mock exams", String(plan.mocks)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k} className="sheet p-3">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
          <dd className="font-mono text-2xl font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {(Object.keys(PHASE_LABEL) as Phase[]).map((p) => (
        <span key={p} className="flex items-center gap-1"><span className={`inline-block h-3 w-3 border border-foreground ${PHASE_BG[p]}`} />{PHASE_LABEL[p]}</span>
      ))}
    </div>
  );
}

function RunwayChart({ days, today }: { days: Day[]; today: string }) {
  const max = Math.max(60, ...days.map((d) => d.minutes));
  return (
    <section aria-labelledby="runway-h" className="sheet p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="runway-h" className="font-display text-2xl font-semibold">The runway</h2>
        <Legend />
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex h-40 items-end gap-[2px]" style={{ minWidth: `${days.length * 7}px` }} role="img"
          aria-label={`Bar chart of ${days.length} days; tallest day ${hm(max)}.`}>
          {days.map((d) => (
            <div key={d.date} className="flex h-full min-w-[5px] flex-1 flex-col justify-end" title={`${d.date}: ${d.exam ? "EXAM" : d.rest ? "rest" : `${hm(d.minutes)} · ${d.phase}`}`}>
              {d.exam ? (
                <div className="flex h-full items-start justify-center border-2 border-review bg-review/20 font-mono text-[10px] font-bold text-review">⚑</div>
              ) : d.rest ? (
                <div className="mx-auto mb-0.5 h-1 w-1 rounded-full bg-muted-foreground" />
              ) : (
                <div className={`${PHASE_BG[d.phase ?? "learn"]} border border-foreground/60 ${d.date === today ? "outline outline-2 outline-foreground" : ""}`} style={{ height: `${(d.minutes / max) * 100}%` }} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between font-mono text-xs text-muted-foreground">
        <span>{days[0]?.date}</span><span>· = rest · ⚑ = exam</span><span>{days.at(-1)?.date}</span>
      </div>
    </section>
  );
}

function TopicBars({ plan }: { plan: ReturnType<typeof buildPlan> }) {
  const max = Math.max(1, ...plan.topicTotals.map((t) => t.learn + t.practice + t.review));
  return (
    <section aria-labelledby="topics-h" className="sheet p-4">
      <h2 id="topics-h" className="mb-3 font-display text-2xl font-semibold">Time per topic</h2>
      <ul className="space-y-3">
        {[...plan.topicTotals].sort((a, b) => b.learn + b.practice + b.review - (a.learn + a.practice + a.review)).map((t) => {
          const tot = t.learn + t.practice + t.review;
          return (
            <li key={t.topicId}>
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-bold">{t.name} <span className="ml-1 rounded border border-foreground px-1 font-mono text-[10px] font-normal">conf {t.confidence}/5</span></span>
                <span className="font-mono">{hm(tot)}</span>
              </div>
              <div className="flex h-4 border border-foreground bg-muted" role="img" aria-label={`${t.name}: learn ${hm(t.learn)}, practice ${hm(t.practice)}, review ${hm(t.review)}`} style={{ width: `${Math.max(4, (tot / max) * 100)}%` }}>
                {(["learn", "practice", "review"] as const).map((p) => t[p] > 0 && <div key={p} className={PHASE_BG[p]} style={{ width: `${(t[p] / Math.max(1, tot)) * 100}%` }} />)}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function weekKey(date: string) {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}
const nice = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s + "T00:00:00").toLocaleDateString(undefined, o);

function WeekPlan({ days, done, toggle, today, doneCount, total, input, plan }: { days: Day[]; done: Record<string, boolean>; toggle: (id: string) => void; today: string; doneCount: number; total: number; input: PlanInput; plan: ReturnType<typeof buildPlan> }) {
  const weeks = useMemo(() => {
    const m = new Map<string, Day[]>();
    for (const d of days) { const k = weekKey(d.date); m.set(k, [...(m.get(k) ?? []), d]); }
    return [...m.entries()];
  }, [days]);
  const currentWeek = weekKey(today);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (k: string) => open[k] ?? (k === currentWeek || (k === weeks[0]?.[0] && !weeks.some(([w]) => w === currentWeek)));
  const [copyMsg, setCopyMsg] = useState("");
  const [fallback, setFallback] = useState<string | null>(null);
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const copy = async () => {
    const text = planAsText(input, plan);
    try { await navigator.clipboard.writeText(text); setCopyMsg("Copied!"); setFallback(null); }
    catch { setFallback(text); setCopyMsg("Clipboard blocked — select the text below and copy it."); }
    setTimeout(() => setCopyMsg(""), 4000);
  };

  return (
    <section aria-labelledby="plan-h" className="sheet p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="plan-h" className="font-display text-2xl font-semibold">Week by week</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => setOpen(Object.fromEntries(weeks.map(([k]) => [k, true])))}>Expand all</button>
          <button className="btn" onClick={() => setOpen(Object.fromEntries(weeks.map(([k]) => [k, false])))}>Collapse all</button>
          <button className="btn btn-primary" onClick={copy}>Copy plan as text</button>
        </div>
      </div>
      <p aria-live="polite" className="text-sm">{copyMsg}</p>
      {fallback && <textarea readOnly aria-label="Plan as text" className="mb-3 h-40 w-full font-mono text-xs" value={fallback} onFocus={(e) => e.currentTarget.select()} />}
      <div className="mb-4">
        <div className="flex justify-between text-sm"><span>Overall progress</span><span className="font-mono">{doneCount}/{total} · {pct}%</span></div>
        <div className="mt-1 h-3 border border-foreground bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Overall progress">
          <div className="h-full bg-learn" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="space-y-3">
        {weeks.map(([k, wd], wi) => {
          const ss = wd.flatMap((d) => d.sessions);
          const wdone = ss.filter((s) => done[s.id]).length;
          const mins = wd.reduce((a, d) => a + d.minutes, 0);
          const o = isOpen(k);
          return (
            <div key={k} className={`border-[1.5px] border-foreground ${k === currentWeek ? "bg-highlight/40" : ""}`}>
              <button aria-expanded={o} aria-controls={`wk-${k}`} onClick={() => setOpen((s) => ({ ...s, [k]: !o }))}
                className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left">
                <span className="font-display text-lg font-semibold">{o ? "▾" : "▸"} Week {wi + 1} <span className="font-sans text-sm font-normal text-muted-foreground">from {nice(k, { day: "numeric", month: "short" })}</span></span>
                <span className="font-mono text-xs">{hm(mins)} · {wdone}/{ss.length} done</span>
              </button>
              {o && (
                <ol id={`wk-${k}`} className="divide-y divide-dashed border-t border-foreground">
                  {wd.map((d) => (
                    <li key={d.date} className={`grid gap-2 px-3 py-2 sm:grid-cols-[7rem_minmax(0,1fr)] ${d.date === today ? "bg-highlight" : ""}`}>
                      <div className="text-sm">
                        <div className="font-bold">{nice(d.date, { weekday: "short", day: "numeric", month: "short" })}</div>
                        {d.date === today && <div className="font-mono text-[10px] uppercase">today</div>}
                        {d.recap && <div className="font-mono text-[10px] uppercase text-muted-foreground">light recap</div>}
                      </div>
                      {d.exam ? (
                        <div className="font-display text-xl font-extrabold text-review">⚑ Exam day{input.examName ? ` — ${input.examName}` : ""}. You've got this.</div>
                      ) : d.rest ? (
                        <div className="text-sm italic text-muted-foreground">Rest day</div>
                      ) : (
                        <ul className="space-y-1">
                          {d.sessions.map((s) => (
                            <li key={s.id}>
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!done[s.id]} onChange={() => toggle(s.id)} className="h-4 w-4 shrink-0 accent-primary" />
                                <span className={`shrink-0 border border-foreground px-1 font-mono text-[10px] uppercase ${PHASE_BG[s.phase]} text-foreground`}>{PHASE_LABEL[s.phase]}</span>
                                <span className={`min-w-0 flex-1 ${done[s.id] ? "text-muted-foreground line-through" : ""}`}>
                                  <span className="block">{s.label}</span>
                                  <span className="block text-xs text-muted-foreground">{GUIDE[s.phase]}</span>
                                </span>
                                <span className="shrink-0 font-mono text-xs">{hm(s.minutes)}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-h" className="sheet p-4 text-sm leading-relaxed">
      <h2 id="how-h" className="mb-2 font-display text-xl font-semibold">How the plan is built</h2>
      <p>Each topic gets a need score of <span className="font-mono">(6 − confidence) × weight</span> (light 0.5, normal 1, heavy 1.5), and time is shared by that score — a shaky topic gets about five times the time of a strong one. Your hours are cut into focus sessions and split into <b>Learn</b>, <b>Practice</b> and <b>Final review</b> (50/33/17 with 3+ weeks, shifting toward review when the exam is close). Learning starts with your weakest topics; practice and review rotate topics so each one comes back every few days. Up to three timed mock exams land in the second half, the day before the exam is halved into a light recap, and back-to-back sessions on the same topic are merged.</p>
      <ul className="mt-2 space-y-1">
        {(["learn", "practice", "review", "mock"] as const).map((p) => <li key={p}><b>{PHASE_LABEL[p]}:</b> {GUIDE[p]}</li>)}
      </ul>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-10 border-t-[1.5px] border-foreground pt-4 text-xs text-muted-foreground">
      <p>{DISCLAIMER} For the official skills outline, current percentages and exam details, see the <a className="underline" href={STUDY_GUIDE} target="_blank" rel="noreferrer">Microsoft Learn AZ-900 study guide</a>.</p>
    </footer>
  );
}
