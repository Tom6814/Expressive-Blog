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
4.  **Configure Persistence (Important!)**:
    - Go to the **Settings** tab.
    - Scroll to **Volumes**.
    - Click "Add Volume".
    - Set the **Mount Path** to `/app/data`.
    - This ensures your database (`blog.db`) and uploaded files are not lost when the app restarts.
5.  **Networking**:
    - Go to the **Networking** tab.
    - Create a domain (e.g., `my-blog.zeabur.app`) or bind your custom domain.
    - Ensure the port is set to `3000`.
6.  **Visit your Blog**:
    - Open the domain you configured.
    - The default admin password is `Torres114514`.
    - Go to `/admin/login` to access the dashboard.

## Troubleshooting

-   **Database Errors / Content Not Loading**: If articles and moments were previously not loading, it was due to issues with the `better-sqlite3` native binaries running on incompatible auto-detected builder environments. This has been **fixed** by using a Dockerized build pipeline (`Dockerfile`) to guarantee standard library availability.
-   **Build Failures**: Check the "Build Logs". It should now display Docker build steps, which reliably installs native build dependencies (python3, make, g++).