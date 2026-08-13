import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL dan Anon Key belum diatur di environment variables!",
  );
}

// Inisialisasi Supabase Client dengan opsi Realtime yang benar
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Tipe Data Player Profile
export interface PlayerProfile {
  id: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  high_score?: number;
}

// Helper Login Google
export const signInWithGoogle = async (): Promise<PlayerProfile | null> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw error;

  // Mengingat OAuth Supabase akan melakukan redirect,
  // profile akan diambil secara otomatis saat halaman dimuat ulang.
  return null;
};

// Helper untuk mengambil Profil User Aktif
export const getCurrentUserProfile =
  async (): Promise<PlayerProfile | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return {
      id: user.id,
      name: user.user_metadata?.full_name || user.email?.split("@")[0],
      email: user.email,
      avatar_url: user.user_metadata?.avatar_url,
      high_score: 0,
    };
  };

// Helper Logout
export const signOutPlayer = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
