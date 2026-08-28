import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
