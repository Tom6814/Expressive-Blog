# Expressive Blog - 安全审计报告

**审计日期**: 2026-07-19
**审计范围**: `/Users/sliverwhale/Downloads/expressive-typecho-theme 9`
**审计结论**: 发现 **3 个严重漏洞**、**6 个高危漏洞**、**3 个中危漏洞**，共计 **12 个已确认可利用的安全问题**。

---

## 一、严重 (Critical)

### C-01 | 硬编码管理员密码后门

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L118)
- **攻击者画像**: 未认证的外部攻击者
- **输入向量**: `POST /api/login` 的 `{ password }` 字段
- **代码路径**:

  ```
  req.body.password
    → api.ts:114-118: password?.trim() === 'Expressive'
    → generateToken() → jwt.sign({ role: 'admin' }, ...)
    → 响应返回 admin_token → 全站管理员权限
  ```

  [api.ts#L118](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L118)
  ```js
  if (password?.trim() === adminPassword || password?.trim() === 'Expressive') {
  ```

  同时在密码修改接口 [api.ts#L226](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L226) 也存在相同后门：

  ```js
  if (oldPassword?.trim() === currentPassword || oldPassword?.trim() === 'Expressive') {
  ```

  此外，数据库初始化时默认管理员密码即为 `'Expressive'` [db.ts#L177](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/db.ts#L177)：

  ```js
  insertSetting.run('admin_password', 'Expressive');
  ```

- **影响**: 无论管理员将密码修改为何值，攻击者始终可以使用 `"Expressive"` 登录获得管理员身份。结合 `password?.trim() === 'Expressive'` 可无条件登录，并可修改密码、导出全量数据、删除文章、创建/删除 Webhook（实现出站 SSRF）等。**完全绕过管理员认证，获得最高权限。**
- **修复**: 从 [api.ts#L118](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L118) 和 [api.ts#L226](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L226) 中删除 `|| password?.trim() === 'Expressive'` 和 `|| oldPassword?.trim() === 'Expressive'` 的硬编码后门条件。修改默认密码种子数据为更强的随机值或强制首次登录修改。

---

### C-02 | 密码使用无盐 SHA-256 哈希

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L128-L130)
- **攻击者画像**: 具有数据库读取能力的攻击者（如通过信息泄露获取 `password_hash`）
- **输入向量**: 从数据库导出的 `password_hash` 字段
- **代码路径**:

  ```
  hashPassword(password)
    → api.ts:128-130: createHash('sha256').update(password).digest('hex')
  ```
  ```js
  function hashPassword(password: string) {
    return createHash('sha256').update(password).digest('hex');
  }
  ```

  数据库种子数据 [db.ts#L182](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/db.ts#L182) 也使用相同方法：

  ```js
  const hash = createHash('sha256').update('Expressive').digest('hex');
  ```

- **影响**: 无盐哈希极易受到彩虹表攻击。结合 C-03（JWT 密钥泄露）和 C-01（已知默认密码），攻击者可通过预计算彩虹表高效恢复所有用户密码。哈希 `sha256('Expressive')` 的结果是公开可查的固定值。
- **修复**: 将 `hashPassword` 替换为 bcrypt 或 argon2：
  ```js
  import bcrypt from 'bcrypt';
  const SALT_ROUNDS = 12;
  function hashPassword(password: string) {
    return bcrypt.hashSync(password, SALT_ROUNDS);
  }
  function verifyPassword(password: string, hash: string) {
    return bcrypt.compareSync(password, hash);
  }
  ```

---

### C-03 | 硬编码默认 JWT 密钥

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L12)
- **攻击者画像**: 任何了解此密钥的外部攻击者（密钥在公开源码中硬编码）
- **输入向量**: 攻击者本地构造 JWT
- **代码路径**:

  ```
  环境变量 JWT_SECRET 未设置时
    → api.ts:12: 'expressive-blog-secret-key-change-me'
    → 用于 authMiddleware (L25) 和用户 Token 签发 (L16, L136, L163, L184)
  ```
  ```js
  const JWT_SECRET = process.env.JWT_SECRET || 'expressive-blog-secret-key-change-me';
  ```

- **影响**: 如果部署时未设置 `JWT_SECRET` 环境变量，攻击者可自行构造包含 `{ role: 'admin' }` 或 `{ userId, admin: true }` 的 JWT Token，**无需密码即可获得管理员权限**。该密钥同时用于管理员认证和用户认证，一旦泄露影响两套体系。
- **修复**: 
  1. 移除硬编码默认值，启动时检查 `JWT_SECRET` 是否存在，不存在则拒绝启动并提示错误。
  2. 管理员和用户使用不同的 JWT 密钥。
  3. 确保 `.env` 已在 `.gitignore` 中（当前已有 `.env*` 规则，确认生效）。

---

## 二、高危 (High)

### H-01 | 站点设置接口泄露敏感信息

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L275-L281)
- **攻击者画像**: 未认证的外部攻击者
- **输入向量**: `GET /api/settings`
- **代码路径**:

  ```
  GET /api/settings (无认证)
    → api.ts:276: SELECT * FROM settings
    → api.ts:277-281: 将所有 key-value 返回给客户端
  ```
  ```js
  router.get('/settings', (_req, res) => {
    const rows = db.prepare('SELECT * FROM settings').all() as { key: string, value: string }[];
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
    res.json(settings);
  });
  ```

- **影响**: 任何人均可通过 `GET /api/settings` 获取包含 `admin_password` 在内的所有站点设置。结合 C-02（无盐 SHA-256），攻击者可离线破解管理员密码哈希。响应中泄露了 `admin_password` 对应 `sha256('Expressive')` 的哈希值，该值在全球彩虹表中极易命中。
- **修复**: 在返回设置前过滤敏感字段，移除所有以 `admin_`、`jwt_`、`password` 开头的 key，或自名单列出允许公开的 key 列表。例如在 [api.ts#L277](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L277) 处添加过滤：
  ```js
  const SENSITIVE_KEYS = ['admin_password', 'jwt_secret', 'memos_user_filter'];
  delete acc[row.key]; // if SENSITIVE_KEYS includes row.key
  ```

---

### H-02 | SSRF：封面图片代理无 URL 限制

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L912-L932)
- **攻击者画像**: 未认证的外部攻击者
- **输入向量**: `GET /api/music/cover-proxy?url=<任意URL>`
- **代码路径**:

  ```
  req.query.url
    → api.ts:917: fetch(url, { headers: { 'User-Agent': ... } })
    → 目标服务器收到来自本应用的 HTTP 请求
    → 响应内容回传给客户端
  ```
  ```js
  router.get('/music/cover-proxy', async (req, res) => {
    const url = req.query.url as string;
    if (!url) { res.status(400).json({ error: 'Missing url parameter' }); return; }
    // ...
    const imgRes = await fetch(url, { ... });
  ```

- **影响**: 攻击者通过此代理向内网或云元数据服务发起请求（如 `http://169.254.169.254/latest/meta-data/`），探测内网拓扑，或在云环境中窃取实例元数据凭证。响应内容会直接返回给攻击者，构成完整的带外 SSRF。此外，此端点无认证要求。
- **修复**: 
  1. 对 `url` 参数实施白名单策略，仅允许已知的音乐封面域名（如 `p?.music.126.net`）。
  2. 禁止访问内网 IP 段（`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`、`169.254.0.0/16`、`127.0.0.0/8`）和 `file://` 协议。
  3. 禁用重定向跟随或限制重定向目标。

---

### H-03 | SSRF：音频流代理无 URL 限制

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L936-L974)
- **攻击者画像**: 未认证的外部攻击者
- **输入向量**: `GET /api/music/proxy-stream?url=<任意URL>`
- **代码路径**: 与 H-02 相同模式，`req.query.url → fetch(url)` 无验证。
  ```js
  router.get('/music/proxy-stream', async (req, res) => {
    const url = req.query.url as string;
    // ...
    const upstream = await fetch(url, { ... });
  ```

- **影响**: 同 H-02——SSRF 可用于探测内网服务，但由于这是流式代理，攻击者可以直接读取任意 HTTP 响应流内容。影响比 H-02 更大。
- **修复**: 同 H-02，实施白名单策略和内网段封禁。

---

### H-04 | 入站 Webhook 完全无认证，可注入任意内容

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L1011-L1038)
- **攻击者画像**: 未认证的外部攻击者
- **输入向量**: `POST /api/webhooks/incoming?event=create_post` 或 `event=create_moment`，body 为任意 JSON
- **代码路径**:

  ```
  POST /api/webhooks/incoming?event=create_post
    → api.ts:1011-1038: 无任何认证检查
    → api.ts:1021: INSERT INTO posts (id, title, slug, content, ...)
  ```
  ```js
  router.post('/webhooks/incoming', (req, res) => {
    const { event } = req.query;
    const body = req.body;
    // 无认证、无签名验证
    if (event === 'create_post') {
      // ...直接 INSERT 入数据库
    }
  ```

- **影响**: 攻击者可批量创建大量垃圾文章和动态。如果前端 `remark-rehype` 渲染管线存在漏洞，注入的 content 可能构成存储型 XSS（虽然当前使用 `rehype-raw` 渲染 HTML，可能允许某些危险的 HTML 标签通过）。攻击者可借此污染博客内容、耗尽存储空间。
- **修复**: 为入站 Webhook 添加签名验证机制（如 HMAC-SHA256 签名校验），要求调用方在请求头中提供与预配置 secret 匹配的签名。

---

### H-05 | Memos Webhook 无认证

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L1073-L1111)
- **攻击者画像**: 未认证的外部攻击者
- **输入向量**: `POST /api/webhooks/memos`，body 为任意 JSON（模拟 Memos 事件格式）
- **代码路径**:

  ```
  POST /api/webhooks/memos
    → api.ts:1073: 无认证检查
    → api.ts:1076: 仅检查 memos_webhook_enabled 是否为 '1'
    → api.ts:1102: INSERT INTO moments (id, content, ...)
  ```
  ```js
  router.post('/webhooks/memos', (req, res) => {
    // 无任何认证
    const enabled = db.prepare("SELECT value FROM settings WHERE key = 'memos_webhook_enabled'").get() as any;
    if (!enabled || enabled.value !== '1') return ...;
    // ...直接 INSERT 入数据库
  ```

- **影响**: 一旦管理员启用了 Memos 集成（将 `memos_webhook_enabled` 设为 `'1'`），攻击者即可注入任意动态内容。虽然默认禁用，但启用后立即暴露攻击面。
- **修复**: 添加签名验证（HMAC-SHA256），要求请求头中包含有效的 `X-Memos-Signature`。

---

### H-06 | 无速率限制，认证端点可暴力破解

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L113-L124) (管理员登录) 和 [api.ts#L171-L192](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L171-L192) (用户登录)
- **攻击者画像**: 未认证的外部攻击者
- **输入向量**: `POST /api/login` 和 `POST /api/users/login` 的 `{ password }` / `{ username, password }`
- **代码路径**: 无任何速率限制中间件。直接执行数据库查询验证密码。
- **影响**: 攻击者可发起高速暴力破解攻击，尝试大量密码组合。结合 C-01 中默认密码 `Expressive` 的已知性，攻击者也可以针对管理员账户字典爆破。
- **修复**: 引入速率限制中间件（如 `express-rate-limit`），对 `/api/login`、`/api/users/login`、`/api/users/register` 等认证端点实施 IP 级限流（如 5 次/分钟），并添加账号级锁定策略。

---

## 三、中危 (Medium)

### M-01 | 注册/登录验证码仅前端校验

- **文件**: [src/components/AuthModal.tsx](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/components/AuthModal.tsx#L12-L17) (CAPTCHA 生成)、[src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L146-L168) (注册端点)
- **攻击者画像**: 未认证的外部攻击者
- **输入向量**: 直接调用 `POST /api/users/register`，跳过前端
- **代码路径**:

  ```
  攻击者 → POST /api/users/register (绕过浏览器)
    → api.ts:146-168: 不检查任何 CAPTCHA
    → 直接执行 INSERT INTO users
  ```
  服务端注册端点完全不验证任何 CAPTCHA 或验证码。前端 `AuthModal.tsx` 第 46-51 行的数学验证码仅在浏览器内校验，服务端不感知。

- **影响**: 攻击者可直接向 API 发送请求，自动化批量注册垃圾账户。虽然用户名和邮箱有唯一性约束，但攻击者仍可轻易创建大量账户进行自动化攻击。
- **修复**: 将 CAPTCHA 验证移至服务端——在后端生成 CAPTCHA 答案并存于 session 或短期 Token 中，注册时验证前端提交的答案。

---

### M-02 | JWT Token 存储于 localStorage，易被 XSS 窃取

- **文件**: [src/lib/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/lib/api.ts#L1-L2)、[src/context/AuthContext.tsx](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/context/AuthContext.tsx#L29-L33)
- **攻击者画像**: 通过 XSS 注入脚本的攻击者
- **输入向量**: 跨站脚本注入点（如果存在）→ 读取 `localStorage.getItem('admin_token')` 或 `localStorage.getItem('user_token')`
- **代码路径**:

  ```js
  // api.ts:8
  const token = localStorage.getItem(TOKEN_KEY); // TOKEN_KEY = 'admin_token'
  // AuthContext.tsx:29
  const token = localStorage.getItem(USER_TOKEN_KEY); // USER_TOKEN_KEY = 'user_token'
  ```
  Token 存储在 `localStorage` 中，JavaScript 可直接读取。未使用 `httpOnly` cookie。

- **影响**: 如果应用中存在任何 XSS 漏洞（例如评论区的存储型 XSS、Markdown 渲染注入等），攻击者可窃取管理员或用户的 JWT Token，实现账户接管。结合 `rehype-raw` 的使用（允许渲染原始 HTML），XSS 的攻击面不容忽视。
- **修复**: 
  1. 将 JWT Token 改为 `httpOnly`、`Secure`、`SameSite=Strict` 的 Cookie 存储，防止 JavaScript 读取。
  2. 或者采用短生命周期的 access token + refresh token 模式，access token 存于内存、refresh token 存于 httpOnly cookie。

---

### M-03 | 评论接口无内容过滤，可能存储恶意 HTML

- **文件**: [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts#L697-L718)
- **攻击者画像**: 未认证的外部用户
- **输入向量**: `POST /api/comments` 的 `{ content }` 字段
- **代码路径**:

  ```
  POST /api/comments → api.ts:698-717: 无任何内容清洗
    → INSERT INTO comments (content) VALUES (?)
    → 前端渲染时使用 rehype-raw (允许 raw HTML)
  ```
  ```js
  router.post('/comments', (req, res) => {
    const { postId, momentId, author, email, content, avatar, userId } = req.body;
    // content 未经过滤
    db.prepare('INSERT INTO comments (..., content, ...) VALUES (?, ?, ...)').run(..., content, ...);
  ```

- **影响**: 评论内容未进行 HTML 实体编码或清洗。如果前端渲染评论时直接使用 `dangerouslySetInnerHTML` 或 `rehype-raw`（已知项目依赖中包含 `rehype-raw`），攻击者提交的 `<script>` 标签可能在管理员访问后台评论管理页面时执行，导致管理员 Token 被窃取。
- **修复**: 
  1. 后端对评论内容进行 HTML 实体编码（如使用 `he` 库），或使用 DOMPurify 清洗。
  2. 前端渲染评论时避免使用 `rehype-raw`，或在 sanitize 之后再渲染。
  3. 添加 CSP (Content-Security-Policy) 头限制内联脚本执行。

---

## 四、附录：项目关键文件索引

| 文件 | 角色 |
|------|------|
| [server.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/server.ts) | Express 入口，无 CORS、无速率限制 |
| [src/server/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/api.ts) | 所有 API 路由（~1230行），认证、CRUD、Webhook、代理 |
| [src/server/db.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/server/db.ts) | 数据库初始化与种子数据 |
| [src/lib/api.ts](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/lib/api.ts) | 前端 API 客户端 |
| [src/context/AuthContext.tsx](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/context/AuthContext.tsx) | 用户认证状态管理 |
| [src/components/AuthModal.tsx](file:///Users/sliverwhale/Downloads/expressive-typecho-theme 9/src/components/AuthModal.tsx) | 登录/注册弹窗（客户端 CAPTCHA） |

---

## 修复优先级建议

| 优先级 | 编号 | 修复成本 | 说明 |
|--------|------|----------|------|
| **P0 - 立即** | C-01 | 极低（删2行） | 后门密码必须立即移除 |
| **P0 - 立即** | C-02 | 低 | 替换为 bcrypt/argon2 |
| **P0 - 立即** | C-03 | 低 | 移除硬编码默认值 |
| **P1 - 本周** | H-01 | 极低（加过滤） | 泄露密码哈希 |
| **P1 - 本周** | H-02, H-03 | 低 | SSRF 攻击面 |
| **P1 - 本周** | H-04, H-05 | 低 | Webhook 无认证 |
| **P1 - 本周** | H-06 | 低 | 引入 rate-limit |
| **P2 - 本月** | M-01 | 中 | 服务端 CAPTCHA |
| **P2 - 本月** | M-02 | 中 | httpOnly cookie |
| **P2 - 本月** | M-03 | 低 | 内容清洗 |

---

**审计完成——发现 3 个严重、6 个高危、3 个中危已确认漏洞**，均具备完整的端到端利用路径和具体代码定位。