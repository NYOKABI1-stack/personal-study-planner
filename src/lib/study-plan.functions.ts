import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { savedPlanSchema } from "./account-validation";

export const getStudyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("study_plans").select("saved").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Your plan could not be loaded. Please try again.");
    if (!data) return null;
    return savedPlanSchema.parse(data.saved);
  });

export const saveStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => savedPlanSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("study_plans").upsert({ user_id: context.userId, saved: data });
    if (error) throw new Error("Your plan could not be saved. Please try again.");
    return { saved: true };
  });