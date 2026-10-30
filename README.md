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

# 🚀 Getting Started & Installation Guide

This guide will walk you through setting up the **Math Boxing WEB** development environment on your local machine.

---

## 📋 Prerequisites

Before you begin, ensure you have the following software installed:

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher (comes bundled with Node.js)
- **Git**: Latest version
- A **Supabase** account (for database and authentication setup)

---

## 🛠️ Installation Steps

### 1. Clone the Repository

Clone the project from GitHub to your local environment:

```bash
git clone https://github.com/zakiafuadi925-ops/Math_Boxing_WEB.git
cd Math_Boxing_WEB
```

### 2. Install Dependencies

Install all required frontend and backend packages using `npm`:

```bash
npm install
```

---

## ⚙️ Environment Configuration

1. Create a `.env` file in the root directory of the project:

   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and fill in your Supabase project credentials:

   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Server Configuration
   PORT=3000
   ```

---

## 🗄️ Database Setup (Supabase)

1. Log in to your [Supabase Dashboard](https://database.new).
2. Create a new project or select an existing one.
3. Open the **SQL Editor** from the left navigation menu.
4. Open the `supabase_schema.sql` file from this project repository.
5. Copy its entire content, paste it into the Supabase SQL Editor, and click **Run**.
   *(This step creates all necessary tables, triggers, and RLS policies).*

---

## 🏃 Running the Application

### Development Mode

To start both the Vite frontend client and Express backend server in development mode:

```bash
npm run dev
```

The app will be accessible at: `http://localhost:3000` (or the port specified in your `.env`).

### Production Build & Local Preview

To build the project for production and run the bundle:

```bash
# 1. Build the production assets and server bundle
npm run build

# 2. Start the production server
npm start
```

---

## 🧪 Troubleshooting

- **Supabase Connection Issues:** Double-check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct and match your dashboard settings.
- **Port Conflicts:** If port `3000` is already in use, change the `PORT` variable in your `.env` file to an unused port (e.g., `8080`).
- **Database Trigger Errors:** Ensure you ran the complete `supabase_schema.sql` file in your Supabase SQL Editor to enable all foreign key cascade behaviors and user trigger functions.
