import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string;
  total_score: number;
  wins: number;
  matches_played: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, total_score, wins, matches_played")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Gagal mengambil profil user:", error.message);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, []);

  useEffect(() => {
    // 1. Ambil session awal secara eksplisit
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // 2. Listener perubahan Auth
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return { user, profile, loading, signOut, refreshProfile };
};
