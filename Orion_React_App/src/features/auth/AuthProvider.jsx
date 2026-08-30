import { useCallback, useEffect, useMemo, useState } from "react";
import { ROLE_VALUES } from "../../constants/roles";
import { defineAbilityFor } from "../../lib/ability";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { AuthContext } from "./authContext";

async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .single();

  if (error || !ROLE_VALUES.includes(data?.role)) {
    throw new Error("Your account is not configured for Orion.");
  }

  return data;
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: isSupabaseConfigured ? "loading" : "error",
    user: null,
    profile: null,
    error: isSupabaseConfigured ? null : "Sign-in is not configured for this environment.",
  });

  const setSignedOut = useCallback(() => {
    setState({ status: "signedOut", user: null, profile: null, error: null });
  }, []);

  const loadAuthenticatedUser = useCallback(async (user) => {
    try {
      const profile = await getProfile(user.id);
      setState({ status: "signedIn", user, profile, error: null });
    } catch {
      await supabase.auth.signOut();
      setState({
        status: "error",
        user: null,
        profile: null,
        error: "We could not load your Orion account. Please contact the administrator.",
      });
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return undefined;
    }

    let active = true;
    const initialise = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active) return;

      if (error || !data.user) {
        setSignedOut();
        return;
      }

      await loadAuthenticatedUser(data.user);
    };

    initialise();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setSignedOut();
        return;
      }

      queueMicrotask(() => loadAuthenticatedUser(session.user));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAuthenticatedUser, setSignedOut]);

  const value = useMemo(() => ({
    ...state,
    ability: defineAbilityFor(state.profile?.role),
    async signIn(email, password) {
      if (!supabase) {
        return { error: "Sign-in is not configured for this environment." };
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        return { error: "The email or password is incorrect." };
      }

      try {
        const profile = await getProfile(data.user.id);
        setState({ status: "signedIn", user: data.user, profile, error: null });
        return { profile };
      } catch {
        await supabase.auth.signOut();
        return { error: "We could not load your Orion account. Please contact the administrator." };
      }
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      setSignedOut();
    },
  }), [setSignedOut, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
