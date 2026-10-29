<div align="center">

  <h1>🥊 Math Boxing WEB 🧮</h1>
  <p><b>An interactive, real-time web-based mathematical boxing game & logic challenge platform.</b></p>

  <p>
    <img src="https://img.shields.io/badge/Status-Production%20Ready-success?style=flat-square" alt="Status" />
    <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
    <img src="https://img.shields.io/github/languages/top/zakiafuadi925-ops/Math_Boxing_WEB?style=flat-square" alt="Top Language" />
  </p>

</div>

---

## 🚀 About The Project

**Math Boxing WEB** is a full-stack gamified web application built to test mathematical reflexes and logical computation under pressure. It combines fast-paced calculation rounds with multiplayer match rooms, secure user profiles, and global leaderboards backed by Supabase.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Recharts, canvas-confetti
* **Backend:** Node.js, Express, TypeScript
* **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Triggers)

---

## 📂 Project Architecture

```text
Math_Boxing_WEB/
├── src/                 # React Single Page Application (Frontend)
│   ├── components/      # UI components (QuestionCard, Leaderboard, etc.)
│   └── lib/             # Supabase client & utility helpers
├── server.ts            # Express backend server & game/match logic
├── supabase_schema.sql  # Production database schema, triggers, and RLS policies
└── package.json         # Project dependencies & build scripts
