# Expressive Blog

A minimalist, elegant headless blog with a Material Design 3 inspired interface. Built with React, Vite, Express, and SQLite. Docker-ready for one-click deployment.

## Features

- **Headless Blog** — Write in Markdown, render beautifully with syntax highlighting
- **Material Design 3** — Expressive color system with light/dark mode and theme customization
- **Dynamic Moments** — Twitter-like micro-blogging for quick thoughts and updates
- **Built-in Comment System** — Threaded comments with avatar upload, Gravatar fallback, and email mode
- **User Account System** — Optional JWT-based auth with registration/login, profile management
- **Sidebar Widgets** — Drag-to-sort: profile, search, categories, tags, recent posts, trending, stats
- **Music Player** — Upload local audio or embed NetEase playlists
- **Webhook Integration** — Memos sync, extensible event system
- **Data Export/Import** — Full-site backup as ZIP with one-click restore
- **SEO Optimized** — Configurable meta tags, site URL, and Open Graph support
- **Framer Motion** — Smooth page transitions and micro-interactions
- **Zero Config** — SQLite database, no external services required

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (Vite + Express)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The admin panel is at `/admin`.

**Default admin account:**
- Username: `admin`
- Password: `Expressive`

## Docker Deployment

```bash
docker compose up -d
```

Or build manually:

```bash
docker build -t expressive-blog .
docker run -d -p 3000:3000 -v blog_data:/app/data -v blog_uploads:/app/uploads expressive-blog
```

## Zeabur Deployment

1. Push this repository to GitHub
2. In Zeabur, create a new project and deploy from GitHub
3. Add a **Volume** with mount path `/app/data` for data persistence
4. Set a custom domain and update `site_url` in admin settings

See [ZEABUR.md](ZEABUR.md) for detailed instructions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS 4 |
| Backend | Express 4, better-sqlite3 |
| Auth | JWT (jsonwebtoken), SHA-256 |
| Animation | Framer Motion / Motion |
| Icons | Lucide React |
| Markdown | react-markdown, remark-gfm, rehype-highlight |
| Build | esbuild, TypeScript |

## Project Structure

```
├── server.ts              # Express server entry
├── vite.config.ts         # Vite configuration
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Docker Compose with persistence
├── src/
│   ├── components/        # Reusable UI components
│   ├── context/           # React contexts (auth, theme, settings)
│   ├── lib/               # API client, utilities
│   ├── pages/             # Route pages
│   │   └── admin/         # Admin dashboard pages
│   └── server/            # Backend API & database
│       ├── api.ts         # All REST API routes
│       └── db.ts          # SQLite schema & seeding
├── public/                # Static assets
└── uploads/               # User uploads (gitignored)
```

## Settings

All site configuration is managed through the admin panel:

| Tab | Content |
|-----|---------|
| 站点 | Site title, description, icon, URL, SEO |
| 个人 | Profile info, social links |
| 内容 | Hero layout, article cards, related posts |
| 侧栏 | Widget drag-and-drop management |
| 外观 | Background, cursor effects, custom CSS, footer |
| 功能 | Comment system, account system, navigation menu |
| 音乐 | Music player, local uploads, NetEase playlist |
| Webhook | Webhook management, Memos sync |
| 其他 | Data backup/restore, about page, security |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | *(built-in fallback)* | Secret for JWT token signing |
| `DB_PATH` | `data/blog.db` | SQLite database path |
| `NODE_ENV` | `development` | Set to `production` for static serving |

## License

MIT
