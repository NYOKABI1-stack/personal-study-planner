// @ts-nocheck -- strict indexed-access noise in array math; behaviour covered by src/test/planner.test.ts
// Pure scheduling logic — no DOM, no storage. Tested in src/test/planner.test.ts.
export type Weight = "light" | "normal" | "heavy";
export type Phase = "learn" | "practice" | "review" | "mock" | "recap";
export interface Topic { id: string; name: string; confidence: number; weight: Weight; group?: string }
export interface PlanInput {
  examName: string;
  examDate: string; // YYYY-MM-DD
  startDate: string;
  weeklyHours: number[]; // index 0 = Monday
  sessionMinutes: number;
  topics: Topic[];
}
export interface Session { id: string; phase: Phase; topicId: string | null; label: string; minutes: number }
export interface Day { date: string; dow: number; minutes: number; rest: boolean; exam: boolean; recap: boolean; phase: Phase | null; sessions: Session[] }
export interface TopicTotal { topicId: string; name: string; confidence: number; learn: number; practice: number; review: number }
export interface Plan {
  error: string | null;
  warnings: string[];
  days: Day[];
  daysToExam: number;
  totalMinutes: number;
  studyDays: number;
  mocks: number;
  topicTotals: TopicTotal[];
  split: [number, number, number];
}

export const WEIGHT_MULT: Record<Weight, number> = { light: 0.5, normal: 1, heavy: 1.5 };
const DAY = 86400000;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parse(s));

export function need(t: Topic) { return (6 - t.confidence) * WEIGHT_MULT[t.weight]; }

export function phaseSplit(days: number): [number, number, number] {
  if (days >= 21) return [0.5, 0.33, 0.17];
  if (days >= 14) return [0.42, 0.33, 0.25];
  if (days >= 7) return [0.34, 0.33, 0.33];
  return [0.2, 0.35, 0.45];
}

/** Largest-remainder apportionment of `n` units by weights. */
export function apportion(n: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || n <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (n * w) / sum);
  const out = raw.map(Math.floor);
  let left = n - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length][1]]++;
  return out;
}

/** Smooth weighted round-robin: spreads each topic evenly through the sequence. */
function spread(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  const cur = counts.map(() => 0);
  const left = [...counts];
  const seq: number[] = [];
  for (let s = 0; s < total; s++) {
    let best = -1;
    for (let i = 0; i < counts.length; i++) {
      if (left[i] <= 0) continue;
      cur[i] += counts[i];
      if (best < 0 || cur[i] > cur[best]) best = i;
    }
    // avoid immediate repeat when possible
    const prev = seq[seq.length - 1];
    if (best === prev) {
      let alt = -1;
      for (let i = 0; i < counts.length; i++) if (i !== best && left[i] > 0 && (alt < 0 || cur[i] > cur[alt])) alt = i;
      if (alt >= 0) best = alt;
    }
    cur[best] -= total;
    left[best]--;
    seq.push(best);
  }
  return seq;
}

const empty = (error: string | null, warnings: string[] = []): Plan => ({
  error, warnings, days: [], daysToExam: 0, totalMinutes: 0, studyDays: 0, mocks: 0, topicTotals: [], split: [0, 0, 0],
});

export function buildPlan(input: PlanInput): Plan {
  const { examDate, startDate, weeklyHours, sessionMinutes: len } = input;
  if (!isDate(examDate) || !isDate(startDate)) return empty("Please enter both a start date and an exam date.");
  const start = parse(startDate), exam = parse(examDate);
  if (exam <= start) return empty("The exam date must be after the start date.");
  const daysToExam = Math.round((exam - start) / DAY);
  if (daysToExam > 730) return empty("That exam is more than two years away — pick a closer date.");
  const topics = input.topics.filter((t) => t.name.trim());
  if (!topics.length) return empty("Add at least one topic to study.");
  if (!len || len <= 0) return empty("Choose a focus session length.");

  // Build day shells and slot counts
  const days: Day[] = [];
  const slots: number[] = [];
  for (let i = 0; i <= daysToExam; i++) {
    const t = start + i * DAY;
    const dow = (new Date(t).getUTCDay() + 6) % 7;
    const isExam = i === daysToExam;
    let mins = isExam ? 0 : Math.max(0, Math.min(24, weeklyHours[dow] || 0)) * 60;
    const recap = i === daysToExam - 1 && mins > 0;
    if (recap) mins = mins / 2;
    const n = Math.floor(mins / len);
    days.push({ date: fmt(t), dow, minutes: 0, rest: !isExam && n === 0, exam: isExam, recap, phase: null, sessions: [] });
    slots.push(isExam ? 0 : n);
  }
  const studyIdx = days.map((_, i) => i).filter((i) => slots[i] > 0);
  const studyDays = studyIdx.length;
  const warnings: string[] = [];
  if (daysToExam < 7) warnings.push(`Your exam is only ${daysToExam} day${daysToExam === 1 ? "" : "s"} away — the plan leans heavily on practice and review.`);
  if (!studyDays) return { ...empty(null, [...warnings, "No study time available — add hours to at least one day of the week."]), days, daysToExam };

  // Mocks: second half, not on recap day
  const mockCount = Math.min(3, Math.floor(studyDays / 6));
  const mockDays = new Set<number>();
  const pool = studyIdx.filter((i) => i >= daysToExam / 2 && !days[i].recap);
  for (let k = 0; k < mockCount && pool.length; k++) {
    mockDays.add(pool[Math.min(pool.length - 1, Math.floor(((k + 1) * pool.length) / (mockCount + 1)))]);
  }
  const mockSlots = (i: number) => Math.min(slots[i], Math.max(1, Math.round(120 / len)));

  // Topic slots: the rest, split into phases by order
  const linear: number[] = []; // day index per topic slot
  for (const i of studyIdx) {
    const n = slots[i] - (mockDays.has(i) ? mockSlots(i) : 0);
    for (let k = 0; k < n; k++) linear.push(i);
  }
  const split = phaseSplit(daysToExam);
  const N = linear.length;
  const recapSlots = linear.filter((i) => days[i].recap).length;
  let nLearn = Math.round(N * split[0]);
  let nPrac = Math.round(N * split[1]);
  // recap day is always review
  if (nLearn + nPrac > N - recapSlots) {
    const over = nLearn + nPrac - (N - recapSlots);
    nPrac = Math.max(0, nPrac - over);
    nLearn = Math.min(nLearn, N - recapSlots - nPrac);
  }
  const nRev = N - nLearn - nPrac;

  const needs = topics.map(need);
  const learnC = apportion(nLearn, needs), pracC = apportion(nPrac, needs), revC = apportion(nRev, needs);
  const byWeak = topics.map((_, i) => i).sort((a, b) => topics[a].confidence - topics[b].confidence || needs[b] - needs[a]);
  const learnSeq: number[] = [];
  for (const i of byWeak) for (let k = 0; k < learnC[i]; k++) learnSeq.push(i);
  const seq: [Phase, number][] = [
    ...learnSeq.map((i) => ["learn", i] as [Phase, number]),
    ...spread(pracC).map((i) => ["practice", i] as [Phase, number]),
    ...spread(revC).map((i) => ["review", i] as [Phase, number]),
  ];

  const name = (i: number) => topics[i].name.trim();
  let p = 0;
  for (const i of studyIdx) {
    const d = days[i];
    if (mockDays.has(i)) {
      d.sessions.push({ id: "", phase: "mock", topicId: null, label: `Timed mock exam${input.examName ? ` · ${input.examName}` : ""}`, minutes: mockSlots(i) * len });
    }
    const n = slots[i] - (mockDays.has(i) ? mockSlots(i) : 0);
    for (let k = 0; k < n; k++, p++) {
      const [ph, ti] = seq[p];
      const phase: Phase = d.recap ? "recap" : ph;
      const last = d.sessions[d.sessions.length - 1];
      if (last && last.phase === phase && last.topicId === topics[ti].id) last.minutes += len;
      else d.sessions.push({ id: "", phase, topicId: topics[ti].id, label: d.recap ? `Light recap · ${name(ti)}` : name(ti), minutes: len });
    }
    d.sessions.forEach((s, k) => (s.id = `${d.date}#${k}`));
    d.minutes = d.sessions.reduce((a, s) => a + s.minutes, 0);
    const main = d.sessions.find((s) => s.phase !== "mock") ?? d.sessions[0];
    d.phase = d.recap ? "recap" : main?.phase ?? null;
  }

  const topicTotals: TopicTotal[] = topics.map((t, i) => ({
    topicId: t.id, name: name(i), confidence: t.confidence, learn: learnC[i] * len, practice: pracC[i] * len, review: revC[i] * len,
  }));
  const totalMinutes = days.reduce((a, d) => a + d.minutes, 0);
  const starved = topicTotals.filter((t) => t.learn + t.practice + t.review === 0);
  if (starved.length) warnings.push(`No time left for: ${starved.map((t) => t.name).join(", ")}. Add hours or drop strong topics.`);
  const topicMins = N * len;
  if (topicMins / topics.length < 120) warnings.push(`That's under 2 hours per topic on average (${(topicMins / 60 / topics.length).toFixed(1)}h). Consider adding study hours.`);

  return { error: null, warnings, days, daysToExam, totalMinutes, studyDays, mocks: mockDays.size, topicTotals, split };
}

export function planAsText(input: PlanInput, plan: Plan): string {
  const lines = [`STUDY PLAN — ${input.examName || "Exam"} on ${input.examDate}`, ""];
  for (const d of plan.days) {
    if (d.exam) { lines.push(`${d.date}  EXAM DAY — good luck!`); continue; }
    if (d.rest) { lines.push(`${d.date}  rest`); continue; }
    lines.push(`${d.date}${d.recap ? "  (light recap)" : ""}`);
    for (const s of d.sessions) lines.push(`  [ ] ${s.phase.padEnd(8)} ${s.label} — ${s.minutes} min`);
  }
  return lines.join("\n");
}
