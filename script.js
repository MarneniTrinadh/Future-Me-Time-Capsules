/* ===========================================================
   Future Me — application logic (vanilla JS, no frameworks)
   -----------------------------------------------------------
   Sections:
     1. Constants & tiny helpers
     2. Storage layer (localStorage)
     3. Theme
     4. Motivational quotes
     5. Form: presets, validation, submit
     6. Dashboard: render, countdown tick, progress
     7. Reveal modal
     8. Toasts & scroll reveal
     9. Boot
   =========================================================== */

(function () {
  'use strict';

  /* ---------- 1. Constants & helpers ---------- */

  const STORE_KEY = 'futureMe.capsules.v1';
  const THEME_KEY = 'futureMe.theme';
  const MIN_LEAD_MS = 60 * 1000; // unlock date must be at least a minute out

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const el = {
    form: $('#capsuleForm'),
    name: $('#name'),
    message: $('#message'),
    date: $('#unlockDate'),
    charCount: $('#charCount'),
    chips: $$('.chip'),
    list: $('#capsuleList'),
    empty: $('#emptyState'),
    stats: $('#statsLine'),
    filters: $$('.filter'),
    themeToggle: $('#themeToggle'),
    quoteCard: $('#quoteCard'),
    quoteText: $('#quoteText'),
    quoteAuthor: $('#quoteAuthor'),
    quoteRefresh: $('#quoteRefresh'),
    modal: $('#revealModal'),
    modalTitle: $('#modalTitle'),
    modalMeta: $('#modalMeta'),
    modalBody: $('#modalBody'),
    toasts: $('#toastStack')
  };

  const pad = (n) => String(n).padStart(2, '0');

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function uid() {
    return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
  const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  /** Break a millisecond span into d / h / m / s. */
  function breakdown(ms) {
    const t = Math.max(0, ms);
    return {
      days: Math.floor(t / 86400000),
      hours: Math.floor(t / 3600000) % 24,
      mins: Math.floor(t / 60000) % 60,
      secs: Math.floor(t / 1000) % 60
    };
  }

  /* ---------- 2. Storage layer ---------- */

  let capsules = [];
  let activeFilter = 'all';

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      // Keep only well-formed records so one bad entry can't break the board.
      return parsed.filter((c) => c && c.id && typeof c.message === 'string' && c.unlockAt);
    } catch (err) {
      console.warn('Could not read saved capsules:', err);
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(capsules));
      return true;
    } catch (err) {
      console.warn('Could not save capsules:', err);
      toast('Storage is full or blocked — this capsule may not survive a refresh.', 'error');
      return false;
    }
  }

  const isUnlocked = (c) => Date.now() >= c.unlockAt;

  /* ---------- 3. Theme ---------- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    el.themeToggle.setAttribute(
      'aria-label',
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (err) { /* private mode */ }
    const prefersDark = window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));

    el.themeToggle.addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* ignore */ }
    });

    // Follow the OS only while the user hasn't picked a theme themselves.
    if (!saved && window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        let stillUnset = null;
        try { stillUnset = localStorage.getItem(THEME_KEY); } catch (err) { /* ignore */ }
        if (!stillUnset) applyTheme(e.matches ? 'dark' : 'light');
      });
    }
  }

  /* ---------- 4. Motivational quotes ---------- */

  const QUOTES = [
    ['The best time to plant a tree was 20 years ago. The second best time is now.', 'Chinese Proverb'],
    ['You are never too old to set another goal or to dream a new dream.', 'C.S. Lewis'],
    ['What you do today can improve all your tomorrows.', 'Ralph Marston'],
    ['The future depends on what you do today.', 'Mahatma Gandhi'],
    ['Do not wait for the perfect moment. Take the moment and make it perfect.', 'Zoey Sayward'],
    ['Little by little, one travels far.', 'J.R.R. Tolkien'],
    ['A year from now you may wish you had started today.', 'Karen Lamb'],
    ['It does not matter how slowly you go as long as you do not stop.', 'Confucius'],
    ['Your future is created by what you do today, not tomorrow.', 'Robert Kiyosaki'],
    ['We suffer more often in imagination than in reality.', 'Seneca'],
    ['The journey of a thousand miles begins with a single step.', 'Lao Tzu'],
    ['Everything you have ever wanted is on the other side of fear.', 'George Addair'],
    ['Start where you are. Use what you have. Do what you can.', 'Arthur Ashe'],
    ['Time is the coin of your life. Spend it yourself.', 'Carl Sandburg'],
    ['Change your thoughts and you change your world.', 'Norman Vincent Peale']
  ];

  let quoteIndex = Math.floor(Math.random() * QUOTES.length);
  let quoteTimer = null;

  function showQuote(step) {
    quoteIndex = (quoteIndex + (step || 1) + QUOTES.length) % QUOTES.length;
    const [text, author] = QUOTES[quoteIndex];
    el.quoteCard.classList.add('swapping');
    window.setTimeout(() => {
      el.quoteText.textContent = text;
      el.quoteAuthor.textContent = '— ' + author;
      el.quoteCard.classList.remove('swapping');
    }, 320);
  }

  function initQuotes() {
    const [text, author] = QUOTES[quoteIndex];
    el.quoteText.textContent = text;
    el.quoteAuthor.textContent = '— ' + author;

    const restart = () => {
      window.clearInterval(quoteTimer);
      quoteTimer = window.setInterval(() => showQuote(1), 12000);
    };
    el.quoteRefresh.addEventListener('click', () => { showQuote(1); restart(); });
    restart();
  }

  /* ---------- 5. Form ---------- */

  /** Value for an <input type="datetime-local"> in the user's local time. */
  function toLocalInputValue(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function setError(field, msg) {
    const box = $('#err-' + field);
    if (box) box.textContent = msg || '';
    const input = el[field === 'date' ? 'date' : field];
    if (input) input.classList.toggle('invalid', Boolean(msg));
  }

  function clearErrors() {
    ['name', 'date', 'message'].forEach((f) => setError(f, ''));
  }

  function initForm() {
    // Never allow a past unlock date at the picker level.
    el.date.min = toLocalInputValue(new Date(Date.now() + MIN_LEAD_MS));

    el.message.addEventListener('input', () => {
      el.charCount.textContent = el.message.value.length;
      if (el.message.value.trim()) setError('message', '');
    });

    el.name.addEventListener('input', () => {
      if (el.name.value.trim()) setError('name', '');
    });

    el.date.addEventListener('input', () => {
      el.chips.forEach((c) => c.classList.remove('is-active'));
      setError('date', '');
    });

    el.chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const days = Number(chip.dataset.preset);
        const target = new Date(Date.now() + days * 86400000);
        el.date.value = toLocalInputValue(target);
        el.chips.forEach((c) => c.classList.toggle('is-active', c === chip));
        setError('date', '');
      });
    });

    el.form.addEventListener('reset', () => {
      window.setTimeout(() => {
        clearErrors();
        el.charCount.textContent = '0';
        el.chips.forEach((c) => c.classList.remove('is-active'));
      }, 0);
    });

    el.form.addEventListener('submit', onSubmit);
  }

  function onSubmit(e) {
    e.preventDefault();
    clearErrors();

    const name = el.name.value.trim();
    const message = el.message.value.trim();
    const raw = el.date.value;
    let ok = true;

    if (!name) { setError('name', 'Tell future you who wrote this.'); ok = false; }
    if (!message) { setError('message', 'The message can’t be empty.'); ok = false; }

    let unlockAt = 0;
    if (!raw) {
      setError('date', 'Pick a date to unseal this.');
      ok = false;
    } else {
      unlockAt = new Date(raw).getTime();
      if (Number.isNaN(unlockAt)) {
        setError('date', 'That date doesn’t look right.');
        ok = false;
      } else if (unlockAt < Date.now() + MIN_LEAD_MS) {
        setError('date', 'Choose a moment at least a minute in the future.');
        ok = false;
      }
    }

    if (!ok) {
      const firstBad = $('.invalid');
      if (firstBad) firstBad.focus();
      toast('Almost — a couple of fields need attention.', 'error');
      return;
    }

    capsules.push({
      id: uid(),
      name: name,
      message: message,
      createdAt: Date.now(),
      unlockAt: unlockAt,
      opened: false
    });
    save();

    el.form.reset();
    clearErrors();
    el.charCount.textContent = '0';
    el.chips.forEach((c) => c.classList.remove('is-active'));

    render();
    toast('Sealed. It opens on ' + shortFmt.format(new Date(unlockAt)) + '.', 'success');

    const card = el.list.querySelector('[data-id="' + capsules[capsules.length - 1].id + '"]');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- 6. Dashboard ---------- */

  /** Live element references per card, so the 1s tick doesn't re-render the DOM. */
  const live = new Map();

  function visibleCapsules() {
    const sorted = capsules.slice().sort((a, b) => {
      const au = isUnlocked(a), bu = isUnlocked(b);
      if (au !== bu) return au ? 1 : -1;          // locked (counting down) first
      return au ? b.unlockAt - a.unlockAt         // unlocked: most recently opened first
                : a.unlockAt - b.unlockAt;        // locked: soonest first
    });
    if (activeFilter === 'locked') return sorted.filter((c) => !isUnlocked(c));
    if (activeFilter === 'unlocked') return sorted.filter(isUnlocked);
    return sorted;
  }

  function progressFor(c) {
    const span = c.unlockAt - c.createdAt;
    if (span <= 0) return 100;
    const done = ((Date.now() - c.createdAt) / span) * 100;
    return Math.min(100, Math.max(0, done));
  }

  function cardHTML(c) {
    const unlocked = isUnlocked(c);
    const t = breakdown(c.unlockAt - Date.now());
    const pct = progressFor(c);

    const badge = unlocked
      ? '<span class="badge unlocked"><i class="dot"></i>Unlocked</span>'
      : '<span class="badge locked"><i class="dot"></i>Sealed</span>';

    const body = unlocked
      ? '<div class="cap-message">' + escapeHTML(c.message) + '</div>'
      : '<p class="cap-preview">🔒 ' + c.message.length +
        ' characters waiting to be read.</p>' +
        '<div class="countdown">' +
          unit(t.days, 'days') + unit(t.hours, 'hrs') + unit(t.mins, 'min') + unit(t.secs, 'sec') +
        '</div>';

    return '' +
      '<article class="capsule ' + (unlocked ? 'is-unlocked' : 'is-locked') + '" data-id="' + c.id + '">' +
        '<div class="cap-top">' +
          '<div>' +
            '<div class="cap-who">' + escapeHTML(c.name) + '</div>' +
            '<div class="cap-when">' + (unlocked ? 'Unsealed ' : 'Opens ') +
              dateFmt.format(new Date(c.unlockAt)) + '</div>' +
          '</div>' + badge +
        '</div>' +
        body +
        '<div class="progress-wrap">' +
          '<div class="progress"><div class="progress-fill" style="width:' + pct.toFixed(2) + '%"></div></div>' +
          '<div class="progress-label"><span class="pct">' + Math.round(pct) + '% of the wait done</span>' +
          '<span>sealed ' + shortFmt.format(new Date(c.createdAt)) + '</span></div>' +
        '</div>' +
        '<div class="cap-actions">' +
          '<button class="mini" data-act="read"' + (unlocked ? '' : ' disabled') + '>' +
            (unlocked ? 'Read it' : 'Locked') + '</button>' +
          '<button class="mini" data-act="copy"' + (unlocked ? '' : ' disabled') + '>Copy</button>' +
          '<button class="mini danger" data-act="delete">Delete</button>' +
        '</div>' +
      '</article>';
  }

  function unit(value, label) {
    return '<div class="unit"><b>' + pad(value) + '</b><span>' + label + '</span></div>';
  }

  function render() {
    const items = visibleCapsules();
    live.clear();

    el.list.innerHTML = items.map(cardHTML).join('');
    el.empty.hidden = items.length > 0;
    if (items.length === 0 && capsules.length > 0) {
      $('h3', el.empty).textContent = 'Nothing here';
      $('p', el.empty).textContent = 'No capsules match this filter.';
    } else {
      $('h3', el.empty).textContent = 'No capsules yet';
      $('p', el.empty).textContent = 'Write something above. Future you will be glad you did.';
    }

    // Cache the nodes the ticker updates every second.
    items.forEach((c) => {
      const card = el.list.querySelector('[data-id="' + c.id + '"]');
      if (!card) return;
      live.set(c.id, {
        card: card,
        units: $$('.unit b', card),
        fill: $('.progress-fill', card),
        pct: $('.pct', card),
        unlocked: isUnlocked(c)
      });
    });

    updateStats();
  }

  function updateStats() {
    const total = capsules.length;
    if (total === 0) {
      el.stats.textContent = 'Nothing sealed yet.';
      return;
    }
    const open = capsules.filter(isUnlocked).length;
    const locked = total - open;
    const next = capsules
      .filter((c) => !isUnlocked(c))
      .sort((a, b) => a.unlockAt - b.unlockAt)[0];

    let line = total + (total === 1 ? ' capsule' : ' capsules') + ' · ' +
      locked + ' sealed · ' + open + ' unlocked';
    if (next) line += ' · next opens ' + shortFmt.format(new Date(next.unlockAt));
    el.stats.textContent = line;
  }

  /** Runs once a second: refreshes digits, progress bars, and flips due capsules. */
  function tick() {
    let flipped = false;

    capsules.forEach((c) => {
      const ref = live.get(c.id);
      if (!ref) return;

      if (!ref.unlocked && isUnlocked(c)) {
        flipped = true;
        return; // handled by the re-render below
      }
      if (ref.unlocked) return;

      const t = breakdown(c.unlockAt - Date.now());
      const vals = [t.days, t.hours, t.mins, t.secs];
      ref.units.forEach((node, i) => {
        const next = pad(vals[i]);
        if (node.textContent !== next) node.textContent = next;
      });

      const pct = progressFor(c);
      ref.fill.style.width = pct.toFixed(2) + '%';
      ref.pct.textContent = Math.round(pct) + '% of the wait done';
    });

    if (flipped) {
      const due = capsules.filter((c) => {
        const ref = live.get(c.id);
        return ref && !ref.unlocked && isUnlocked(c);
      });
      render();
      due.forEach((c) => {
        const card = el.list.querySelector('[data-id="' + c.id + '"]');
        if (card) card.classList.add('just-unlocked');
      });
      if (due.length === 1) {
        toast('A capsule just unlocked ✨', 'success');
        openModal(due[0]);
      } else if (due.length > 1) {
        toast(due.length + ' capsules just unlocked ✨', 'success');
      }
    }
  }

  function initDashboard() {
    el.filters.forEach((btn) => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        el.filters.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', String(on));
        });
        render();
      });
    });

    // One delegated handler for every card button.
    el.list.addEventListener('click', (e) => {
      const btn = e.target.closest('.mini');
      if (!btn) return;
      const card = btn.closest('.capsule');
      const capsule = capsules.find((c) => c.id === card.dataset.id);
      if (!capsule) return;

      const act = btn.dataset.act;
      if (act === 'read') {
        openModal(capsule);
      } else if (act === 'copy') {
        copyText(capsule.message);
      } else if (act === 'delete') {
        deleteCapsule(capsule, card);
      }
    });

    // Another tab may have added or removed capsules.
    window.addEventListener('storage', (e) => {
      if (e.key !== STORE_KEY) return;
      capsules = load();
      render();
    });
  }

  function deleteCapsule(capsule, card) {
    const label = isUnlocked(capsule) ? 'Delete this message?' :
      'This capsule is still sealed. Delete it unread?';
    if (!window.confirm(label)) return;

    card.classList.add('removing');
    window.setTimeout(() => {
      capsules = capsules.filter((c) => c.id !== capsule.id);
      save();
      render();
      toast('Capsule deleted.', 'info');
    }, 320);
  }

  function copyText(text) {
    const done = () => toast('Message copied to clipboard.', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (err) { toast('Copying isn’t available here.', 'error'); }
    document.body.removeChild(ta);
  }

  /* ---------- 7. Reveal modal ---------- */

  let lastFocused = null;

  function openModal(capsule) {
    lastFocused = document.activeElement;
    el.modalTitle.textContent = 'Dear ' + capsule.name + ',';
    el.modalMeta.textContent = 'Written ' + dateFmt.format(new Date(capsule.createdAt)) +
      ' · unsealed ' + dateFmt.format(new Date(capsule.unlockAt));
    el.modalBody.textContent = capsule.message;
    el.modal.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.modal-close', el.modal).focus();

    if (!capsule.opened) {
      capsule.opened = true;
      save();
    }
  }

  function closeModal() {
    el.modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function initModal() {
    el.modal.addEventListener('click', (e) => {
      if (e.target.hasAttribute('data-close')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el.modal.hidden) closeModal();
    });
  }

  /* ---------- 8. Toasts & scroll reveal ---------- */

  const ICONS = { success: '✓', info: 'ℹ', error: '⚠' };

  function toast(msg, kind) {
    const type = kind || 'info';
    const node = document.createElement('div');
    node.className = 'toast ' + type;
    node.innerHTML = '<span class="ico">' + ICONS[type] + '</span><span>' + escapeHTML(msg) + '</span>';
    el.toasts.appendChild(node);
    window.setTimeout(() => {
      node.classList.add('leaving');
      window.setTimeout(() => node.remove(), 360);
    }, 3600);
  }

  function initReveal() {
    const targets = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      targets.forEach((t) => t.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
  }

  /* ---------- 9. Boot ---------- */

  function init() {
    initTheme();
    initQuotes();
    initForm();
    initDashboard();
    initModal();
    initReveal();

    capsules = load();
    render();
    window.setInterval(tick, 1000);

    // Coming back to the tab after a long sleep: catch up immediately.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tick();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
