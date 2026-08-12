import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL dan Anon Key belum diatur di environment variables!",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipe Data Player Profile
export interface PlayerProfile {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  high_score?: number;
}

// Helper Login Google
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
};

// Helper Logout
export const signOutPlayer = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
