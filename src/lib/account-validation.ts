import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(255),
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use no more than 128 characters."),
});
export const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(1, "Enter your display name.").max(100, "Use no more than 100 characters."),
  confirmation: z.string(),
}).refine((value) => value.password === value.confirmation, {
  message: "Passwords do not match. Enter the same password again.", path: ["confirmation"],
});

export const savedPlanSchema = z.object({
  input: z.object({
    examName: z.string().max(100),
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    weeklyHours: z.array(z.number().min(0).max(16)).length(7),
    sessionMinutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
    topics: z.array(z.object({
      id: z.string().min(1).max(100), name: z.string().max(300),
      confidence: z.number().int().min(1).max(5),
      weight: z.enum(["light", "normal", "heavy"]), group: z.string().max(150).optional(),
    })).max(100),
  }),
  done: z.record(z.string().max(100), z.boolean()).refine((value) => Object.keys(value).length <= 10000),
  isExample: z.boolean(),
});
export type SavedPlan = z.infer<typeof savedPlanSchema>;