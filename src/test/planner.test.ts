import { describe, it, expect } from "vitest";
import { buildPlan, need, phaseSplit, type PlanInput } from "@/lib/planner";

const base: PlanInput = {
  examName: "Bio", startDate: "2026-01-05", examDate: "2026-02-09",
  weeklyHours: [2, 2, 2, 2, 2, 4, 0], sessionMinutes: 60,
  topics: [
    { id: "a", name: "Genetics", confidence: 1, weight: "normal" },
    { id: "b", name: "Cells", confidence: 5, weight: "normal" },
  ],
};

describe("planner", () => {
  it("need = (6 - confidence) x weight", () => {
    expect(need({ id: "x", name: "x", confidence: 1, weight: "heavy" })).toBe(7.5);
    expect(need({ id: "x", name: "x", confidence: 5, weight: "light" })).toBe(0.5);
  });
  it("uses 50/33/17 for 3+ weeks", () => expect(phaseSplit(21)).toEqual([0.5, 0.33, 0.17]));
  it("rejects exam before start", () => {
    expect(buildPlan({ ...base, examDate: "2026-01-01" }).error).toMatch(/after the start/);
  });
  it("weak topic gets ~5x the hours of a strong one", () => {
    const p = buildPlan(base);
    const [a = 0, b = 1] = p.topicTotals.map((t) => t.learn + t.practice + t.review);
    expect(a / b).toBeGreaterThan(4);
  });
  it("caps mocks at 3, marks exam, halves recap day", () => {
    const p = buildPlan(base);
    expect(p.mocks).toBe(3);
    expect(p.days.at(-1)!.exam).toBe(true);
    const recap = p.days.at(-2)!; // Sunday 0h -> no recap; check Monday-before case
    expect(recap.recap).toBe(false);
    const q = buildPlan({ ...base, examDate: "2026-02-10" });
    expect(q.days.at(-2)!.minutes).toBe(60);
    expect(q.days.at(-2)!.recap).toBe(true);
  });
  it("warns when exam is under a week away", () => {
    expect(buildPlan({ ...base, examDate: "2026-01-09" }).warnings.join()).toMatch(/only 4 days/);
  });
});
