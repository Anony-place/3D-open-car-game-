# Deployment Guide - Cloudflare Pages

This game is a static web application and can be deployed easily to **Cloudflare Pages**.

## Method 1: Cloudflare Dashboard (Recommended)

1. **Push your code to GitHub/GitLab**: Ensure all your files (`index.html`, `src/`, `css/`, etc.) are in your repository.
2. **Log in to Cloudflare**: Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
3. **Navigate to Workers & Pages**: Click on "Workers & Pages" in the sidebar.
4. **Create Application**:
   - Click **"Create application"**.
   - Select the **"Pages"** tab.
   - Click **"Connect to Git"**.
5. **Select Repository**: Select the repository where you pushed the game code.
6. **Configure Build Settings**:
   - **Project name**: Choose any name (e.g., `city-drift-pro`).
   - **Production branch**: Usually `main` or `master`.
   - **Framework preset**: Select **"None"**.
   - **Build command**: Leave this **empty** (there is no build step).
   - **Build output directory**: Enter **`/`** (root directory).
7. **Deploy**: Click **"Save and Deploy"**.

Your game will be live at `https://your-project-name.pages.dev`.

---

## Method 2: Command Line (Using Wrangler)

If you prefer deploying directly from your terminal:

1. **Install Wrangler**:
   ```bash
   npm install -g wrangler
   ```
2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```
3. **Deploy**:
   Run this command from the root of the project:
   ```bash
   wrangler pages deploy .
   ```
   - Follow the prompts to create a new project.
   - Set the production branch to `main`.

---

## Important Notes
- **HTTPS**: Cloudflare provides SSL automatically.
- **Assets**: Ensure all paths in `index.html` and `src/` are relative (e.g., `./src/main.js`) to avoid loading issues on subdomains.
- **Import Maps**: The project uses an `importmap` in `index.html`. This works natively in modern browsers without a build tool like Vite or Webpack.
