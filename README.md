# Capstone Team Site

A single-page web-revival site to pitch our capstone team to companies.
Plain HTML/CSS/JS — no build step, no dependencies.

## Layout
- **Left rail (fixed):** navigation buttons that smooth-scroll the center to each section.
- **Center (scrolls on its own):** 6 sections — Capstone, Team, and 4 member profiles, each an image + text.
- **Right rail (fixed):** a "Hire this team" call-to-action plus external link buttons.

## Editing the content
Everything is edited directly in **`index.html`**. Look for the comment markers:

- `<!-- EDIT: ... -->` marks each heading, paragraph, or link you can change.
- Button labels are the text inside each `<button>` in the left rail.
- Right-rail links: change the `href="#"` values to your real URLs; change the
  `mailto:team@example.com` to your real email (in two places).

## Adding images
See **`assets/README.txt`**. In short: put `background.jpg` in `assets/` for the
background, and swap placeholder boxes for `<img>` tags when ready.

## Publishing on GitHub Pages
1. Create a repo and upload these files (keep the folder structure).
2. In the repo: **Settings → Pages**.
3. Under "Build and deployment", set **Source: Deploy from a branch**,
   **Branch: `main`**, folder **`/ (root)`**, then **Save**.
4. Wait ~1 minute. Your site is live at
   `https://<your-username>.github.io/<repo-name>/`.

## Files
```
index.html        page structure + all editable text
styles.css        colors, layout, web-revival styling (theme colors at the top)
script.js         nav scrolling + active-section highlight (rarely needs editing)
assets/           put background.jpg and section images here
```
