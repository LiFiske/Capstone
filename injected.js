// Runs in the PAGE's main world (see manifest "world": "MAIN").
// It taps X's own API responses to learn, authoritatively, which tweets are
// replies — something that cannot be told reliably from the rendered HTML.
(() => {
  if (window.__bxdInjected) return;
  window.__bxdInjected = true;

  const fullMap = {}; // tweetId -> { isReply, inReplyTo }

  // Record one tweet result node from the GraphQL payload
  function record(node, delta) {
    try {
      let t = node;
      if (t.tweet) t = t.tweet;            // TweetWithVisibilityResults wrapper
      const legacy = t.legacy;
      const id = t.rest_id || (legacy && legacy.id_str);
      if (!id || !legacy) return;

      const isReply = !!(
        legacy.in_reply_to_status_id_str ||
        legacy.in_reply_to_user_id_str   ||
        legacy.in_reply_to_screen_name
      );
      const info = { isReply, inReplyTo: legacy.in_reply_to_screen_name || null };
      fullMap[id] = info;
      delta[id]   = info;
    } catch (_) {}
  }

  // Recursively find every tweet node in a parsed response
  function walk(obj, delta, depth) {
    if (!obj || typeof obj !== 'object' || depth > 40) return;
    if (obj.__typename === 'Tweet' ||
        (obj.rest_id && obj.legacy && obj.legacy.full_text !== undefined)) {
      record(obj, delta);
    }
    for (const k in obj) {
      const v = obj[k];
      if (v && typeof v === 'object') walk(v, delta, depth + 1);
    }
  }

  function handle(text) {
    if (!text || text.indexOf('"legacy"') === -1) return; // cheap pre-filter
    let json;
    try { json = JSON.parse(text); } catch (_) { return; }
    const delta = {};
    walk(json, delta, 0);
    if (Object.keys(delta).length) {
      window.postMessage({ source: 'BXD_INJECTED', type: 'tweetinfo', map: delta }, '*');
    }
  }

  // ── Patch fetch ──
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    return origFetch.apply(this, args).then(res => {
      try {
        if (res && /graphql/i.test(res.url || '')) {
          res.clone().text().then(handle).catch(() => {});
        }
      } catch (_) {}
      return res;
    });
  };

  // ── Patch XHR (X uses this too) ──
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__bxdUrl = url;
    return origOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (...a) {
    this.addEventListener('load', () => {
      try {
        if (/graphql/i.test(this.__bxdUrl || '')) handle(this.responseText);
      } catch (_) {}
    });
    return origSend.apply(this, a);
  };

  // The content script can ask for everything captured so far (in case data
  // arrived before it started listening).
  window.addEventListener('message', (e) => {
    if (e.source === window && e.data &&
        e.data.source === 'BXD_CONTENT' && e.data.type === 'requestDump') {
      window.postMessage({ source: 'BXD_INJECTED', type: 'tweetinfo', map: fullMap }, '*');
    }
  });
})();
