/* ============================================================
   Hover a headshot -> the per-person bio area swaps to that
   person. Move the cursor away from the row -> it returns to the
   default "Meet the Team" copy. (The "What is a Capstone" FAQ is
   a separate, static section and is NOT affected by hovering.)

   You don't need to edit this file. All the wording lives in
   index.html (the default intro in #team-bio, each person in
   #bio-source). Each photo's data-bio="..." must match a
   <template data-bio="...">.
   ============================================================ */

(function () {
  "use strict";

  var bio = document.getElementById("team-bio");
  if (!bio) return;

  var team = document.querySelector(".team");

  // The default team bio = whatever is in #bio at page load.
  var defaultHTML = bio.innerHTML;

  // Collect each person's bio HTML from the hidden templates.
  var sources = {};
  document.querySelectorAll("#bio-source template").forEach(function (t) {
    sources[t.getAttribute("data-bio")] = t.innerHTML;
  });

  var current = "default";

  function show(key, html) {
    if (current === key) return;      // already showing it
    current = key;
    bio.classList.add("is-fading");   // fade out
    setTimeout(function () {
      bio.innerHTML = html;           // swap content
      bio.classList.remove("is-fading"); // fade back in
    }, 140);
  }

  // Hover a photo -> show that person.
  document.querySelectorAll(".shot").forEach(function (shot) {
    var key = shot.getAttribute("data-bio");
    shot.addEventListener("mouseenter", function () {
      if (sources[key]) show(key, sources[key]);
    });
  });

  // Leave the whole row -> back to the default team bio.
  if (team) {
    team.addEventListener("mouseleave", function () {
      show("default", defaultHTML);
    });
  }
})();
