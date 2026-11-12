# Capstone

A single-page site to pitch our capstone team. Plain HTML/CSS plus one small
script (the hover bio-swap) — no build step, drops straight onto GitHub Pages.

## Layout (top to bottom)
1. **CAPSTONE** wordmark (slab serif), top-left.
2. **Headshot row** — 4 photos, evenly aligned. Hover a photo and it lifts with a
   blue glow while the other three fade to greyscale.
3. **Team bio** — a heading + paragraphs (sans-serif), currently lorem ipsum.

## Colors
Sampled from the team photos and set as tokens at the top of `styles.css`:
- Lee's blazer blue `#47587b` (accent) · brightened `#6f90c6` (glow)
- Jon's blazer charcoal `#2c2d33` (background)

## Editing text
All in **`index.html`**, at the `<!-- EDIT -->` markers:
- Wordmark: the text inside `<h1 class="wordmark">`.
- Default team bio (shows when no photo is hovered): the `<h2>` + `<p>` paragraphs in `<section id="bio">`.
- Per-person bios (show while a photo is hovered): the `<template>` blocks inside `<div id="bio-source">`, one per person. Edit each `<h2>` and `<p>`; add more `<p>` paragraphs as needed.
- Each photo's `data-bio="name"` must match a `<template data-bio="name">`.

## Swapping photos
Replace the files in `assets/` keeping the same names (`p1.jpg`–`p4.jpg`), or change
the `src` in `index.html`. The display cells are set to **800×1256** to match the
current exports with no crop — keep that ratio for new photos (or change the
`aspect-ratio` in `styles.css` under `.shot`). Update each `alt=""` with the real name.
- `p3.jpg` = Jon · `p4.jpg` = Lee

## Optional background image
In `styles.css`, drop `assets/background.jpg` and uncomment the two lines marked `BG`.

## Publishing on GitHub Pages
1. Upload these files to a repo (keep the folder structure).
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/ (root)`, Save.
3. Live at `https://<username>.github.io/<repo>/` in ~1 minute.

## Files
```
index.html     structure + all editable text (default bio + per-person bios)
styles.css     colors (tokens at top), layout, hover effects
script.js      swaps the bio area to match the hovered photo (no edits needed)
assets/        p1–p4.jpg headshots; optional background.jpg
```
