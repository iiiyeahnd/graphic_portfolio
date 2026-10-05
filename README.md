# Ian Bataller — Portfolio Site

Plain HTML/CSS/JS portfolio, built to apply for graphic design (apparel/streetwear) roles.

## Files
- `index.html` — all page content
- `style.css` — all styling
- `script.js` — mobile nav toggle + scroll animations

## Before you deploy: add your images
Open `index.html` in VS Code and press **Ctrl+F**, search for `IMG-PLACEHOLDER`.
Each spot has a comment telling you exactly what image to add, the ideal
size, and (where useful) a link to a free tool for making a mockup. There
are 6 work slots — delete any `<article class="work-card">…</article>`
block you don't need instead of leaving it empty.

Also swap the `#` placeholders in the "Contact" section (Instagram,
LinkedIn) for your real profile links.

## Deploying to Vercel (first time)

1. **Create a GitHub account** (if you don't have one) at github.com, then
   create a new repository — e.g. `ian-portfolio`. Keep it Public or
   Private, either works.
2. **Upload your files to that repo.** Easiest way with no command line:
   on the repo page click "uploading an existing file" and drag in
   `index.html`, `style.css`, `script.js`, and any image files you added.
   Commit the changes.
3. **Create a Vercel account** at vercel.com — click "Sign Up" and choose
   "Continue with GitHub" so the two are linked automatically.
4. **Import the project.** On your Vercel dashboard click "Add New…" →
   "Project". Find your `ian-portfolio` repo in the list and click
   "Import".
5. **Leave the settings as-is.** Vercel auto-detects a static site (no
   framework, no build command needed) — just click "Deploy".
6. **Wait ~30 seconds.** Vercel will give you a live URL like
   `ian-portfolio.vercel.app`. That's your site, live on the internet.
7. **Future updates:** any time you edit a file in your GitHub repo
   (upload a new version the same way as step 2), Vercel automatically
   redeploys the live site within a minute — no extra steps needed.

Optional: in the Vercel project settings you can add a custom domain
later if you buy one.