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
    // 1. Fetch entries from leaderboard
    const { data: lbData, error: lbError } = await supabaseServer
      .from("leaderboard")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(100);

    // 2. Also fetch entries from profiles to ensure all players are included with avatars
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
          total_score: p.total_score || 0,
          wins: p.wins || 0,
          matches_played: p.matches_played || 0,
          highest_combo: p.highest_combo || 0,
          avatar_url: p.avatar_url || p.avatar || "",
          updated_at: p.updated_at || new Date().toISOString(),
        });
      }
    }

    // Merge/override with leaderboard data (taking higher score/matches)
    if (Array.isArray(lbData)) {
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
    user_id,
    player_name,
    total_score,
    score_increment,
    wins,
    matches_played,
    highest_combo,
    avatar,
    avatar_url,
  } = req.body;

  if (!player_name) {
    return res.status(400).json({ success: false, error: "player_name is required" });
  }

  try {
    // 1. Search for existing record by user_id or player_name
    let query = supabaseServer.from("leaderboard").select("*");
    if (user_id) {
      query = query.or(`user_id.eq.${user_id},player_name.eq.${player_name}`);
    } else {
      query = query.eq("player_name", player_name);
    }
    const { data: existingList } = await query.limit(1);
    const existing = existingList && existingList.length > 0 ? existingList[0] : null;

    const nextWins = (existing?.wins ?? 0) + (wins ?? 0);
    const nextMatches = (existing?.matches_played ?? 0) + (matches_played ?? 1);
    const nextCombo = Math.max(highest_combo ?? 0, existing?.highest_combo ?? 0);
    const nextScore = Math.max(
      total_score ?? 0,
      (existing?.total_score ?? 0) + (score_increment ?? 0),
      existing?.total_score ?? 0
    );
    const finalAvatar = avatar_url || avatar || existing?.avatar_url || existing?.avatar;

    const payload: any = {
      player_name,
      total_score: nextScore,
      wins: nextWins,
      matches_played: nextMatches,
      highest_combo: nextCombo,
      updated_at: new Date().toISOString(),
    };
    if (user_id) payload.user_id = user_id;
    if (finalAvatar) payload.avatar_url = finalAvatar;

    let saveResult: any;
    if (existing && existing.id) {
      // Update by primary key id (avoids constraint mismatches)
      saveResult = await supabaseServer
        .from("leaderboard")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .maybeSingle();
    } else if (existing) {
      saveResult = await supabaseServer
        .from("leaderboard")
        .update(payload)
        .eq("player_name", player_name)
        .select()
        .maybeSingle();
    } else {
      // Insert new record
      saveResult = await supabaseServer
        .from("leaderboard")
        .insert(payload)
        .select()
        .maybeSingle();

      // If insert hits a conflict, try upsert
      if (saveResult.error) {
        saveResult = await supabaseServer
          .from("leaderboard")
          .upsert(payload)
          .select()
          .maybeSingle();
      }
    }

    if (saveResult.error) {
      console.warn("Leaderboard save initial warning:", saveResult.error.message);
      // Fallback: minimal columns only in case custom columns like user_id/avatar_url aren't defined
      const minimalPayload = {
        player_name,
        total_score: nextScore,
        wins: nextWins,
        matches_played: nextMatches,
        highest_combo: nextCombo,
        updated_at: new Date().toISOString(),
      };
      if (existing?.id) {
        await supabaseServer.from("leaderboard").update(minimalPayload).eq("id", existing.id);
      } else {
        await supabaseServer.from("leaderboard").insert(minimalPayload);
      }
    }

    // 2. Also update profiles table so profile XP stays 100% in sync
    if (user_id) {
      try {
        const { data: prof } = await supabaseServer
          .from("profiles")
          .select("*")
          .eq("id", user_id)
          .maybeSingle();

        const profScore = Math.max(
          nextScore,
          (prof?.total_score ?? 0) + (score_increment ?? 0)
        );
        const profWins = (prof?.wins ?? 0) + (wins ?? 0);
        const profMatches = (prof?.matches_played ?? 0) + (matches_played ?? 1);

        await supabaseServer.from("profiles").upsert(
          {
            id: user_id,
            username: player_name,
            avatar_url: finalAvatar || prof?.avatar_url || "",
            total_score: profScore,
            wins: profWins,
            matches_played: profMatches,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      } catch (profErr) {
        console.warn("Profile sync in post leaderboard notice:", profErr);
      }
    }

    return res.json({ success: true, data: saveResult.data || payload });
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
    user_id,
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
    const fullPayload: any = {
      room_id: room_id || `match_${Date.now()}`,
      player_name,
      opponent_name,
      player_score: player_score || 0,
      opponent_score: opponent_score || 0,
      result: result || "win",
      created_at: new Date().toISOString(),
    };
    if (user_id) fullPayload.user_id = user_id;

    let { data, error } = await supabaseServer
      .from("match_history")
      .insert(fullPayload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Supabase match_history standard insert failed, trying fallback:", error.message);
      // Fallback: omit room_id and user_id if table doesn't have those columns
      const fallbackPayload: any = {
        player_name,
        opponent_name,
        player_score: player_score || 0,
        opponent_score: opponent_score || 0,
        result: result || "win",
      };
      const retry = await supabaseServer.from("match_history").insert(fallbackPayload);
      if (retry.error) {
        console.warn("Match history fallback insert error:", retry.error.message);
        return res.status(400).json({ success: false, error: retry.error.message });
      }
    }

    return res.json({ success: true, data: data || fullPayload });
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
