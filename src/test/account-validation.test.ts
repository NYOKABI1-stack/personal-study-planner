import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema, savedPlanSchema } from "@/lib/account-validation";

describe("Account input rules", () => {
  it("requires a valid email", () => {
    expect(signInSchema.safeParse({ email: "not-an-email", password: "abcdefgh" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "learner@example.com", password: "abcdefgh" }).success).toBe(true);
  });
  it("requires at least eight password characters", () => {
    expect(signInSchema.safeParse({ email: "learner@example.com", password: "1234567" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "learner@example.com", password: "12345678" }).success).toBe(true);
  });
  it("requires matching confirmation at signup", () => {
    const value = { email: "learner@example.com", password: "12345678", displayName: "Susan", confirmation: "87654321" };
    expect(signUpSchema.safeParse(value).success).toBe(false);
    expect(signUpSchema.safeParse({ ...value, confirmation: value.password }).success).toBe(true);
  });
  it("requires a display name at signup", () => {
    const value = { email: "learner@example.com", password: "12345678", confirmation: "12345678", displayName: " " };
    expect(signUpSchema.safeParse(value).success).toBe(false);
    expect(signUpSchema.safeParse({ ...value, displayName: "Susan" }).success).toBe(true);
  });
  it("rejects malformed saved inputs rather than passing them to the scheduler", () => {
    expect(savedPlanSchema.safeParse({ input: { weeklyHours: [99] }, done: {}, isExample: false }).success).toBe(false);
  });
});