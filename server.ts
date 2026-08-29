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

// Server-side private Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

let supabaseServer: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("http")) {
  try {
    supabaseServer = createClient(supabaseUrl, supabaseKey);
    console.log("✅ Supabase Server connected to:", supabaseUrl);
  } catch (err) {
    console.warn("Failed to initialize Supabase server client:", err);
  }
}

// Check backend database configuration
app.get("/api/config", (req, res) => {
  res.json({
    configured: Boolean(supabaseServer),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/leaderboard
app.get("/api/leaderboard", async (req, res) => {
  if (!supabaseServer) {
    return res.status(200).json({ success: true, isLiveDb: false, data: [] });
  }

  try {
    const { data, error } = await supabaseServer
      .from("leaderboard")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Supabase leaderboard fetch error:", error.message);
      return res.status(200).json({ success: true, isLiveDb: true, data: [] });
    }

    return res.json({ success: true, isLiveDb: true, data: data || [] });
  } catch (err: any) {
    console.error("Leaderboard query exception:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leaderboard
app.post("/api/leaderboard", async (req, res) => {
  if (!supabaseServer) {
    return res.status(200).json({
      success: true,
      isLiveDb: false,
      message: "Server running in offline/cached mode",
    });
  }

  const {
    player_name,
    total_score,
    wins,
    matches_played,
    highest_combo,
  } = req.body;

  if (!player_name) {
    return res.status(400).json({ success: false, error: "player_name is required" });
  }

  try {
    // Get existing record to safely accumulate or keep best combo
    const { data: existing } = await supabaseServer
      .from("leaderboard")
      .select("*")
      .eq("player_name", player_name)
      .maybeSingle();

    const nextWins = wins ?? (existing ? existing.wins : 0);
    const nextMatches = matches_played ?? (existing ? existing.matches_played : 0);
    const nextCombo = Math.max(highest_combo ?? 0, existing?.highest_combo ?? 0);
    const nextScore = Math.max(total_score ?? 0, existing?.total_score ?? 0);

    const { data, error } = await supabaseServer
      .from("leaderboard")
      .upsert(
        {
          player_name,
          total_score: nextScore,
          wins: nextWins,
          matches_played: nextMatches,
          highest_combo: nextCombo,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_name" }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Supabase leaderboard upsert error:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error("Leaderboard upsert exception:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/match-history
app.post("/api/match-history", async (req, res) => {
  if (!supabaseServer) {
    return res.status(200).json({ success: true, isLiveDb: false });
  }

  const {
    room_id,
    player_name,
    opponent_name,
    player_score,
    opponent_score,
    result,
  } = req.body;

  if (!player_name || !opponent_name) {
    return res.status(400).json({ success: false, error: "Missing required match parameters" });
  }

  try {
    const { data, error } = await supabaseServer.from("match_history").insert({
      room_id: room_id || `match_${Date.now()}`,
      player_name,
      opponent_name,
      player_score: player_score || 0,
      opponent_score: opponent_score || 0,
      result: result || "win",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn("Supabase match_history insert error:", error.message);
      return res.status(400).json({ success: false, error: error.message });
    }

    return res.json({ success: true, data });
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

  try {
    const { data, error } = await supabaseServer
      .from("match_history")
      .select("*")
      .or(`player_name.eq.${playerName},opponent_name.eq.${playerName}`)
      .order("created_at", { ascending: false })
      .limit(20);

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

  const { id, username, avatar_url } = req.body;
  if (!id || !username) {
    return res.status(400).json({ success: false, error: "Missing id or username" });
  }

  try {
    const { error } = await supabaseServer.from("profiles").upsert(
      {
        id,
        username,
        avatar_url: avatar_url || "",
        updated_at: new Date().toISOString(),
      },
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
