DROP YOUR IMAGES IN THIS FOLDER
================================

1. BACKGROUND IMAGE (static, fixed behind everything)
   - Save it in this folder named exactly:  background.jpg
   - It will appear automatically. No code changes needed.
   - If you use a .png instead, rename it to background.jpg OR
     update the filename in styles.css (search for "background.jpg").

2. SECTION IMAGES (the dashed X placeholder boxes)
   - When you're ready to replace a placeholder with a real image,
     open index.html, find the matching placeholder, e.g.:

         <div class="ph ph-wide" role="img" aria-label="Image placeholder">
           <span class="ph-label">IMAGE &mdash; 16:9</span>
         </div>

     and replace the whole <div>...</div> with:

         <img class="ph-img" src="assets/your-image.jpg" alt="describe it" />

   - Then add this once to the bottom of styles.css so images fit nicely:

         .ph-img { width: 100%; border-radius: 4px; display: block;
                   margin: 0 0 22px; border: 3px solid var(--gold); }

RECOMMENDED SIZES
-----------------
   background.jpg ....... ~1920x1080 (landscape)
   wide section images .. ~1280x720 (16:9)
   portrait photos ...... ~600x800 (3:4)
