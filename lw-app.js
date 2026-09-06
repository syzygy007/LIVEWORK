/* ============================================================
   LIVEWORK app layer.
   Registers the service worker, handles Add to Home Screen on
   both Android and iPhone, and puts a bar on screen when the
   phone loses signal. Loaded by desk.html and room.html.
   ============================================================ */
(function () {
  var D = document, R = D.documentElement;

  /* running installed, not in a browser tab */
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) R.classList.add('lw-standalone');

  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (ios) R.classList.add('lw-ios');

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* ---------- offline bar ---------- */
  var bar;
  function signal() {
    if (navigator.onLine) { if (bar) { bar.remove(); bar = null; } return; }
    if (bar) return;
    bar = D.createElement('div');
    bar.className = 'lw-bar';
    bar.textContent = 'No signal. Nothing will save until you are back.';
    D.body.appendChild(bar);
  }
  window.addEventListener('online', signal);
  window.addEventListener('offline', signal);
  D.addEventListener('DOMContentLoaded', signal);

  /* ---------- add to home screen ---------- */
  var deferred = null;
  var KEY = 'lw_install_hint';

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    chip('Install the app', function () {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; close(); });
    });
  });

  window.addEventListener('appinstalled', function () { try { localStorage.setItem(KEY, 'done'); } catch (e) {} close(); });

  /* iPhone has no prompt event, so it gets one quiet instruction, once */
  D.addEventListener('DOMContentLoaded', function () {
    if (!ios || standalone) return;
    var seen; try { seen = localStorage.getItem(KEY); } catch (e) { seen = 'done'; }
    if (seen) return;
    setTimeout(function () {
      chip('Add to your home screen. Share, then Add to Home Screen.', null);
    }, 2500);
  });

  var box;
  function close() {
    if (box) { box.remove(); box = null; }
    try { localStorage.setItem(KEY, 'done'); } catch (e) {}
  }
  function chip(text, action) {
    if (box) return;
    box = D.createElement('div');
    box.className = 'lw-install';
    var t = D.createElement('span');
    t.textContent = text;
    box.appendChild(t);
    if (action) {
      var go = D.createElement('button');
      go.className = 'go';
      go.textContent = 'Install';
      go.onclick = action;
      box.appendChild(go);
    }
    var x = D.createElement('button');
    x.className = 'x';
    x.setAttribute('aria-label', 'Dismiss');
    x.textContent = 'No thanks';
    x.onclick = close;
    box.appendChild(x);
    D.body.appendChild(box);
  }

  window.LWApp = { standalone: standalone, ios: ios, install: function () { if (deferred) deferred.prompt(); } };
})();
