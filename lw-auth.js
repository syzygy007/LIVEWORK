/* LIVEWORK staff gate. GoTrue REST direct, no CDN.
   Email door: POST /auth/v1/otp then POST /auth/v1/verify (type=email).
   Phone door: POST /auth/v1/otp {phone} then /auth/v1/verify (type=sms).
   Attach a number: PUT /auth/v1/user {phone} then verify (type=phone_change).
   Then confirm the signed in user has a row in staff, else sign out. */
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

  /* +17025550100 from whatever was typed. Ten digits get +1. */
  function e164(raw){
    var t = String(raw||'').trim();
    var d = t.replace(/\D/g,'');
    if(t.charAt(0) === '+') return d.length >= 8 ? '+' + d : null;
    if(d.length === 10) return '+1' + d;
    if(d.length === 11 && d.charAt(0) === '1') return '+' + d;
    return null;
  }

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

  /* PUT /auth/v1/user with the signed in token */
  async function putUser(body){
    var r = await fetch(cfg().url + '/auth/v1/user', {
      method:'PUT',
      headers:{ 'content-type':'application/json', apikey: cfg().anon, Authorization:'Bearer ' + A.token() },
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

  /* door UI. mode is 'email' or 'phone'; email is the default. */
  var step = 0, mode = 'email', pending = '', pphone = '', err = '';
  function door(mount, done){
    var lede = step === 0
      ? (mode === 'email'
          ? 'Staff only. Enter your LIVEWORK address and we will email you a six digit code.'
          : 'Staff only. Enter your mobile number and we will text you a six digit code.')
      : (mode === 'email'
          ? 'We emailed a six digit code to ' + esc(pending) + '. It is good for ten minutes.'
          : 'We texted a six digit code to ' + esc(pphone) + '. It is good for ten minutes.');
    mount.innerHTML =
      '<div class="lwdoor"><div class="lwdoor-in">' +
        '<div class="hl"><span class="bar"></span><h1>The Desk.</h1></div>' +
        '<p class="lede" style="margin:18px 0 26px">' + lede + '</p>' +
        (err ? '<p class="lwerr">' + esc(err) + '</p>' : '') +
        (step === 0
          ? (mode === 'email'
              ? '<div class="field"><label for="lwem">Work email</label><input id="lwem" type="email" autocomplete="email" placeholder="you@livework.inc" value="' + esc(pending) + '"></div>'
              : '<div class="field"><label for="lwph">Mobile number</label><input id="lwph" type="tel" autocomplete="tel" placeholder="(702) 555-0100" value="' + esc(pphone) + '"></div>')
          : '<div class="field"><label for="lwcd">Six digit code</label><input id="lwcd" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="000000"></div>') +
        '<div style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap">' +
          '<button class="btn" id="lwgo">' + (step === 0 ? (mode === 'email' ? 'Email me a code' : 'Text me a code') : 'Open the desk') + '</button>' +
          (step === 1 ? '<a class="btn ghost" href="#" id="lwback">' + (mode === 'email' ? 'Use another address' : 'Use another number') + '</a>' : '') +
        '</div>' +
        (step === 0
          ? '<p class="small muted" style="margin-top:20px"><a href="#" id="lwmode">' + (mode === 'email' ? 'Text me a code instead' : 'Email me a code instead') + '</a></p>'
          : '') +
        '<p class="small muted" style="margin-top:28px">Client sign in is at <a href="room.html">the client room</a>.</p>' +
      '</div></div>';

    var go = document.getElementById('lwgo');
    go.onclick = async function(){
      err = '';
      if(step === 0){
        if(mode === 'email'){
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
        var p = e164(document.getElementById('lwph').value);
        if(!p){ err = 'That does not look like a mobile number.'; return door(mount, done); }
        pphone = p;
        go.disabled = true; go.textContent = 'Sending';
        var rp = await post('otp', { phone: p, create_user: false });
        if(!rp.ok && rp.status !== 200){
          err = 'That number is not attached to a desk sign in. Sign in by email once, then choose Sign in by text under your name.';
          go.disabled = false; return door(mount, done);
        }
        step = 1; return door(mount, done);
      }
      var code = (document.getElementById('lwcd').value || '').replace(/\D/g,'');
      if(code.length < 6 || code.length > 8){ err = mode === 'email' ? 'Enter the code from the email.' : 'Enter the code from the text.'; return door(mount, done); }
      go.disabled = true; go.textContent = 'Opening';
      var v = mode === 'email'
        ? await post('verify', { type:'email', email: pending, token: code })
        : await post('verify', { type:'sms', phone: pphone, token: code });
      if(!v.ok || !v.body.access_token){
        err = 'That code did not match or it expired. Ask for a new one.';
        go.disabled = false; return door(mount, done);
      }
      stash(v.body);
      var who = mode === 'email' ? pending : ((v.body.user && v.body.user.email) || '');
      var st = who ? await staffRow(who) : null;
      if(!st){
        wipe(); A.session = null;
        step = 0; err = 'That sign in is not on the LIVEWORK staff list. Ask Derek to add you.';
        return door(mount, done);
      }
      A.staff = st;
      done(st);
    };
    var em = document.getElementById('lwem'); if(em) em.onkeydown = function(e){ if(e.key === 'Enter') go.click(); };
    var ph = document.getElementById('lwph'); if(ph) ph.onkeydown = function(e){ if(e.key === 'Enter') go.click(); };
    var cd = document.getElementById('lwcd'); if(cd) cd.onkeydown = function(e){ if(e.key === 'Enter') go.click(); };
    var bk = document.getElementById('lwback'); if(bk) bk.onclick = function(e){ e.preventDefault(); step = 0; err = ''; door(mount, done); };
    var md = document.getElementById('lwmode'); if(md) md.onclick = function(e){ e.preventDefault(); mode = (mode === 'email' ? 'phone' : 'email'); step = 0; err = ''; door(mount, done); };
    var first = document.getElementById(step === 0 ? (mode === 'email' ? 'lwem' : 'lwph') : 'lwcd'); if(first) first.focus();
  }

  /* attach or change the number that codes text to. Small overlay,
     opened from the desk once signed in: LWAuth.phoneSetup() */
  A.phoneSetup = function(){
    var old = document.getElementById('lwPhonePanel'); if(old) old.remove();
    var pstep = 0, np = '', perr = '';
    var wrap = document.createElement('div');
    wrap.id = 'lwPhonePanel';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
    document.body.appendChild(wrap);
    function close(){ wrap.remove(); }
    wrap.onclick = function(e){ if(e.target === wrap) close(); };
    function paint(){
      var cur = A.user && A.user.phone ? '+' + String(A.user.phone).replace(/^\+/,'') : '';
      wrap.innerHTML =
        '<div style="background:var(--paper,#fff);color:var(--ink,#000);max-width:420px;width:100%;padding:28px;border:1px solid var(--line,#ddd)" id="lwppIn">' +
          '<div class="hl"><span class="bar"></span><h1 style="font-size:24px;margin:0">Sign in by text.</h1></div>' +
          '<p class="lede" style="margin:14px 0 20px;font-size:15px">' +
            (pstep === 0
              ? (cur ? 'Codes text to ' + esc(cur) + ' today. Enter a number below to change it.'
                     : 'Add your mobile number and the desk can text you sign in codes instead of emailing them.')
              : pstep === 1 ? 'We texted a six digit code to ' + esc(np) + '. Enter it to lock the number in.'
              : 'Done. Sign in codes can now text to ' + esc(np) + '. Next time, choose Text me a code on the sign in page.') +
          '</p>' +
          (perr ? '<p class="lwerr">' + esc(perr) + '</p>' : '') +
          (pstep === 0 ? '<div class="field"><label for="lwnp">Mobile number</label><input id="lwnp" type="tel" autocomplete="tel" placeholder="(702) 555-0100"></div>' : '') +
          (pstep === 1 ? '<div class="field"><label for="lwnc">Six digit code</label><input id="lwnc" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="000000"></div>' : '') +
          '<div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">' +
            (pstep === 0 ? '<button class="btn" id="lwppGo">Text me a code</button>' : '') +
            (pstep === 1 ? '<button class="btn" id="lwppGo">Lock it in</button>' : '') +
            '<a class="btn ghost" href="#" id="lwppX">' + (pstep === 2 ? 'Close' : 'Not now') + '</a>' +
          '</div>' +
        '</div>';
      var x = document.getElementById('lwppX'); x.onclick = function(e){ e.preventDefault(); close(); };
      var go = document.getElementById('lwppGo');
      if(go) go.onclick = async function(){
        perr = '';
        if(pstep === 0){
          var p = e164(document.getElementById('lwnp').value);
          if(!p){ perr = 'That does not look like a mobile number.'; return paint(); }
          np = p;
          go.disabled = true; go.textContent = 'Sending';
          await refresh();
          var r = await putUser({ phone: p });
          if(!r.ok){
            perr = (r.body && (r.body.msg || r.body.error_description || r.body.message)) || 'We could not text that number.';
            return paint();
          }
          pstep = 1; return paint();
        }
        var code = (document.getElementById('lwnc').value || '').replace(/\D/g,'');
        if(code.length < 6 || code.length > 8){ perr = 'Enter the code from the text.'; return paint(); }
        go.disabled = true; go.textContent = 'Checking';
        var v = await post('verify', { type:'phone_change', phone: np, token: code });
        if(!v.ok){
          perr = 'That code did not match or it expired. Ask for a new one.';
          return paint();
        }
        if(v.body && v.body.access_token){ stash(v.body); }
        else{
          var s = load();
          if(s && s.user){ s.user.phone = np.replace(/^\+/,''); save(s); A.user = s.user; }
        }
        pstep = 2; return paint();
      };
      var np1 = document.getElementById('lwnp'); if(np1){ np1.focus(); np1.onkeydown = function(e){ if(e.key === 'Enter' && go) go.click(); }; }
      var nc = document.getElementById('lwnc'); if(nc){ nc.focus(); nc.onkeydown = function(e){ if(e.key === 'Enter' && go) go.click(); }; }
    }
    paint();
  };

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
