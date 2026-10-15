(() => {
  const startBtn      = document.getElementById('start-btn');
  const stopBtn       = document.getElementById('stop-btn');
  const keywordInput  = document.getElementById('keyword');
  const statusBar     = document.getElementById('status-bar');
  const cntDeleted    = document.getElementById('cnt-deleted');
  const cntUnrt       = document.getElementById('cnt-unrt');
  const cntUnliked    = document.getElementById('cnt-unliked');
  const cntSkipped    = document.getElementById('cnt-skipped');
  const cntErrors     = document.getElementById('cnt-errors');
  const chkDelete     = document.getElementById('chk-delete');
  const chkUnrepost   = document.getElementById('chk-unrepost');
  const chkUnlike     = document.getElementById('chk-unlike');
  const chkPosts      = document.getElementById('chk-posts');
  const chkReplies    = document.getElementById('chk-replies');
  const deleteTypes   = document.getElementById('delete-types');

  let running = false;

  // Highlight selected radio cards (time frame only — checkboxes handled separately)
  document.querySelectorAll('#timeframe-group .radio-option').forEach(label => {
    label.addEventListener('click', () => {
      document.querySelectorAll('#timeframe-group .radio-option')
        .forEach(l => l.classList.remove('selected'));
      label.classList.add('selected');
    });
  });

  // Highlight checkbox cards based on checked state
  [chkDelete, chkUnrepost, chkUnlike, chkPosts, chkReplies].forEach(chk => {
    chk.addEventListener('change', () => {
      chk.closest('.radio-option').classList.toggle('selected', chk.checked);
    });
  });

  // Show the "which tweets" sub-options only when Delete is selected
  function syncDeleteTypes() {
    deleteTypes.style.display = chkDelete.checked ? '' : 'none';
  }
  chkDelete.addEventListener('change', syncDeleteTypes);
  syncDeleteTypes();

  function setStatus(msg, type = '') {
    statusBar.textContent = msg;
    statusBar.className   = type;
  }

  function updateCounters(data) {
    cntDeleted.textContent = data.deleted     ?? 0;
    cntUnrt.textContent    = data.unretweeted ?? 0;
    cntUnliked.textContent = data.unliked     ?? 0;
    cntSkipped.textContent = data.skipped     ?? 0;
    cntErrors.textContent  = data.errors      ?? 0;
  }

  function getSelectedTimeframe() {
    return document.querySelector('input[name="timeframe"]:checked')?.value ?? 'all';
  }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function sendToContent(action, payload = {}) {
    const tab = await getActiveTab();
    return chrome.tabs.sendMessage(tab.id, { action, ...payload });
  }

  // Listen for progress updates pushed from the content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'progress') {
      updateCounters(msg);
      setStatus(msg.status ?? '', 'running');
    } else if (msg.action === 'done') {
      updateCounters(msg);
      setStatus(
        `Finished. Deleted ${msg.deleted}, un-RT ${msg.unretweeted}, ` +
        `un-liked ${msg.unliked}, skipped ${msg.skipped}, errors ${msg.errors}.`,
        'done'
      );
      running = false;
      startBtn.disabled = false;
      stopBtn.disabled  = true;
    } else if (msg.action === 'error') {
      setStatus(msg.message ?? 'Unknown error.', 'error');
      running = false;
      startBtn.disabled = false;
      stopBtn.disabled  = true;
    } else if (msg.action === 'warn') {
      setStatus(msg.message ?? '', 'warn');
    }
  });

  startBtn.addEventListener('click', async () => {
    const tab = await getActiveTab();
    const url = tab?.url ?? '';

    if (!url.includes('x.com') && !url.includes('twitter.com')) {
      setStatus('Open X.com on the relevant profile tab (Posts / Replies / Likes) first.', 'error');
      return;
    }

    if (!chkDelete.checked && !chkUnrepost.checked && !chkUnlike.checked) {
      setStatus('Select at least one action.', 'error');
      return;
    }

    if (chkDelete.checked && !chkPosts.checked && !chkReplies.checked) {
      setStatus('Delete is on — choose Posts and/or Replies.', 'error');
      return;
    }

    // Reset counters
    updateCounters({});

    running           = true;
    startBtn.disabled = true;
    stopBtn.disabled  = false;
    setStatus('Starting…', 'running');

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files:  ['content.js'],
      });
    } catch (_) {
      // Already injected — ignore
    }

    await sendToContent('start', {
      keyword:   keywordInput.value.trim().toLowerCase(),
      timeframe: getSelectedTimeframe(),
      types:     { posts: chkPosts.checked, replies: chkReplies.checked },
      actions:   {
        delete:   chkDelete.checked,
        unrepost: chkUnrepost.checked,
        unlike:   chkUnlike.checked,
      },
    });
  });

  stopBtn.addEventListener('click', async () => {
    await sendToContent('stop');
    setStatus('Stopping after current tweet…', 'warn');
    stopBtn.disabled = true;
  });
})();
