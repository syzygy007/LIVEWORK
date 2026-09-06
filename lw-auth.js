/* LIVEWORK staff gate. GoTrue REST direct, no CDN.
   POST /auth/v1/otp  then  POST /auth/v1/verify (type=email)
   then confirm the signed in user has a row in staff, else sign out. */
(function(){
  var K = 'lw_staff_session';
  var A = { user:null, staff:null, session:null };
  window.LWAuth = A;

  function cfg(){ return window.LW || {}; }
  function live(){ var c = cfg(); return !!(c.url && c.anon && !/PASTE/.test(c.anon)); }
  function save(s){ try{ localStorage.setItem(K, JSON.stringify(s)); }catch(e){} }
  function load(){ try{ return JSON.parse(localStorage.getItem(K)||'null'); }catch(e){ return null; } }
  function wipe(){ try{ localStorage.removeItem(K); }catch(e){} }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  async function post(path, body){
    var r = await fetch(cfg().url + '/auth/v1/' + path, {
      method:'POST',
      headers:{ 'content-type':'application/json', apikey: cfg().anon },
      body: JSON.stringify(body)
    });
    var j = {};
    try{ j = await r.json(); }catch(e){}
    return { ok: r.ok, status: r.status, body: j };
  }

  A.token = function(){ return A.session && A.session.access_token; };

  /* refresh the access token if it is inside a minute of expiry.
     returns the live session, or null when the sign in is gone. */
  A.ensure = function(){ return refresh(); };

  async function refresh(){
    var s = load();
    if(!s || !s.refresh_token) return null;
    var fresh = Date.now() < (s.expires_at_ms || 0) - 60000;
    if(fresh){ A.session = s; return s; }
    var r = await fetch(cfg().url + '/auth/v1/token?grant_type=refresh_token', {
      method:'POST',
      headers:{ 'content-type':'application/json', apikey: cfg().anon },
      body: JSON.stringify({ refresh_token: s.refresh_token })
    });
    if(!r.ok){ wipe(); return null; }
    var j = await r.json();
    return stash(j);
  }

  function stash(j){
    if(!j || !j.access_token) return null;
    var s = {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      user: j.user || (A.session && A.session.user),
      expires_at_ms: Date.now() + ((j.expires_in || 3600) * 1000)
    };
    save(s); A.session = s; A.user = s.user;
    return s;
  }

  /* is the signed in user on the staff table */
  async function staffRow(email){
    var r = await fetch(cfg().url + '/rest/v1/staff?select=*&limit=50', {
      headers:{ apikey: cfg().anon, Authorization: 'Bearer ' + A.token() }
    });
    if(!r.ok) return null;
    var rows = await r.json().catch(function(){ return []; });
    if(!rows || !rows.length) return null;
    var mine = rows.filter(function(x){
      return String(x.email||'').toLowerCase() === String(email||'').toLowerCase() && x.active !== false;
    })[0];
    return mine || null;
  }

  A.signOut = function(){
    var t = A.token();
    if(t){
      fetch(cfg().url + '/auth/v1/logout', {
        method:'POST',
        headers:{ apikey: cfg().anon, Authorization:'Bearer ' + t }
      }).catch(function(){});
    }
    wipe(); A.session = null; A.user = null; A.staff = null;
    location.reload();
  };

  /* door UI */
  var step = 0, pending = '', err = '';
  function door(mount, done){
    mount.innerHTML =
      '<div class="lwdoor"><div class="lwdoor-in">' +
        '<div class="hl"><span class="bar"></span><h1>The Desk.</h1></div>' +
        '<p class="lede" style="margin:18px 0 26px">' +
          (step === 0
            ? 'Staff only. Enter your LIVEWORK address and we will email you a six digit code.'
            : 'We emailed a six digit code to ' + esc(pending) + '. It is good for ten minutes.') +
        '</p>' +
        (err ? '<p class="lwerr">' + esc(err) + '</p>' : '') +
        (step === 0
          ? '<div class="field"><label for="lwem">Work email</label><input id="lwem" type="email" autocomplete="email" placeholder="you@livework.inc" value="' + esc(pending) + '"></div>'
          : '<div class="field"><label for="lwcd">Six digit code</label><input id="lwcd" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="000000"></div>') +
        '<div style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap">' +
          '<button class="btn" id="lwgo">' + (step === 0 ? 'Email me a code' : 'Open the desk') + '</button>' +
          (step === 1 ? '<a class="btn ghost" href="#" id="lwback">Use another address</a>' : '') +
        '</div>' +
        '<p class="small muted" style="margin-top:28px">Client sign in is at <a href="room.html">the client room</a>.</p>' +
      '</div></div>';

    var go = document.getElementById('lwgo');
    go.onclick = async function(){
      err = '';
      if(step === 0){
        var em = (document.getElementById('lwem').value || '').trim().toLowerCase();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ err = 'That does not look like an email address.'; return door(mount, done); }
        pending = em;
        go.disabled = true; go.textContent = 'Sending';
        var r = await post('otp', { email: em, create_user: false });
        if(!r.ok && r.status !== 200){
          err = (r.body && (r.body.msg || r.body.error_description || r.body.message)) || 'We could not send a code to that address.';
          go.disabled = false; return door(mount, done);
        }
        step = 1; return door(mount, done);
      }
      var code = (document.getElementById('lwcd').value || '').replace(/\D/g,'');
      if(code.length < 6 || code.length > 8){ err = 'Enter the code from the email.'; return door(mount, done); }
      go.disabled = true; go.textContent = 'Opening';
      var v = await post('verify', { type:'email', email: pending, token: code });
      if(!v.ok || !v.body.access_token){
        err = 'That code did not match or it expired. Ask for a new one.';
        go.disabled = false; return door(mount, done);
      }
      stash(v.body);
      var st = await staffRow(pending);
      if(!st){
        wipe(); A.session = null;
        step = 0; err = 'That address is not on the LIVEWORK staff list. Ask Derek to add you.';
        return door(mount, done);
      }
      A.staff = st;
      done(st);
    };
    var em = document.getElementById('lwem'); if(em) em.onkeydown = function(e){ if(e.key === 'Enter') go.click(); };
    var cd = document.getElementById('lwcd'); if(cd) cd.onkeydown = function(e){ if(e.key === 'Enter') go.click(); };
    var bk = document.getElementById('lwback'); if(bk) bk.onclick = function(e){ e.preventDefault(); step = 0; err = ''; door(mount, done); };
    var first = document.getElementById(step === 0 ? 'lwem' : 'lwcd'); if(first) first.focus();
  }

  /* gate(mountEl, onReady) */
  A.gate = async function(mount, onReady){
    if(!live()){
      mount.innerHTML = '<div class="lwdoor"><div class="lwdoor-in"><div class="hl"><span class="bar"></span><h1>Not configured.</h1></div><p class="lede" style="margin-top:18px">lw-config.js has no key in it, so the desk cannot reach the database.</p></div></div>';
      return;
    }
    var s = await refresh();
    if(s && s.user && s.user.email){
      var st = await staffRow(s.user.email);
      if(st){ A.staff = st; A.user = s.user; return onReady(st); }
      wipe(); A.session = null;
    }
    door(mount, onReady);
  };
})();
