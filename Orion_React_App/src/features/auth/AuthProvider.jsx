import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ROLE_VALUES } from "../../constants/roles";
import { defineAbilityFor } from "../../lib/ability";
import { queryClient } from "../../lib/queryClient";
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

async function isCurrentSessionUser(userId) {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id === userId;
}

export function AuthProvider({ children }) {
  const authenticatedUserId = useRef(null);
  const profileLoad = useRef(null);
  const [state, setState] = useState({
    status: isSupabaseConfigured ? "loading" : "error",
    user: null,
    profile: null,
    error: isSupabaseConfigured ? null : "Sign-in is not configured for this environment.",
  });

  const setSignedOut = useCallback(() => {
    authenticatedUserId.current = null;
    queryClient.clear();
    setState({ status: "signedOut", user: null, profile: null, error: null });
  }, []);

  const loadAuthenticatedUser = useCallback(async (user) => {
    if (profileLoad.current?.userId === user.id) return profileLoad.current.promise;

    const promise = (async () => {
      try {
        const profile = await getProfile(user.id);
        if (!(await isCurrentSessionUser(user.id))) return null;
        if (authenticatedUserId.current && authenticatedUserId.current !== user.id) queryClient.clear();
        authenticatedUserId.current = user.id;
        setState({ status: "signedIn", user, profile, error: null });
        return profile;
      } catch {
        if (!(await isCurrentSessionUser(user.id))) return null;
        authenticatedUserId.current = null;
        queryClient.clear();
        await supabase.auth.signOut();
        setState({
          status: "error",
          user: null,
          profile: null,
          error: "We could not load your Orion account. Please contact the administrator.",
        });
        return null;
      }
    })();

    profileLoad.current = { userId: user.id, promise };
    try {
      return await promise;
    } finally {
      if (profileLoad.current?.promise === promise) profileLoad.current = null;
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

      const profile = await loadAuthenticatedUser(data.user);
      return profile ? { profile } : { error: "We could not load your Orion account. Please contact the administrator." };
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut();
      setSignedOut();
    },
  }), [loadAuthenticatedUser, setSignedOut, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
