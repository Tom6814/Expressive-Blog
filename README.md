# 🎨 Expressive Blog

> Minimalist and expressive — a Material Design 3 headless blog system

A clean, elegant headless blog with a Material Design 3 design language. Built with React, Vite, Express, and SQLite. Docker-ready for one-click deployment.

[中文文档](README.zh-CN.md)

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
3. **Add a Volume for persistence:**
   - Click **+** → **Service** → **Template** → search **Volume** → Install
   - Go to your blog service → **Settings** → **Volumes** → **Bind Volume**
   - Select the Volume instance, set **Mount Path** to `/app/data`, click Confirm
   - Click **Redeploy** to apply
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
