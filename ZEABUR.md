# Deploying to Zeabur

This guide will help you deploy your blog to [Zeabur](https://zeabur.com).

## Prerequisites
- A GitHub account with this repository pushed.
- A Zeabur account.

## Steps

1.  **Login to Zeabur** and create a new project.
2.  **Deploy Service**:
    - Click "Deploy New Service".
    - Select "GitHub".
    - Choose this repository.
    - Zeabur will automatically detect the `Dockerfile` and `zeabur.json` to build a robust isolated container for your Node.js and SQLite environment.
3.  **Configure Environment**:
    - Go to the **Settings** tab of your service.
    - Scroll to **Environment Variables**.
    - The environment is pre-configured by Docker, but you can override variables if needed. By default, `DB_PATH` is `/app/data/blog.db`.
    - Set `JWT_SECRET` to a strong random string for production security.
4.  **Configure Persistence (Volume) —— Important!**:

    > ⚠️ 如果不配置 Volume，每次容器重启/重新部署后，数据库和上传文件都会丢失！

    Zeabur 上 Volume 需要从 **模板市场** 添加，操作步骤如下：

    **a) 打开模板市场**
    - 进入你的项目 → 点击顶部 "+" → **Service** → 切换到 **Template** 标签页
    - 搜索 **Volume**
    - 点击 Volume 模板 → **Install**

    **b) 配置 Volume**
    - 安装完成后，Volume 会出现在你的项目列表中
    - 点击 Volume 服务 → **Settings** 标签
    - 确认 Capacity（默认 1 GiB 足够博客使用）

    **c) 将 Volume 绑定到你的博客服务**
    - 回到你的博客服务 → **Settings** 标签 → 滚动到 **Volumes** 区域
    - 点击 **Bind Volume**
    - **Volume Instance:** 选择刚才创建的 Volume
    - **Mount Path:** 填入 `/app/data`
    - 点击 **Confirm**

    **d) 重新部署**
    - 绑定完成后，点击右上角 **Redeploy** 让配置生效
    - 部署完成后，数据库文件将被持久化存储，不会因重启而丢失

    > 💡 **提示：** `/app/data` 目录下存储 `blog.db` 数据库文件和 `uploads/` 上传文件，绑定 Volume 后这些数据将永久保留。
5.  **Networking**:
    - Go to the **Networking** tab.
    - Create a domain (e.g., `my-blog.zeabur.app`) or bind your custom domain.
    - Ensure the port is set to `3000`.
6.  **Visit your Blog**:
    - Open the domain you configured.
    - Go to `/admin` to access the dashboard (default admin credentials: `admin` / `Expressive`).
    - In admin settings under "站点", set your `site_url` to the deployed domain.

## Account System

Expressive Blog includes a built-in user account system. By default, an admin account is created:

- **Username:** `admin`
- **Password:** `Expressive`

The account system can be toggled on/off in **Admin → 功能 → 账号系统**. When disabled, comments use the traditional name + email approach.

## Troubleshooting

-   **Database Errors / Content Not Loading**: If articles and moments were previously not loading, it was due to issues with the `better-sqlite3` native binaries running on incompatible auto-detected builder environments. This has been **fixed** by using a Dockerized build pipeline (`Dockerfile`) to guarantee standard library availability.
-   **Build Failures**: Check the "Build Logs". It should now display Docker build steps, which reliably installs native build dependencies (python3, make, g++).
