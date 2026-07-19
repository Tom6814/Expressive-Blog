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

    > ⚠️ If you don't configure a Volume, your database and uploads will be lost on every restart/redeploy!

    On Zeabur, Volumes are added from the **Template Marketplace**:

    **a) Open Template Marketplace**
    - Go to your project → click "+" at the top → **Service** → switch to **Template** tab
    - Search for **Volume**
    - Click the Volume template → **Install**

    **b) Configure the Volume**
    - Once installed, the Volume appears in your project list
    - Click the Volume service → **Settings** tab
    - Confirm the Capacity (default 1 GiB is enough for a blog)

    **c) Bind Volume to your blog service**
    - Go back to your blog service → **Settings** tab → scroll to **Volumes**
    - Click **Bind Volume**
    - **Volume Instance:** select the Volume you just created
    - **Mount Path:** enter `/app/data`
    - Click **Confirm**

    **d) Redeploy**
    - After binding, click **Redeploy** to apply the changes
    - Once deployed, your database will be persisted and survive restarts

    > 💡 **Tip:** The `/app/data` directory stores `blog.db` and uploaded files. Binding a Volume keeps all data safe permanently.
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
