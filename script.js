/* ============================================================
   Nav behavior:
   1. Clicking a left-rail button smooth-scrolls the CENTER
      column to the matching section.
   2. The button for the section currently in view is highlighted.

   You normally never need to edit this file — just keep each
   button's data-target matching a section id in index.html.
   ============================================================ */

(function () {
  "use strict";

  var center = document.getElementById("center");
  var buttons = Array.prototype.slice.call(document.querySelectorAll(".navbtn"));

  // --- 1. Click to scroll ---
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.getElementById(btn.dataset.target);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // --- 2. Highlight the section in view ---
  var byId = {};
  buttons.forEach(function (btn) { byId[btn.dataset.target] = btn; });

  function setActive(id) {
    buttons.forEach(function (b) {
      b.classList.toggle("is-active", b.dataset.target === id);
    });
  }

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && byId[entry.target.id]) {
            setActive(entry.target.id);
          }
        });
      },
      {
        root: center,
        // A section is "active" once its top crosses the upper third.
        rootMargin: "0px 0px -65% 0px",
        threshold: 0
      }
    );

    document.querySelectorAll(".section").forEach(function (sec) {
      observer.observe(sec);
    });
  }

  // Highlight the first section on load.
  if (buttons.length) setActive(buttons[0].dataset.target);
})();
