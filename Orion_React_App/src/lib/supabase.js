import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        // Keep the authenticated browser session through a refresh without placing
        // protected application data in browser storage.
        persistSession: true,
        storage: window.sessionStorage,
      },
    })
  : null;
