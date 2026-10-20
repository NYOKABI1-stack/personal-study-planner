import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AccountContext = createContext<{
  user: User | null; displayName: string; loading: boolean; message: string;
  signOut: () => Promise<void>;
}>({ user: null, displayName: "", loading: true, message: "", signOut: async () => {} });

// Authentication adapter: account/session behaviour stays here, separate from scheduling.
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const router = useRouter();
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    async function refresh() {
      const ticket = ++generation.current;
      const { data, error } = await supabase.auth.getUser();
      if (!active || ticket !== generation.current) return;
      const verified = error ? null : data.user;
      setUser(verified);
      setLoading(false);
      setDisplayName(verified ? "Learner" : "");
      if (verified) {
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", verified.id).maybeSingle();
        if (active && ticket === generation.current) setDisplayName(profile?.display_name || "Learner");
      }
    }
    // One listener for the app. Keep async Auth requests outside its callback.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) return;
      if (event === "SIGNED_OUT") {
        generation.current++;
        setUser(null); setDisplayName(""); setLoading(false);
        queryClient.clear();
      } else {
        setMessage("");
        setTimeout(() => { if (active) void refresh(); }, 0);
      }
      void router.invalidate();
    });
    void refresh();
    return () => { active = false; subscription.unsubscribe(); };
  }, [queryClient, router]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { setMessage("Could not sign out. Please try again."); return; }
    setMessage("Signed out. Your personal plan stays in your account.");
    await router.navigate({ to: "/auth", replace: true });
  }
  return <AccountContext.Provider value={{ user, displayName, loading, message, signOut }}>{children}</AccountContext.Provider>;
}

export const useAccount = () => useContext(AccountContext);