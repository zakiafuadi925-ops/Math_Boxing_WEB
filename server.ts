import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// UUID validation regex to prevent Postgres syntax errors
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(val?: string | null): boolean {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

// Server-side private Supabase configuration
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

let supabaseServer: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("http")) {
  try {
    supabaseServer = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log("✅ Supabase Server initialized for:", supabaseUrl);
  } catch (err) {
    console.warn("Failed to initialize Supabase server client:", err);
  }
}

// Diagnostic API to check Supabase connection & table health
app.get("/api/db-diagnostics", async (req, res) => {
  if (!supabaseServer) {
    return res.json({
      status: "unconfigured",
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : "none",
      hasKey: Boolean(supabaseKey),
    });
  }

  const results: Record<string, any> = {};

  try {
    const { data: lb, error: lbErr } = await supabaseServer.from("leaderboard").select("*").limit(5);
    results.leaderboard = { count: lb?.length ?? 0, sample: lb, error: lbErr?.message || null };
  } catch (e: any) {
    results.leaderboard = { error: e.message };
  }

  try {
    const { data: prof, error: profErr } = await supabaseServer.from("profiles").select("*").limit(5);
    results.profiles = { count: prof?.length ?? 0, sample: prof, error: profErr?.message || null };
  } catch (e: any) {
    results.profiles = { error: e.message };
  }

  try {
    const { data: mh, error: mhErr } = await supabaseServer.from("match_history").select("*").limit(5);
    results.match_history = { count: mh?.length ?? 0, sample: mh, error: mhErr?.message || null };
  } catch (e: any) {
    results.match_history = { error: e.message };
  }

  try {
    const { data: rm, error: rmErr } = await supabaseServer.from("rooms").select("*").limit(5);
    results.rooms = { count: rm?.length ?? 0, sample: rm, error: rmErr?.message || null };
  } catch (e: any) {
    results.rooms = { error: e.message };
  }

  return res.json({
    status: "ok",
    url: supabaseUrl,
    tables: results,
    timestamp: new Date().toISOString(),
  });
});

// Check backend database configuration
app.get("/api/config", (req, res) => {
  res.json({
    configured: Boolean(supabaseServer),
    url: supabaseUrl ? true : false,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/leaderboard
app.get("/api/leaderboard", async (req, res) => {
  if (!supabaseServer) {
    return res.status(200).json({ success: true, isLiveDb: false, data: [] });
  }

  try {
    // 1. Fetch entries from leaderboard
    const { data: lbData, error: lbError } = await supabaseServer
      .from("leaderboard")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(100);

    // 2. Also fetch entries from profiles
    const { data: profData } = await supabaseServer
      .from("profiles")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(100);

    const mergedMap = new Map<string, any>();

    // Add profiles first
    if (Array.isArray(profData)) {
      for (const p of profData) {
        const key = (p.username || p.name || p.id || "").trim().toLowerCase();
        if (!key) continue;
        mergedMap.set(key, {
          id: p.id,
          user_id: p.id,
          player_name: p.username || p.name || "Petinju",
          total_score: Number(p.total_score) || 0,
          wins: Number(p.wins) || 0,
          matches_played: Number(p.matches_played) || 0,
          highest_combo: Number(p.highest_combo) || 0,
          avatar_url: p.avatar_url || p.avatar || "",
          updated_at: p.updated_at || new Date().toISOString(),
        });
      }
    }

    // Merge/override with leaderboard data
    if (Array.isArray(lbData)) {
      for (const lb of lbData) {
        const key = (lb.player_name || lb.name || lb.id || "").trim().toLowerCase();
        if (!key) continue;
        const existing = mergedMap.get(key);
        if (existing) {
          existing.total_score = Math.max(existing.total_score, Number(lb.total_score) || 0);
          existing.wins = Math.max(existing.wins, Number(lb.wins) || 0);
          existing.matches_played = Math.max(existing.matches_played, Number(lb.matches_played) || 0);
          existing.highest_combo = Math.max(existing.highest_combo || 0, Number(lb.highest_combo) || 0);
          if (!existing.avatar_url && (lb.avatar_url || lb.avatar)) {
            existing.avatar_url = lb.avatar_url || lb.avatar;
          }
        } else {
          mergedMap.set(key, {
            id: lb.id,
            user_id: lb.user_id,
            player_name: lb.player_name || lb.name || "Petinju",
            total_score: Number(lb.total_score) || 0,
            wins: Number(lb.wins) || 0,
            matches_played: Number(lb.matches_played) || 0,
            highest_combo: Number(lb.highest_combo) || 0,
            avatar_url: lb.avatar_url || lb.avatar || "",
            updated_at: lb.updated_at || new Date().toISOString(),
          });
        }
      }
    }

    const result = Array.from(mergedMap.values()).sort(
      (a, b) => (b.total_score || 0) - (a.total_score || 0)
    );

    return res.json({ success: true, isLiveDb: true, data: result });
  } catch (err: any) {
    console.error("Leaderboard query exception:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leaderboard - Simpan & Akumulasikan Skor Player
app.post("/api/leaderboard", async (req, res) => {
  if (!supabaseServer) {
    return res.status(200).json({
      success: true,
      isLiveDb: false,
      message: "Server running in offline/cached mode",
    });
  }

  const {
    user_id,
    player_name,
    total_score,
    score_increment,
    wins,
    matches_played,
    highest_combo,
  } = req.body;

  if (!player_name) {
    return res.status(400).json({ success: false, error: "player_name is required" });
  }

  // Schema public.leaderboard:
  // - id: uuid (gen_random_uuid)
  // - player_name: varchar(50) unique
  // - total_score: integer
  // - wins: integer
  // - matches_played: integer
  // - highest_combo: integer
  // - updated_at: timestamp with time zone
  // - user_id: uuid (foreign key auth.users.id)

  const cleanName = String(player_name).trim().substring(0, 50);
  const validUid = isValidUuid(user_id) ? user_id.trim() : null;

  try {
    // 1. Search for existing record by user_id or player_name (unique constraint)
    let existing: any = null;
    if (validUid) {
      const { data: byUser } = await supabaseServer
        .from("leaderboard")
        .select("*")
        .eq("user_id", validUid)
        .maybeSingle();
      if (byUser) existing = byUser;
    }

    if (!existing && cleanName) {
      const { data: byName } = await supabaseServer
        .from("leaderboard")
        .select("*")
        .ilike("player_name", cleanName)
        .maybeSingle();
      if (byName) existing = byName;
    }

    const nextWins = Number(existing?.wins ?? 0) + Number(wins ?? 0);
    const nextMatches = Number(existing?.matches_played ?? 0) + Number(matches_played ?? 1);
    const nextCombo = Math.max(Number(highest_combo ?? 0), Number(existing?.highest_combo ?? 0));
    const nextScore = Math.max(
      Number(total_score ?? 0),
      Number(existing?.total_score ?? 0) + Number(score_increment ?? 0),
      Number(existing?.total_score ?? 0)
    );

    // Payload exactly matching public.leaderboard columns
    const payload: any = {
      player_name: cleanName,
      total_score: nextScore,
      wins: nextWins,
      matches_played: nextMatches,
      highest_combo: nextCombo,
      updated_at: new Date().toISOString(),
    };
    if (validUid) {
      payload.user_id = validUid;
    }

    let saveResult: any = null;
    if (existing && existing.id) {
      saveResult = await supabaseServer
        .from("leaderboard")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .maybeSingle();
    } else {
      // Upsert using player_name unique constraint
      saveResult = await supabaseServer
        .from("leaderboard")
        .upsert(payload, { onConflict: "player_name" })
        .select()
        .maybeSingle();
    }

    if (saveResult?.error) {
      console.warn("Leaderboard save warning:", saveResult.error.message);
    }

    // 2. Also update profiles table if user_id is provided
    // Schema public.profiles:
    // - id: uuid (primary key, foreign key auth.users.id)
    // - username: text
    // - avatar_url: text
    // - total_score: integer
    // - wins: integer
    // - matches_played: integer
    // - updated_at: timestamp with time zone
    if (validUid) {
      try {
        const { data: prof } = await supabaseServer
          .from("profiles")
          .select("*")
          .eq("id", validUid)
          .maybeSingle();

        const profScore = Math.max(
          nextScore,
          Number(prof?.total_score ?? 0) + Number(score_increment ?? 0)
        );
        const profWins = Number(prof?.wins ?? 0) + Number(wins ?? 0);
        const profMatches = Number(prof?.matches_played ?? 0) + Number(matches_played ?? 1);

        await supabaseServer.from("profiles").upsert(
          {
            id: validUid,
            username: cleanName,
            total_score: profScore,
            wins: profWins,
            matches_played: profMatches,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (profErr: any) {
        console.warn("Profiles sync notice:", profErr?.message);
      }
    }

    return res.json({ success: true, isLiveDb: true, data: saveResult?.data || payload });
  } catch (err: any) {
    console.error("Leaderboard upsert exception:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/match-history - Simpan Rekam Jejak Pertandingan ke Database Supabase
app.post("/api/match-history", async (req, res) => {
  if (!supabaseServer) {
    return res.status(200).json({ success: true, isLiveDb: false });
  }

  const {
    room_id,
    user_id,
    player_name,
    opponent_name,
    player_score,
    opponent_score,
    result,
    category,
    mode,
    duration,
    accuracy,
    highest_combo,
    total_answered,
    correct_count,
    wrong_count,
    finish_reason,
  } = req.body;

  if (!player_name || !opponent_name) {
    return res.status(400).json({ success: false, error: "Missing required match parameters" });
  }

  const cleanName = String(player_name).trim().substring(0, 50);
  const cleanOpponent = String(opponent_name).trim().substring(0, 50);
  const cleanRoomId = room_id ? String(room_id).trim().substring(0, 64) : null;
  const cleanResult = String(result || "win").trim().substring(0, 10);
  const validUid = isValidUuid(user_id) ? user_id.trim() : null;

  try {
    const payload: any = {
      player_name: cleanName,
      opponent_name: cleanOpponent,
      player_score: Number(player_score) || 0,
      opponent_score: Number(opponent_score) || 0,
      result: cleanResult,
      category: category ? String(category).substring(0, 30) : "all",
      mode: mode ? String(mode).substring(0, 30) : "quick_match",
      duration: Number(duration) || 300,
      accuracy: Number(accuracy) || 100,
      highest_combo: Number(highest_combo) || 0,
      total_answered: Number(total_answered) || 0,
      correct_count: Number(correct_count) || 0,
      wrong_count: Number(wrong_count) || 0,
      finish_reason: finish_reason ? String(finish_reason).substring(0, 20) : "time_up",
      created_at: new Date().toISOString(),
    };
    if (cleanRoomId) payload.room_id = cleanRoomId;
    if (validUid) payload.user_id = validUid;

    const { data, error } = await supabaseServer
      .from("match_history")
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Supabase match_history insert error:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data: data || payload });
  } catch (err: any) {
    console.error("Match history insert exception:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/match-history/:playerName
app.get("/api/match-history/:playerName", async (req, res) => {
  if (!supabaseServer) {
    return res.status(200).json({ success: true, data: [] });
  }

  const { playerName } = req.params;
  const userId = req.query.userId as string | undefined;
  const cleanName = playerName ? String(playerName).trim() : "";
  const validUid = isValidUuid(userId) ? userId?.trim() : null;

  try {
    let query = supabaseServer.from("match_history").select("*");
    if (validUid && cleanName) {
      query = query.or(`user_id.eq.${validUid},player_name.ilike."${cleanName}",opponent_name.ilike."${cleanName}"`);
    } else if (cleanName) {
      query = query.or(`player_name.ilike."${cleanName}",opponent_name.ilike."${cleanName}"`);
    } else if (validUid) {
      query = query.eq("user_id", validUid);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.warn("Supabase fetch match history error:", error.message);
      return res.status(200).json({ success: true, data: [] });
    }

    return res.json({ success: true, data: data || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/profiles
app.post("/api/profiles", async (req, res) => {
  if (!supabaseServer) {
    return res.status(200).json({ success: true });
  }

  const { id, username, avatar_url, selected_skin, total_score, wins, matches_played, highest_combo } = req.body;
  if (!id || !isValidUuid(id)) {
    return res.status(400).json({ success: false, error: "Valid UUID id is required" });
  }

  try {
    const payload: any = {
      id,
      updated_at: new Date().toISOString(),
    };
    if (username) payload.username = String(username).trim();
    if (avatar_url !== undefined) payload.avatar_url = avatar_url || "";
    if (selected_skin) payload.selected_skin = selected_skin;
    if (total_score !== undefined) payload.total_score = Number(total_score) || 0;
    if (wins !== undefined) payload.wins = Number(wins) || 0;
    if (matches_played !== undefined) payload.matches_played = Number(matches_played) || 0;
    if (highest_combo !== undefined) payload.highest_combo = Number(highest_combo) || 0;

    const { error } = await supabaseServer.from("profiles").upsert(
      payload,
      { onConflict: "id" }
    );

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/rooms - Daftar room aktif di Supabase
app.get("/api/rooms", async (req, res) => {
  if (!supabaseServer) {
    return res.json({ success: true, rooms: [] });
  }
  try {
    const { data, error } = await supabaseServer
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return res.json({ success: true, rooms: [] });
    }
    return res.json({ success: true, rooms: data || [] });
  } catch (err: any) {
    return res.json({ success: true, rooms: [] });
  }
});

// POST /api/rooms - Buat / Update room di Supabase
// Schema public.rooms:
// - id: text (primary key)
// - room_code: text (unique)
// - status: text (default 'waiting')
// - created_at: timestamp with time zone (default now())
// - host_id: uuid (foreign key auth.users.id)
// - guest_id: uuid (foreign key auth.users.id)
// - winner_id: uuid (foreign key auth.users.id)
app.post("/api/rooms", async (req, res) => {
  if (!supabaseServer) {
    return res.json({ success: true });
  }
  const { id, room_code, status, host_id, guest_id, winner_id } = req.body;
  if (!room_code) {
    return res.status(400).json({ success: false, error: "room_code is required" });
  }

  try {
    const normalizedCode = String(room_code).trim().toUpperCase();
    const roomId = id || `room_${normalizedCode}`;

    const payload: any = {
      id: roomId,
      room_code: normalizedCode,
      status: status || "waiting",
      created_at: new Date().toISOString(),
    };
    if (isValidUuid(host_id)) payload.host_id = host_id.trim();
    if (isValidUuid(guest_id)) payload.guest_id = guest_id.trim();
    if (isValidUuid(winner_id)) payload.winner_id = winner_id.trim();

    const { data, error } = await supabaseServer
      .from("rooms")
      .upsert(payload, { onConflict: "room_code" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Rooms upsert warning:", error.message);
    }
    return res.json({ success: true, data });
  } catch (err: any) {
    return res.json({ success: false, error: err.message });
  }
});

// Initialize server & Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Math Boxing server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
