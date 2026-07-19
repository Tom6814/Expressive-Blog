# 🎨 Expressive Blog

> 简约而不简单 — 一款 Material Design 3 风格的无头博客系统

极简、优雅的无头博客，采用 Material Design 3 设计语言。基于 React + Vite + Express + SQLite 构建，支持 Docker 一键部署。

[English Docs](README.en.md)

---

## ✨ 特性

- 📝 **无头博客** — Markdown 写作，代码高亮，沉浸式阅读体验
- 🎨 **Material Design 3** — Expressive 色彩系统，亮暗模式自由切换，主题深度定制
- 💬 **动态 Moments** — 类似 Twitter 的短内容发布，随手记录灵感
- 💭 **内置评论系统** — 支持头像上传、Gravatar 回退、邮箱模式评论
- 👤 **用户账号系统** — 可选启用的 JWT 认证，支持注册/登录、个人资料管理
- 🧩 **侧栏小组件** — 拖拽排序：个人资料、搜索、分类、标签、近期文章、热门、统计
- 🎵 **音乐播放器** — 上传本地音频或嵌入网易云歌单
- 🔗 **Webhook 集成** — Memos 同步、可扩展事件系统
- 💾 **数据备份** — 全站 ZIP 导出/一键恢复
- 🔍 **SEO 优化** — 可配置的 Meta 标签、站点 URL、Open Graph 支持
- 🎬 **Framer Motion** — 流畅的页面过渡与微交互动画
- ⚡ **零配置** — SQLite 数据库，无需外部服务

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（Vite + Express）
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可访问。管理后台位于 `/admin`。

### 🔑 默认管理员账号

| 用户名 | 密码 |
|:---:|:---:|
| `admin` | `Expressive` |

> ⚠️ **生产环境请务必修改默认密码！**

---

## 🐳 Docker 部署

```bash
# 一键启动
docker compose up -d
```

或手动构建：

```bash
docker build -t expressive-blog .
docker run -d \
  -p 3000:3000 \
  -v blog_data:/app/data \
  -v blog_uploads:/app/uploads \
  expressive-blog
```

---

## ☁️ Zeabur 部署

1. 将本仓库推送到 GitHub
2. 在 Zeabur 中创建项目并选择 GitHub 部署
3. 添加 **Volume**，挂载路径设为 `/app/data` 保证数据持久化
4. 绑定自定义域名，并在后台「站点」设置中更新 `site_url`

> 📖 详细说明见 [ZEABUR.md](ZEABUR.md)

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 🖥️ 前端 | React 19, Vite 6, Tailwind CSS 4 |
| ⚙️ 后端 | Express 4, better-sqlite3 |
| 🔐 认证 | JWT (jsonwebtoken), SHA-256 |
| 🎬 动画 | Framer Motion / Motion |
| 🎯 图标 | Lucide React |
| 📄 Markdown | react-markdown, remark-gfm, rehype-highlight |
| 🔧 构建 | esbuild, TypeScript |

---

## 📁 项目结构

```
├── server.ts              # Express 服务入口
├── vite.config.ts         # Vite 配置
├── Dockerfile             # 多阶段 Docker 构建
├── docker-compose.yml     # Docker Compose（含数据持久化）
├── src/
│   ├── components/        # 可复用 UI 组件
│   ├── context/           # React Context（认证、主题、设置）
│   ├── lib/               # API 客户端、工具函数
│   ├── pages/             # 路由页面
│   │   └── admin/         # 管理后台页面
│   └── server/            # 后端 API 与数据库
│       ├── api.ts         # 全部 REST API 路由
│       └── db.ts          # SQLite 表结构与种子数据
├── public/                # 静态资源
└── uploads/               # 用户上传（已 gitignore）
```

---

## ⚙️ 设置面板

所有站点配置均在管理后台完成：

| 🏷️ 标签 | 📋 内容 |
|---------|--------|
| 🏠 站点 | 站点标题、描述、图标、网址、SEO |
| 👤 个人 | 个人信息、社交链接 |
| 📝 内容 | Hero 布局、文章卡片、相关文章 |
| 🧩 侧栏 | 小组件拖拽管理 |
| 🎨 外观 | 背景、光标特效、自定义 CSS、底栏 |
| 🔧 功能 | 评论系统、账号系统、导航菜单 |
| 🎵 音乐 | 音乐播放器、上传音频、网易云歌单 |
| 🔗 Webhook | Webhook 管理、Memos 同步 |
| 📦 其他 | 数据备份恢复、关于页面、安全设置 |

---

## 🔄 Memos 双向同步

支持与 [Memos](https://usememos.com) 实例双向同步动态（Moments），包括文字、图片、编辑和删除。

### 正向同步（Memos → 博客）

Memos 创建/更新/删除 memo 时，通过 Webhook 自动同步到博客动态。

**配置步骤：**

1. 进入博客管理后台 → 设置 → **Webhook** 标签页
2. 开启 **启用 Memos 同步**
3. 填写 **Memos 服务器地址**（必填，如 `https://memos.example.com`）
4. （推荐）填写 **Webhook 签名密钥**，与 Memos Webhook 设置中的 Secret 一致
5. 将显示的 **Webhook 端点 URL** 填入 Memos → 设置 → Webhook，勾选全部事件类型（创建/更新/删除）

### 反向同步（博客 → Memos）

在博客后台发布/编辑/删除动态时，自动同步到 Memos。

**配置步骤：**

1. 在上述设置中开启 **启用反向同步**
2. 填写 **Memos 访问令牌**（在 Memos → 设置 → 访问令牌 中生成）

### 图片同步

- **正向**：Memos 附件自动提取 `externalLink` 或通过 `{memos_base_url}/file/` 拼接内部图片 URL
- **反向**：博客图片 URL 自动下载并上传为 Memos 附件（`POST /api/v1/attachments`）

### 安全策略

| 层级 | 说明 |
|------|------|
| 域名信任（强制） | 必须配置 `memos_base_url`，未配置则拒绝所有 webhook |
| HMAC 签名（可选） | 配置 `webhook_secret` 后启用 SHA-256 签名验证 |

### 相关设置项

| 设置键 | 说明 | 必填 |
|--------|------|:--:|
| `memos_webhook_enabled` | 启用 Memos 同步 | ✓ |
| `memos_base_url` | Memos 服务器地址 | ✓ |
| `webhook_secret` | Webhook HMAC 签名密钥 | 推荐 |
| `memos_user_filter` | 限定接收的 Memos 用户（creatorId 或 username） | |
| `memos_reverse_sync` | 启用反向同步 | |
| `memos_api_token` | Memos 访问令牌（反向同步用） | *¹ |

> *¹ 仅启用反向同步时必填

---

## 🌍 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务器端口 |
| `JWT_SECRET` | *(内置回退)* | JWT 签名密钥 |
| `DB_PATH` | `data/blog.db` | SQLite 数据库路径 |
| `NODE_ENV` | `development` | 设为 `production` 启用静态文件服务 |

---

## 📄 许可证

MIT
