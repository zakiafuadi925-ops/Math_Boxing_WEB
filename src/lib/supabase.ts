import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { calculateBadge, getRankTierByScore } from "../utils/ranks";

// Client-side fallback configuration
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

const isConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    typeof supabaseUrl === "string" &&
    supabaseUrl.startsWith("http") &&
    supabaseAnonKey.length > 10,
);

// Fallback Mock Broadcast/Presence Channel using BroadcastChannel API for multi-tab play
class MockRealtimeChannel {
  public topic: string;
  private listeners: Map<string, Array<(event: any) => void>> = new Map();
  private bc: BroadcastChannel | null = null;
  private presenceData: Record<string, any> = {};
  private myKey: string = Math.random().toString(36).substring(7);

  constructor(topic: string) {
    this.topic = topic;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.bc = new BroadcastChannel(`mb_${topic}`);
        this.bc.onmessage = (event) => {
          const { type, eventName, payload, key, state } = event.data || {};
          if (type === "broadcast" && eventName) {
            const handlers = this.listeners.get(`broadcast:${eventName}`) || [];
            handlers.forEach((h) => h({ payload }));
          } else if (type === "presence_track" && key) {
            this.presenceData[key] = state;
            if (this.presenceData[this.myKey]) {
              try {
                this.bc?.postMessage({
                  type: "presence_sync_ack",
                  key: this.myKey,
                  state: this.presenceData[this.myKey],
                });
              } catch {}
            }
            const handlers = this.listeners.get("presence:sync") || [];
            handlers.forEach((h) => h({}));
          } else if (type === "presence_sync_ack" && key) {
            this.presenceData[key] = state;
            const handlers = this.listeners.get("presence:sync") || [];
            handlers.forEach((h) => h({}));
          } else if (type === "presence_sync") {
            const handlers = this.listeners.get("presence:sync") || [];
            handlers.forEach((h) => h({}));
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel not available:", e);
      }
    }
  }

  on(type: string, filter: any, callback?: any): this {
    let eventName = "";
    if (typeof filter === "string") {
      eventName = filter;
    } else if (filter && typeof filter === "object") {
      eventName = filter.event || filter.name || "";
    }
    const eventKey =
      type === "presence"
        ? `presence:${eventName || "sync"}`
        : `broadcast:${eventName}`;
    const cb = typeof filter === "function" ? filter : callback;

    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, []);
    }
    if (cb) {
      this.listeners.get(eventKey)?.push(cb);
    }
    return this;
  }

  subscribe(callback?: (status: string, err?: any) => void): this {
    setTimeout(() => {
      if (callback) callback("SUBSCRIBED");
      const syncHandlers = this.listeners.get("presence:sync") || [];
      syncHandlers.forEach((h) => h({}));
    }, 50);
    return this;
  }

  async track(state: any): Promise<"ok"> {
    this.presenceData[this.myKey] = state;
    try {
      this.bc?.postMessage({
        type: "presence_track",
        key: this.myKey,
        state,
      });
    } catch {
      // ignore
    }
    const handlers = this.listeners.get("presence:sync") || [];
    handlers.forEach((h) => h({}));
    return "ok";
  }

  presenceState(): Record<string, any[]> {
    const res: Record<string, any[]> = {};
    for (const [k, v] of Object.entries(this.presenceData)) {
      res[k] = [v];
    }
    if (!this.presenceData[this.myKey]) {
      res[this.myKey] = [{ online_at: new Date().toISOString() }];
    }
    return res;
  }

  async send(msg: { type: string; event: string; payload: any }): Promise<"ok"> {
    try {
      this.bc?.postMessage({
        type: msg.type,
        eventName: msg.event,
        payload: msg.payload,
      });
    } catch {
      // ignore
    }
    return "ok";
  }

  unsubscribe(): void {
    try {
      this.bc?.close();
    } catch {
      // ignore
    }
    this.listeners.clear();
  }
}

// In-Memory/Safe Mock Client
function createMockSupabaseClient(): SupabaseClient {
  const channels = new Map<string, MockRealtimeChannel>();
  const authListeners: Array<(event: string, session: any) => void> = [];

  const mockClient: any = {
    auth: {
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        authListeners.push(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authListeners.indexOf(callback);
                if (idx !== -1) authListeners.splice(idx, 1);
              },
            },
          },
        };
      },
      getUser: async () => {
        const saved = localStorage.getItem("mb_mock_user");
        if (saved) {
          try {
            const user = JSON.parse(saved);
            return { data: { user }, error: null };
          } catch {
            return { data: { user: null }, error: null };
          }
        }
        return { data: { user: null }, error: null };
      },
      getSession: async () => {
        const saved = localStorage.getItem("mb_mock_user");
        if (saved) {
          try {
            const user = JSON.parse(saved);
            return { data: { session: { user } }, error: null };
          } catch {
            return { data: { session: null }, error: null };
          }
        }
        return { data: { session: null }, error: null };
      },
      signInWithOAuth: async () => {
        // Fallback simulated local player profile
        const mockUser = {
          id: `player_${Math.random().toString(36).substring(2, 9)}`,
          email: "player@mathboxing.game",
          user_metadata: {
            full_name: "Juara Math",
            avatar_url: "",
          },
        };
        localStorage.setItem("mb_mock_user", JSON.stringify(mockUser));
        authListeners.forEach((l) => l("SIGNED_IN", { user: mockUser }));
        return { data: { provider: "google", url: "" }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem("mb_mock_user");
        authListeners.forEach((l) => l("SIGNED_OUT", null));
        return { error: null };
      },
    },
    channel: (name: string) => {
      let ch = channels.get(name);
      if (!ch) {
        ch = new MockRealtimeChannel(name);
        channels.set(name, ch);
      }
      return ch;
    },
    removeChannel: (channel: MockRealtimeChannel) => {
      channel?.unsubscribe?.();
      if (channel?.topic) {
        channels.delete(channel.topic);
      }
    },
    from: (_table: string) => {
      const queryBuilder: any = {
        select: () => queryBuilder,
        eq: () => queryBuilder,
        single: async () => ({ data: null, error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        upsert: async () => ({ data: null, error: null }),
      };
      return queryBuilder;
    },
  };

  return mockClient as SupabaseClient;
}

// Inisialisasi Supabase Client dengan opsi Realtime jika credential ada, jika tidak gunakan mock
export const supabase: SupabaseClient = (() => {
  if (isConfigured) {
    try {
      return createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
    } catch (e) {
      console.warn("Failed to initialize remote Supabase client, using fallback:", e);
      return createMockSupabaseClient();
    }
  }
  console.info("Using local fallback Supabase client (VITE_SUPABASE_URL not configured)");
  return createMockSupabaseClient();
})();

// Tipe Data Player Profile
export interface PlayerProfile {
  id: string;
  uid?: string;
  name?: string;
  displayName?: string;
  email?: string;
  avatar_url?: string;
  photoURL?: string;
  high_score?: number;
}

// Tipe Data Leaderboard Entry
export interface LeaderboardEntry {
  id: string;
  rank?: number;
  name: string;
  avatar: string;
  score: number;
  winRate: number;
  badge: string;
  isCurrentUser?: boolean;
  status: "online" | "in_match" | "offline";
  categoryLabel?: string;
  totalGames?: number;
  totalWins?: number;
  highestCombo?: number;
  updatedAt?: string;
}

// Helper Login Google
export const signInWithGoogle = async (): Promise<PlayerProfile | null> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
  } catch (err) {
    console.warn("OAuth sign-in fallback handled:", err);
  }
  return null;
};

// Helper untuk mengambil Profil User Aktif
export const getCurrentUserProfile = async (): Promise<PlayerProfile | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Petinju";
    const avatar = user.user_metadata?.avatar_url || "";

    let highScore = 0;
    let wins = 0;
    let matchesPlayed = 0;
    let highestCombo = 0;

    // Ambil data profil dari public.profiles
    if (isConfigured) {
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (prof) {
          highScore = prof.total_score || 0;
          wins = prof.wins || 0;
          matchesPlayed = prof.matches_played || 0;
          highestCombo = prof.highest_combo || 0;
        } else {
          // Inisialisasi awal profil jika belum ada
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              username: name,
              avatar_url: avatar,
              total_score: 0,
              wins: 0,
              matches_played: 0,
              highest_combo: 0,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        }
      } catch (err) {
        console.warn("Profiles sync info:", err);
      }
    }

    return {
      id: user.id,
      uid: user.id,
      name,
      displayName: name,
      email: user.email,
      avatar_url: avatar,
      photoURL: avatar,
      high_score: highScore,
    };
  } catch (e) {
    console.warn("Failed to get current user profile:", e);
    return null;
  }
};

// Helper Logout
export const signOutPlayer = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (e) {
    console.warn("Error during signOutPlayer:", e);
  }
};

export { calculateBadge, getRankTierByScore };

// Client-side fallback / local storage key
const LOCAL_LEADERBOARD_KEY = "mb_synced_leaderboard_v3";

// Helper formatter
const formatLeaderboardRows = (data: any[], currentUserName?: string): LeaderboardEntry[] => {
  return data.map((item: any, idx: number) => {
    const score = item.total_score ?? item.score ?? 0;
    const matches = item.matches_played ?? item.total_games ?? 0;
    const wins = item.wins ?? item.total_wins ?? 0;
    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 100;
    const rawPlayerName = String(item.player_name || item.username || item.name || "Petinju").trim();
    const isUrlName = rawPlayerName.startsWith("http://") || rawPlayerName.startsWith("https://");
    const avatarUrl = item.avatar_url || item.avatar || (isUrlName ? rawPlayerName : null);
    const playerName = isUrlName
      ? `Petinju ${idx + 1}`
      : rawPlayerName;

    return {
      id: item.id || `lb_${idx}`,
      rank: idx + 1,
      name: playerName,
      avatar: avatarUrl || (idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🥊"),
      score,
      winRate,
      badge: calculateBadge(score),
      isCurrentUser: currentUserName
        ? playerName.toLowerCase() === currentUserName.toLowerCase()
        : false,
      status: "online",
      categoryLabel: item.category_label || "Semua Materi",
      totalGames: matches,
      totalWins: wins,
      highestCombo: item.highest_combo || 0,
    };
  });
};

// Mengambil data leaderboard dari Supabase Server API (/api/leaderboard) atau Direct Client Supabase / Local Cache
export const fetchGlobalLeaderboard = async (
  currentUserName?: string,
  currentUserLifetimeScore: number = 0,
): Promise<{ entries: LeaderboardEntry[]; isLiveDb: boolean }> => {
  // 1. Coba request ke backend server API
  try {
    const res = await fetch("/api/leaderboard");
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        let serverList = [...json.data];
        if (currentUserName && currentUserLifetimeScore > 0) {
          const userKey = currentUserName.trim().toLowerCase();
          const existingEntry = serverList.find(
            (m) => (m.player_name || m.username || "").trim().toLowerCase() === userKey
          );
          if (existingEntry) {
            existingEntry.total_score = Math.max(existingEntry.total_score || 0, currentUserLifetimeScore);
          } else {
            serverList.push({
              id: `user_active_${Date.now()}`,
              player_name: currentUserName,
              total_score: currentUserLifetimeScore,
              wins: 1,
              matches_played: 1,
              highest_combo: 0,
              avatar_url: "🥊",
            });
          }
          serverList.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
        }

        const formatted = formatLeaderboardRows(serverList, currentUserName);
        try {
          localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(formatted));
        } catch {}
        return { entries: formatted, isLiveDb: true };
      }
    }
  } catch (e) {
    console.warn("Server API fetch /api/leaderboard fallback to direct client Supabase:", e);
  }

  // 2. Direct client-side fetch from Supabase (untuk deployment Vercel / Client SPA)
  if (isConfigured && supabase) {
    try {
      const [lbRes, profRes] = await Promise.allSettled([
        supabase.from("leaderboard").select("*").order("total_score", { ascending: false }).limit(100),
        supabase.from("profiles").select("*").order("total_score", { ascending: false }).limit(100),
      ]);

      const lbData = lbRes.status === "fulfilled" && Array.isArray(lbRes.value.data) ? lbRes.value.data : [];
      const profData = profRes.status === "fulfilled" && Array.isArray(profRes.value.data) ? profRes.value.data : [];

      if (lbData.length > 0 || profData.length > 0) {
        const mergedMap = new Map<string, any>();

        for (const p of profData) {
          const key = (p.username || p.name || p.id || "").trim().toLowerCase();
          if (!key) continue;
          mergedMap.set(key, {
            id: p.id,
            user_id: p.id,
            player_name: p.username || p.name || "Petinju",
            total_score: p.total_score || 0,
            wins: p.wins || 0,
            matches_played: p.matches_played || 0,
            highest_combo: p.highest_combo || 0,
            avatar_url: p.avatar_url || p.avatar || "",
          });
        }

        for (const lb of lbData) {
          const key = (lb.player_name || lb.name || lb.id || "").trim().toLowerCase();
          if (!key) continue;
          const existing = mergedMap.get(key);
          if (existing) {
            existing.total_score = Math.max(existing.total_score, lb.total_score || 0);
            existing.wins = Math.max(existing.wins, lb.wins || 0);
            existing.matches_played = Math.max(existing.matches_played, lb.matches_played || 0);
            existing.highest_combo = Math.max(existing.highest_combo || 0, lb.highest_combo || 0);
            if (!existing.avatar_url && (lb.avatar_url || lb.avatar)) {
              existing.avatar_url = lb.avatar_url || lb.avatar;
            }
          } else {
            mergedMap.set(key, {
              id: lb.id,
              user_id: lb.user_id,
              player_name: lb.player_name || lb.name || "Petinju",
              total_score: lb.total_score || 0,
              wins: lb.wins || 0,
              matches_played: lb.matches_played || 0,
              highest_combo: lb.highest_combo || 0,
              avatar_url: lb.avatar_url || lb.avatar || "",
            });
          }
        }

        const merged = Array.from(mergedMap.values()).sort(
          (a, b) => (b.total_score || 0) - (a.total_score || 0)
        );

        if (merged.length > 0) {
          // Guarantee that active player has their latest accumulated lifetime score reflected immediately
          if (currentUserName && currentUserLifetimeScore > 0) {
            const userKey = currentUserName.trim().toLowerCase();
            const existingEntry = merged.find(
              (m) => (m.player_name || m.username || "").trim().toLowerCase() === userKey
            );
            if (existingEntry) {
              existingEntry.total_score = Math.max(existingEntry.total_score || 0, currentUserLifetimeScore);
            } else {
              merged.push({
                id: `user_active_${Date.now()}`,
                player_name: currentUserName,
                total_score: currentUserLifetimeScore,
                wins: 1,
                matches_played: 1,
                highest_combo: 0,
                avatar_url: "🥊",
              });
            }
            merged.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
          }

          const formatted = formatLeaderboardRows(merged, currentUserName);
          try {
            localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(formatted));
          } catch {}
          return { entries: formatted, isLiveDb: true };
        }
      }
    } catch (err) {
      console.warn("Direct client Supabase leaderboard fetch error:", err);
    }
  }

  // 3. Fallback ke penyimpanan lokal tersinkronisasi
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    let list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];

    // Inisialisasi awal jika cache masih kosong (Sinkron dengan database Supabase)
    if (!list || list.length === 0) {
      list = [
        {
          id: "lb-init-1",
          name: "Prof. Euler",
          avatar: "🥇",
          score: 125400,
          winRate: 93,
          badge: calculateBadge(125400),
          status: "online",
          categoryLabel: "Semua Materi",
          totalGames: 105,
          totalWins: 98,
          highestCombo: 42,
        },
        {
          id: "lb-init-2",
          name: "Dr. Hypatia",
          avatar: "🥈",
          score: 94200,
          winRate: 91,
          badge: calculateBadge(94200),
          status: "online",
          categoryLabel: "Aritmatika",
          totalGames: 82,
          totalWins: 75,
          highestCombo: 35,
        },
        {
          id: "lb-init-3",
          name: "Gauss Striker",
          avatar: "🥉",
          score: 76500,
          winRate: 86,
          badge: calculateBadge(76500),
          status: "online",
          categoryLabel: "Aljabar",
          totalGames: 70,
          totalWins: 60,
          highestCombo: 28,
        },
        {
          id: "lb-init-4",
          name: "Ada Lovelace",
          avatar: "🥊",
          score: 52300,
          winRate: 82,
          badge: calculateBadge(52300),
          status: "online",
          categoryLabel: "Pecahan",
          totalGames: 55,
          totalWins: 45,
          highestCombo: 22,
        },
        {
          id: "lb-init-5",
          name: "Ramanujan Punch",
          avatar: "🥊",
          score: 38900,
          winRate: 80,
          badge: calculateBadge(38900),
          status: "offline",
          categoryLabel: "Semua Materi",
          totalGames: 40,
          totalWins: 32,
          highestCombo: 18,
        },
      ];
      localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(list));
    }

    const activeName = currentUserName || "Pemain Kamu";
    const existingIndex = list.findIndex((e) => e.name.toLowerCase() === activeName.toLowerCase());

    if (existingIndex >= 0) {
      if (currentUserLifetimeScore > list[existingIndex].score) {
        list[existingIndex].score = currentUserLifetimeScore;
        list[existingIndex].badge = calculateBadge(currentUserLifetimeScore);
      }
      list[existingIndex].isCurrentUser = true;
    } else if (currentUserLifetimeScore > 0) {
      list.push({
        id: `player_local_${Date.now()}`,
        name: activeName,
        avatar: "⭐",
        score: currentUserLifetimeScore,
        winRate: 100,
        badge: calculateBadge(currentUserLifetimeScore),
        isCurrentUser: true,
        status: "online",
        categoryLabel: "Semua Materi",
        totalGames: 1,
        totalWins: 1,
      });
    }

    list.sort((a, b) => b.score - a.score);

    const ranked = list.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      isCurrentUser: entry.name.toLowerCase() === activeName.toLowerCase(),
    }));

    return { entries: ranked, isLiveDb: false };
  } catch (e) {
    console.error("Failed to load local leaderboard:", e);
    return { entries: [], isLiveDb: false };
  }
};

// Helper otomatis simpan score hasil pertandingan ke Backend Server / Supabase
export const saveMatchScoreToLeaderboard = async ({
  userId,
  playerName,
  opponentName,
  scoreEarned,
  opponentScore = 0,
  newLifetimeScore,
  matchResult,
  category,
  mode = "quick_match",
  avatar,
  highestCombo = 0,
  accuracy = 0,
  totalAnswered = 0,
  correctCount = 0,
  wrongCount = 0,
  roomId,
}: {
  userId?: string;
  playerName: string;
  opponentName?: string;
  scoreEarned: number;
  opponentScore?: number;
  newLifetimeScore: number;
  matchResult: "win" | "loss" | "draw";
  category: string;
  mode?: string;
  avatar?: string;
  highestCombo?: number;
  accuracy?: number;
  totalAnswered?: number;
  correctCount?: number;
  wrongCount?: number;
  roomId?: string;
}) => {
  const name = playerName.trim() || "Pemain Kamu";
  const badge = calculateBadge(newLifetimeScore);

  // 1. Simpan ke Backend Server API (/api/leaderboard & /api/match-history)
  try {
    const lbPromise = fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        player_name: name,
        total_score: newLifetimeScore,
        score_increment: scoreEarned,
        wins: matchResult === "win" ? 1 : 0,
        matches_played: 1,
        highest_combo: highestCombo,
        avatar: avatar || "🥊",
        avatar_url: avatar || "",
      }),
    }).catch((e) => console.warn("API /api/leaderboard post notice:", e));

    let mhPromise: Promise<any> | null = null;
    if (opponentName) {
      mhPromise = fetch("/api/match-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId || `room_${Date.now()}`,
          user_id: userId,
          player_name: name,
          opponent_name: opponentName,
          player_score: scoreEarned,
          opponent_score: opponentScore,
          result: matchResult,
          accuracy,
          category,
          mode,
          highest_combo: highestCombo,
          total_answered: totalAnswered,
          correct_count: correctCount,
          wrong_count: wrongCount,
        }),
      }).catch((e) => console.warn("API /api/match-history post notice:", e));
    }

    await Promise.allSettled([lbPromise, mhPromise].filter(Boolean));
  } catch (e) {
    console.warn("Backend saveMatchScore error:", e);
  }

  // 2. Direct client-side Supabase write fallback (for Vercel & Client SPA environments)
  if (isConfigured && supabase) {
    try {
      // Direct write to match_history
      supabase
        .from("match_history")
        .insert({
          room_id: roomId || `room_${Date.now()}`,
          user_id: userId,
          player_name: name,
          opponent_name: opponentName || "AI Opponent",
          player_score: scoreEarned,
          opponent_score: opponentScore,
          result: matchResult,
          accuracy,
          category,
          mode,
          highest_combo: highestCombo,
          total_answered: totalAnswered,
          correct_count: correctCount,
          wrong_count: wrongCount,
          created_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.warn("Client-side match_history write error:", error.message);
        });

      // Direct write/update to leaderboard with existence checking
      let existingLb: any = null;
      if (userId) {
        const { data } = await supabase
          .from("leaderboard")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (data) existingLb = data;
      }
      if (!existingLb && name) {
        const { data } = await supabase
          .from("leaderboard")
          .select("*")
          .ilike("player_name", name)
          .maybeSingle();
        if (data) existingLb = data;
      }

      const nextWins = (existingLb?.wins ?? 0) + (matchResult === "win" ? 1 : 0);
      const nextMatches = (existingLb?.matches_played ?? 0) + 1;
      const nextCombo = Math.max(highestCombo, existingLb?.highest_combo ?? 0);
      const nextScore = Math.max(
        newLifetimeScore,
        (existingLb?.total_score ?? 0) + scoreEarned,
        existingLb?.total_score ?? 0
      );

      const lbPayload: any = {
        player_name: name,
        total_score: nextScore,
        wins: nextWins,
        matches_played: nextMatches,
        highest_combo: nextCombo,
        updated_at: new Date().toISOString(),
      };
      if (userId) lbPayload.user_id = userId;
      if (avatar) lbPayload.avatar_url = avatar;

      if (existingLb && existingLb.id) {
        await supabase.from("leaderboard").update(lbPayload).eq("id", existingLb.id);
      } else {
        await supabase.from("leaderboard").insert(lbPayload);
      }

      // If user is logged in, also update profiles
      if (userId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        const profScore = Math.max(nextScore, (prof?.total_score ?? 0) + scoreEarned);
        const profWins = (prof?.wins ?? 0) + (matchResult === "win" ? 1 : 0);
        const profMatches = (prof?.matches_played ?? 0) + 1;
        const profCombo = Math.max(nextCombo, prof?.highest_combo ?? 0);

        await supabase.from("profiles").upsert(
          {
            id: userId,
            username: name,
            avatar_url: avatar || prof?.avatar_url || "",
            total_score: profScore,
            wins: profWins,
            matches_played: profMatches,
            highest_combo: profCombo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    } catch (dbErr) {
      console.warn("Direct Supabase write error:", dbErr);
    }
  }

  // 3. Simpan juga ke cache lokal
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    let list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];

    const existingIndex = list.findIndex(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      const prev = list[existingIndex];
      const games = (prev.totalGames || 1) + 1;
      const wins = (prev.totalWins || 1) + (matchResult === "win" ? 1 : 0);
      const calculatedWinRate = Math.round((wins / games) * 100);

      list[existingIndex] = {
        ...prev,
        score: Math.max(prev.score, newLifetimeScore),
        badge: calculateBadge(Math.max(prev.score, newLifetimeScore)),
        winRate: calculatedWinRate,
        totalGames: games,
        totalWins: wins,
        highestCombo: Math.max(prev.highestCombo || 0, highestCombo),
        categoryLabel: category === "all" ? "Semua Materi" : category.toUpperCase(),
        updatedAt: new Date().toISOString(),
      };
    } else {
      list.push({
        id: `lb_player_${Date.now()}`,
        name,
        avatar: avatar || "⭐",
        score: newLifetimeScore,
        winRate: matchResult === "win" ? 100 : 0,
        badge,
        isCurrentUser: true,
        status: "online",
        categoryLabel: category === "all" ? "Semua Materi" : category.toUpperCase(),
        totalGames: 1,
        totalWins: matchResult === "win" ? 1 : 0,
        highestCombo,
        updatedAt: new Date().toISOString(),
      });
    }

    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save to local leaderboard storage:", e);
  }
};

// Helper untuk mengambil Riwayat Pertandingan (History)
export const fetchPlayerMatchHistory = async (
  playerName: string,
  userId?: string,
): Promise<any[]> => {
  let remoteRecords: any[] = [];
  const cleanName = playerName ? playerName.trim() : "";

  // 1. Coba ambil dari Backend API /api/match-history
  try {
    const url = userId
      ? `/api/match-history/${encodeURIComponent(cleanName)}?userId=${encodeURIComponent(userId)}`
      : `/api/match-history/${encodeURIComponent(cleanName)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        remoteRecords = json.data;
      }
    }
  } catch (e) {
    console.warn("Backend match history fetch notice:", e);
  }

  // 2. Jika Backend kosong dan Supabase client aktif, coba direct fetch
  if (remoteRecords.length === 0 && isConfigured && supabase) {
    try {
      let query = supabase.from("match_history").select("*");
      if (userId && cleanName) {
        query = query.or(`user_id.eq.${userId},player_name.ilike."${cleanName}",opponent_name.ilike."${cleanName}"`);
      } else if (cleanName) {
        query = query.or(`player_name.ilike."${cleanName}",opponent_name.ilike."${cleanName}"`);
      } else if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data } = await query.order("created_at", { ascending: false }).limit(30);
      if (data && data.length > 0) {
        remoteRecords = data;
      }
    } catch (e) {
      console.warn("Direct Supabase history fetch notice:", e);
    }
  }

  // 3. Ambil dari local storage
  let localRecords: any[] = [];
  try {
    const raw = localStorage.getItem("mb_match_history");
    if (raw) localRecords = JSON.parse(raw);
  } catch (e) {}

  // 4. Merge dan format data
  if (remoteRecords.length > 0) {
    const formattedRemote = remoteRecords.map((r) => ({
      id: r.id ? `match_${r.id}` : r.room_id || `match_${Date.now()}`,
      timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
      opponentName: r.opponent_name || "Lawan",
      p1Score: r.player_score || 0,
      p2Score: r.opponent_score || 0,
      result: r.result || "win",
      category: r.category || "all",
      mode: r.mode || "quick_match",
      accuracy: r.accuracy || 0,
      totalAnswered: r.total_answered || 0,
      correctCount: r.correct_count || 0,
      wrongCount: r.wrong_count || 0,
    }));

    // Gabungkan & simpan ke cache lokal
    const merged = [...formattedRemote];
    localRecords.forEach((loc) => {
      if (!merged.some((m) => Math.abs(m.timestamp - loc.timestamp) < 5000)) {
        merged.push(loc);
      }
    });
    merged.sort((a, b) => b.timestamp - a.timestamp);
    try {
      localStorage.setItem("mb_match_history", JSON.stringify(merged.slice(0, 50)));
    } catch {}
    return merged;
  }

  return localRecords;
};

