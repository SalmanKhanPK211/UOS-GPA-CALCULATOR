import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRole } from "@/lib/catalog.functions";
import { ensureProfile } from "@/lib/records.functions";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user: User | null = session?.user ?? null;
  const displayName =
    (user?.user_metadata?.first_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    null;

  const roleFn = useServerFn(getMyRole);
  const ensureProfileFn = useServerFn(ensureProfile);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    void ensureProfileFn({ data: undefined }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const { data: roleData } = useQuery({
    queryKey: ["my-role", user?.id],
    queryFn: () => roleFn(),
    enabled: !!user,
    staleTime: 60_000,
  });

  return { session, user, loading, displayName, isAdmin: !!roleData?.isAdmin };
}
