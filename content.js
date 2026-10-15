(() => {
  // Guard: register listeners only once, even if injected multiple times
  if (window.__bxdInit) return;
  window.__bxdInit = true;

  // ─── State ───────────────────────────────────────────────────────────────────
  let stopRequested = false;
  let deleted     = 0;
  let unretweeted = 0;
  let unliked     = 0;
  let skipped     = 0;
  let errors      = 0;

  // Authoritative reply info captured from X's own API by injected.js,
  // keyed by tweet id → { isReply, inReplyTo }.
  const tweetInfo = {};
  window.addEventListener('message', (e) => {
    if (e.source === window && e.data &&
        e.data.source === 'BXD_INJECTED' && e.data.type === 'tweetinfo') {
      Object.assign(tweetInfo, e.data.map);
    }
  });
  // Ask for anything captured before we started listening.
  window.postMessage({ source: 'BXD_CONTENT', type: 'requestDump' }, '*');

  // ─── Utilities ───────────────────────────────────────────────────────────────

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Poll until X's API data for a tweet id arrives, or timeout elapses
  async function waitForInfo(id, timeout = 2000) {
    const start = Date.now();
    while (!tweetInfo[id] && Date.now() - start < timeout) {
      window.postMessage({ source: 'BXD_CONTENT', type: 'requestDump' }, '*');
      await sleep(150);
    }
    return tweetInfo[id];
  }

  function cutoffDate(timeframe) {
    const now = new Date();
    if (timeframe === 'all') return null;
    if (timeframe === '2w')  return new Date(now - 14 * 864e5);
    if (timeframe === '3m')  return new Date(now.setMonth(now.getMonth() - 3));
    if (timeframe === '1y')  return new Date(now.setFullYear(now.getFullYear() - 1));
    return null;
  }

  function sendProgress(status) {
    chrome.runtime.sendMessage({
      action: 'progress', deleted, unretweeted, unliked, skipped, errors, status,
    });
  }

  // Wait for a DOM element to appear, up to `timeout` ms
  function waitFor(selector, root = document, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const el = root.querySelector(selector);
      if (el) { resolve(el); return; }
      const obs = new MutationObserver(() => {
        const found = root.querySelector(selector);
        if (found) { obs.disconnect(); resolve(found); }
      });
      obs.observe(root, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); reject(new Error(`Timeout waiting for ${selector}`)); }, timeout);
    });
  }

  // Click an element and wait a tick
  async function click(el) {
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await sleep(120);
    el.click();
    await sleep(250);
  }

  // ─── Tweet parsing ───────────────────────────────────────────────────────────

  function getTweetTimestamp(article) {
    const time = article.querySelector('time');
    if (!time) return null;
    const dt = time.getAttribute('datetime');
    return dt ? new Date(dt) : null;
  }

  function getTweetText(article) {
    const textEl = article.querySelector('[data-testid="tweetText"]');
    return textEl ? textEl.innerText.toLowerCase() : '';
  }

  // The profile being viewed, taken from the URL (e.g. /myhandle or /myhandle/with_replies)
  function profileHandle() {
    const seg = location.pathname.split('/').filter(Boolean)[0];
    return seg ? seg.toLowerCase() : null;
  }

  // The @handle of the account that authored a given tweet article
  function tweetAuthorHandle(article) {
    const nameEl = article.querySelector('[data-testid="User-Name"]');
    const m = nameEl && nameEl.innerText.match(/@(\w+)/);
    return m ? m[1].toLowerCase() : null;
  }

  // Returns true if this article is the user's own tweet (not a retweet, not a
  // conversation-context tweet authored by someone else)
  function isOwnTweet(article) {
    // Retweets show a "Reposted" social context header
    const socialCtx = article.querySelector('[data-testid="socialContext"]');
    if (socialCtx && /repost/i.test(socialCtx.innerText)) return false;

    // Must have the three-dot caret menu to be deletable
    if (!article.querySelector('[data-testid="caret"]')) return false;

    // If we can read both handles, require the author to match the profile owner.
    // This filters out other people's tweets shown as conversation context.
    const owner  = profileHandle();
    const author = tweetAuthorHandle(article);
    if (owner && author) return author === owner;

    return true; // fall back to caret presence if a handle couldn't be read
  }

  // The numeric tweet id of an article, taken from its timestamp permalink.
  function articleTweetId(article) {
    const timeLink = article.querySelector('a[href*="/status/"] time');
    const link     = timeLink ? timeLink.closest('a')
                              : article.querySelector('a[href*="/status/"]');
    const href = link ? link.getAttribute('href') : '';
    const m = href && href.match(/status\/(\d+)/);
    return m ? m[1] : null;
  }

  // Returns true if this article is a reply rather than a standalone post.
  function isReply(article) {
    // Authoritative: X's own API tells us definitively. This catches replies
    // shown in-context (parent displayed above), which have no "Replying to"
    // label and no thread line — invisible to the heuristics below.
    const id = articleTweetId(article);
    if (id && tweetInfo[id]) return tweetInfo[id].isReply;

    // ── Fallback heuristics (used only if the API data hasn't arrived yet) ──

    // Signal 1: an explicit "Replying to @…" context — shown when the parent
    // tweet is NOT displayed in the timeline. Detect it by finding an element
    // whose own text starts with "Replying to" (rather than relying on where
    // innerText happens to place line breaks).
    for (const el of article.querySelectorAll('div, span')) {
      if (/^\s*Replying to\b/i.test(el.textContent) && el.querySelector('a')) {
        return true;
      }
    }

    // Signal 2: a thread-connector line entering the TOP of this tweet. X draws
    // this thin vertical line in the avatar column when the tweet is a reply
    // inside a displayed conversation or a self-thread (these have no "Replying
    // to" label). A thread *head* (a real post) has its connector only below the
    // avatar, so requiring the line to enter from the top avoids false positives.
    const box = article.getBoundingClientRect();
    for (const d of article.querySelectorAll('div')) {
      const r = d.getBoundingClientRect();
      const thin        = r.width > 0 && r.width <= 4;
      const tall        = r.height > 16;
      const leftColumn  = (r.left - box.left) < 80;
      const entersTop   = r.top <= box.top + 4;
      if (thin && tall && leftColumn && entersTop) return true;
    }
    return false;
  }

  // ─── Core deletion ───────────────────────────────────────────────────────────

  async function deleteTweet(article) {
    const caret = article.querySelector('[data-testid="caret"]');
    if (!caret) throw new Error('No caret button found');

    await click(caret);

    // Wait for the dropdown menu
    const menu = await waitFor('[role="menu"]', document, 2500);

    // Find the "Delete" menu item
    const items    = Array.from(menu.querySelectorAll('[role="menuitem"]'));
    const deleteItem = items.find(i => /^delete/i.test(i.innerText.trim()));
    if (!deleteItem) {
      // Close the menu and bail — this tweet can't be deleted (e.g. it's a reply to someone else's deleted tweet)
      document.body.click();
      await sleep(300);
      throw new Error('No Delete option in menu');
    }

    await click(deleteItem);

    // Confirm dialog
    const confirmBtn = await waitFor('[data-testid="confirmationSheetConfirm"]', document, 3000);
    await click(confirmBtn);
    await sleep(600);
  }

  // ─── Undo repost / undo like ───────────────────────────────────────────────────

  // True if the viewer has reposted this tweet (the repost button is active)
  function hasRepost(article) {
    return !!article.querySelector('[data-testid="unretweet"]');
  }

  // True if the viewer has liked this tweet (the like button is active)
  function hasLike(article) {
    return !!article.querySelector('[data-testid="unlike"]');
  }

  async function undoRepost(article) {
    const btn = article.querySelector('[data-testid="unretweet"]');
    if (!btn) throw new Error('No repost to undo');
    await click(btn);
    // X shows a small confirm menu with "Undo repost"
    const confirmBtn = await waitFor('[data-testid="unretweetConfirm"]', document, 2500);
    await click(confirmBtn);
    await sleep(400);
  }

  async function undoLike(article) {
    const btn = article.querySelector('[data-testid="unlike"]');
    if (!btn) throw new Error('No like to undo');
    await click(btn); // unliking is immediate — no confirmation dialog
    await sleep(300);
  }

  // ─── Scroll helpers ──────────────────────────────────────────────────────────

  function scrollDown(px = 600) {
    window.scrollBy({ top: px, behavior: 'smooth' });
  }

  // Collect all tweet articles currently in the DOM
  function getVisibleArticles() {
    return Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
  }

  // ─── Main loop ───────────────────────────────────────────────────────────────

  async function run({ keyword, timeframe, types, actions }) {
    window.__bxdRunning = true;
    stopRequested = false;
    deleted = 0; unretweeted = 0; unliked = 0; skipped = 0; errors = 0;

    const cutoff      = cutoffDate(timeframe);
    const needWord    = keyword.length > 0;
    const wantPosts   = types?.posts   ?? true;
    const wantReplies = types?.replies ?? false;
    const doDelete    = actions?.delete     ?? true;
    const doUnrepost  = actions?.unrepost   ?? false;
    const doUnlike    = actions?.unlike     ?? false;
    const wantDelete  = doDelete && (wantPosts || wantReplies);

    let consecutiveEmpty = 0;
    const MAX_EMPTY      = 50; // stop after this many scrolls with nothing to act on

    sendProgress('Scanning for tweets…');

    while (!stopRequested) {
      const articles = getVisibleArticles();

      let actedThisBatch = false;

      for (const article of articles) {
        if (stopRequested) break;
        if (article.__bxdProcessed) continue;

        const own = isOwnTweet(article);

        // For deletion we need authoritative post-vs-reply data; wait for it.
        const id = articleTweetId(article);
        if (wantDelete && own && id && !tweetInfo[id]) await waitForInfo(id, 2000);

        article.__bxdProcessed = true;

        // ── Shared filters (apply to every action) ──
        if (cutoff) {
          const ts = getTweetTimestamp(article);
          if (!ts || ts >= cutoff) { skipped++; continue; }
        }
        if (needWord && !getTweetText(article).includes(keyword)) { skipped++; continue; }

        // ── Choose an action for this tweet ──
        try {
          // 1) Delete own post/reply
          if (wantDelete && own) {
            const reply = isReply(article);
            if ((reply && wantReplies) || (!reply && wantPosts)) {
              sendProgress(`Deleting tweet… (${deleted} done)`);
              await deleteTweet(article);
              deleted++;
              actedThisBatch = true;
              sendProgress(`Deleted ${deleted} • undid ${unretweeted} reposts, ${unliked} likes`);
              await sleep(400);
              continue;
            }
          }

          // 2) Undo a repost (your reposts appear on the Posts tab)
          if (doUnrepost && hasRepost(article)) {
            sendProgress(`Undoing repost… (${unretweeted} done)`);
            await undoRepost(article);
            unretweeted++;
            actedThisBatch = true;
            sendProgress(`Deleted ${deleted} • undid ${unretweeted} reposts, ${unliked} likes`);
            await sleep(400);
            continue;
          }

          // 3) Undo a like (your likes appear on the Likes tab)
          if (doUnlike && hasLike(article)) {
            sendProgress(`Undoing like… (${unliked} done)`);
            await undoLike(article);
            unliked++;
            actedThisBatch = true;
            sendProgress(`Deleted ${deleted} • undid ${unretweeted} reposts, ${unliked} likes`);
            await sleep(300);
            continue;
          }

          // Nothing applicable on this tweet
          skipped++;
        } catch (e) {
          errors++;
          sendProgress(`Error: ${e.message}`);
          await sleep(500);
        }
      }

      if (!actedThisBatch) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= MAX_EMPTY) {
          break; // No more tweets found after several scrolls
        }
      } else {
        consecutiveEmpty = 0;
      }

      // Scroll down to load more tweets
      scrollDown(700);
      await sleep(1500);
    }

    window.__bxdRunning = false;
    chrome.runtime.sendMessage({
      action: 'done', deleted, unretweeted, unliked, skipped, errors,
    });
  }

  // ─── Message listener ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'start') {
      if (window.__bxdRunning) {
        chrome.runtime.sendMessage({ action: 'warn', message: 'Already running.' });
      } else {
        run({
          keyword:   msg.keyword ?? '',
          timeframe: msg.timeframe ?? 'all',
          types:     msg.types   ?? { posts: true, replies: false },
          actions:   msg.actions ?? { delete: true, unrepost: false, unlike: false },
        });
      }
      sendResponse({ ok: true });
    } else if (msg.action === 'stop') {
      stopRequested = true;
      sendResponse({ ok: true });
    }
    return true;
  });
})();
