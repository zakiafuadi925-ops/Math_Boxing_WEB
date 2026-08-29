import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

    // Sync data profil ke public.profiles
    if (isConfigured) {
      try {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            username: name,
            avatar_url: avatar,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
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
      high_score: 0,
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

// Helper untuk menghitung badge rank berdasarkan score
export const calculateBadge = (score: number): string => {
  if (score >= 500) return "Grandmaster";
  if (score >= 350) return "Master";
  if (score >= 250) return "Diamond";
  if (score >= 150) return "Platinum";
  if (score >= 50) return "Gold";
  return "Pemula";
};

// Client-side fallback / local storage key
const LOCAL_LEADERBOARD_KEY = "mb_synced_leaderboard";

// Mengambil data leaderboard dari Supabase Server API (/api/leaderboard) atau Local Cache
export const fetchGlobalLeaderboard = async (
  currentUserName?: string,
  currentUserLifetimeScore: number = 0,
): Promise<{ entries: LeaderboardEntry[]; isLiveDb: boolean }> => {
  // 1. Coba request ke backend server API
  try {
    const res = await fetch("/api/leaderboard");
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.isLiveDb && Array.isArray(json.data) && json.data.length > 0) {
        const formatted: LeaderboardEntry[] = json.data.map((item: any, idx: number) => {
          const score = item.total_score ?? item.score ?? 0;
          const matches = item.matches_played ?? item.total_games ?? 0;
          const wins = item.wins ?? item.total_wins ?? 0;
          const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 100;
          const playerName = item.player_name || item.name || "Petinju";

          return {
            id: item.id || `lb_${idx}`,
            rank: idx + 1,
            name: playerName,
            avatar: item.avatar || (idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🥊"),
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
        return { entries: formatted, isLiveDb: true };
      }
    }
  } catch (e) {
    console.warn("Server API fetch /api/leaderboard fallback to local cache:", e);
  }

  // 2. Fallback ke penyimpanan lokal tersinkronisasi
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    let list: LeaderboardEntry[] = raw ? JSON.parse(raw) : [];

    // Inisialisasi awal jika cache masih kosong
    if (!list || list.length === 0) {
      list = [
        {
          id: "lb-init-1",
          name: "Budi Math-Champ",
          avatar: "🥇",
          score: 480,
          winRate: 96,
          badge: "Grandmaster",
          status: "online",
          categoryLabel: "Aritmatika",
          totalGames: 42,
          totalWins: 40,
        },
        {
          id: "lb-init-2",
          name: "Siti Speed-Math",
          avatar: "🥈",
          score: 410,
          winRate: 92,
          badge: "Master",
          status: "in_match",
          categoryLabel: "Aljabar",
          totalGames: 36,
          totalWins: 33,
        },
        {
          id: "lb-init-3",
          name: "Rizky KO-Striker",
          avatar: "🥉",
          score: 360,
          winRate: 88,
          badge: "Diamond",
          status: "online",
          categoryLabel: "Akar Pangkat",
          totalGames: 30,
          totalWins: 26,
        },
        {
          id: "lb-init-4",
          name: "Ahmad Speed-Calc",
          avatar: "🥊",
          score: 310,
          winRate: 85,
          badge: "Platinum",
          status: "offline",
          categoryLabel: "Fisika Dasar",
          totalGames: 25,
          totalWins: 21,
        },
        {
          id: "lb-init-5",
          name: "Dewi Formula-Pro",
          avatar: "⚡",
          score: 275,
          winRate: 81,
          badge: "Gold",
          status: "online",
          categoryLabel: "Geometri",
          totalGames: 22,
          totalWins: 18,
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
  playerName,
  opponentName,
  scoreEarned,
  opponentScore = 0,
  newLifetimeScore,
  matchResult,
  category,
  avatar,
  highestCombo = 0,
  roomId,
}: {
  playerName: string;
  opponentName?: string;
  scoreEarned: number;
  opponentScore?: number;
  newLifetimeScore: number;
  matchResult: "win" | "loss" | "draw";
  category: string;
  avatar?: string;
  highestCombo?: number;
  roomId?: string;
}) => {
  const name = playerName.trim() || "Pemain Kamu";
  const badge = calculateBadge(newLifetimeScore);

  // 1. Simpan ke Backend Server API (/api/leaderboard & /api/match-history)
  try {
    fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: name,
        total_score: newLifetimeScore,
        wins: matchResult === "win" ? 1 : 0,
        matches_played: 1,
        highest_combo: highestCombo,
      }),
    }).catch((e) => console.warn("API /api/leaderboard post notice:", e));

    if (opponentName) {
      fetch("/api/match-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: roomId || `room_${Date.now()}`,
          player_name: name,
          opponent_name: opponentName,
          player_score: scoreEarned,
          opponent_score: opponentScore,
          result: matchResult,
        }),
      }).catch((e) => console.warn("API /api/match-history post notice:", e));
    }
  } catch (e) {
    console.warn("Backend saveMatchScore error:", e);
  }

  // 2. Simpan juga ke cache lokal
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

