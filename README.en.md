# 🎨 Expressive Blog

> Minimalist and expressive — a Material Design 3 headless blog system

A clean, elegant headless blog with a Material Design 3 design language. Built with React, Vite, Express, and SQLite. Docker-ready for one-click deployment.

[中文文档](README.md)

---

## ✨ Features

- 📝 **Headless Blog** — Write in Markdown, render beautifully with syntax highlighting
- 🎨 **Material Design 3** — Expressive color system with light/dark mode and deep theme customization
- 💬 **Dynamic Moments** — Twitter-style micro-blogging to capture quick thoughts
- 💭 **Built-in Comments** — Threaded comments with avatar upload, Gravatar fallback, and email-only mode
- 👤 **User Accounts** — Optional JWT-based auth with registration, login, and profile management
- 🧩 **Sidebar Widgets** — Drag-to-sort: profile, search, categories, tags, recent, trending, stats
- 🎵 **Music Player** — Upload local audio or embed a NetEase playlist
- 🔗 **Webhook Integration** — Memos sync and an extensible event system
- 💾 **Data Backup** — Full-site export as ZIP and one-click restore
- 🔍 **SEO Friendly** — Configurable meta tags, site URL, and Open Graph support
- 🎬 **Framer Motion** — Smooth page transitions and delightful micro-interactions
- ⚡ **Zero Config** — SQLite database, no external services required

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server (Vite + Express)
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). The admin panel lives at `/admin`.

### 🔑 Default Admin Account

| Username | Password |
|:---:|:---:|
| `admin` | `Expressive` |

> ⚠️ **Change the default password in production!**

---

## 🐳 Docker

```bash
# One command
docker compose up -d
```

Or build manually:

```bash
docker build -t expressive-blog .
docker run -d \
  -p 3000:3000 \
  -v blog_data:/app/data \
  -v blog_uploads:/app/uploads \
  expressive-blog
```

---

## ☁️ Zeabur

1. Push this repo to GitHub
2. Create a project on Zeabur and deploy from GitHub
3. Add a **Volume** with mount path `/app/data` for persistence
4. Bind a custom domain and update `site_url` in admin → 站点 settings

> 📖 See [ZEABUR.md](ZEABUR.md) for detailed instructions.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| 🖥️ Frontend | React 19, Vite 6, Tailwind CSS 4 |
| ⚙️ Backend | Express 4, better-sqlite3 |
| 🔐 Auth | JWT (jsonwebtoken), SHA-256 |
| 🎬 Animation | Framer Motion / Motion |
| 🎯 Icons | Lucide React |
| 📄 Markdown | react-markdown, remark-gfm, rehype-highlight |
| 🔧 Build | esbuild, TypeScript |

---

## 📁 Project Structure

```
├── server.ts              # Express server entry
├── vite.config.ts         # Vite config
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose with persistence
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/           # React contexts (auth, theme, settings)
│   ├── lib/               # API client & utilities
│   ├── pages/             # Route pages
│   │   └── admin/         # Admin dashboard
│   └── server/            # Backend API & database
│       ├── api.ts         # All REST API routes
│       └── db.ts          # SQLite schema & seeding
├── public/                # Static assets
└── uploads/               # User uploads (gitignored)
```

---

## ⚙️ Settings Panel

All site configuration lives in the admin dashboard:

| 🏷️ Tab | 📋 Contents |
|--------|-------------|
| 🏠 站点 Site | Title, description, icon, URL, SEO |
| 👤 个人 Profile | Profile info, social links |
| 📝 内容 Content | Hero layout, article cards, related posts |
| 🧩 侧栏 Sidebar | Widget drag-and-drop |
| 🎨 外观 Appearance | Background, cursor effects, custom CSS, footer |
| 🔧 功能 Features | Comment system, account system, nav menu |
| 🎵 音乐 Music | Music player, upload audio, NetEase playlist |
| 🔗 Webhook | Webhook management, Memos sync |
| 📦 其他 Other | Backup & restore, about page, security |

---

## 🔄 Memos Bidirectional Sync

Real-time sync with [Memos](https://usememos.com) for moments, including text, images, editing, and deletion.

### Forward Sync (Memos → Blog)

Memos creates/updates/deletes memos → webhook syncs to blog moments automatically.

**Setup:**

1. Go to admin → Settings → **Webhook** tab
2. Enable **Memos Sync**
3. Fill in **Memos Server URL** (required, e.g. `https://memos.example.com`)
4. (Recommended) Fill in **Webhook Secret**, matching the secret configured in Memos
5. Copy the **Webhook Endpoint URL** into Memos → Settings → Webhook, check all event types (created/updated/deleted)

### Reverse Sync (Blog → Memos)

Creating/editing/deleting moments in the blog admin panel auto-syncs to Memos.

**Setup:**

1. In the same settings section, enable **Reverse Sync**
2. Fill in **Memos Access Token** (generated in Memos → Settings → Access Tokens)

### One-Click Import

The admin Moments page has a **Sync Memos** button that pulls all memos from your Memos account (including images) and imports them in bulk. Already-synced items are skipped via `memos_ref` deduplication.

### Image Sync

- **Forward**: Extracts `externalLink` from Memos attachments, or constructs internal URLs via `{memos_base_url}/file/`
- **Reverse**: Downloads blog image URLs and uploads them as Memos attachments (`POST /api/v1/attachments`)

### Security

| Tier | Description |
|------|-------------|
| Domain trust (mandatory) | `memos_base_url` must be configured; unconfigured webhooks are rejected |
| HMAC signature (optional) | Set `webhook_secret` to enable SHA-256 signature verification |

### Settings Reference

| Key | Description | Required |
|-----|-------------|:--:|
| `memos_webhook_enabled` | Enable Memos sync | ✓ |
| `memos_base_url` | Memos server URL | ✓ |
| `webhook_secret` | Webhook HMAC signing secret | Recommended |
| `memos_user_filter` | Allowed Memos users (creatorId or username) | |
| `memos_reverse_sync` | Enable reverse sync | |
| `memos_api_token` | Memos access token (reverse sync) | *¹ |

> *¹ Required only when reverse sync is enabled

---

## 🌍 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | *(built-in fallback)* | JWT signing secret |
| `DB_PATH` | `data/blog.db` | SQLite database path |
| `NODE_ENV` | `development` | Set to `production` for static serving |

---

## 📄 License

MIT
