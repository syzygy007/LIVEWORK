/* buildGuidePdf({ PDFLib, fontkit, fonts, data })
   data = { meta, guide, redact }  redact true means the client copy:
   the read and the probes come out, everything else stays. */
function buildGuidePdf(o) {
  const P = o.PDFLib, F = o.fonts, d = o.data || {}, m = d.meta || {}, g = d.guide || {};
  const client = d.redact === true;
  const W = 612, H = 792, L = 54, R = W - 54, CW = R - L;
  const INK = P.rgb(0.067, 0.067, 0.067), PAPER = P.rgb(0.980, 0.972, 0.960);
  const WALL = P.rgb(0.945, 0.929, 0.906), LINE = P.rgb(0.863, 0.835, 0.796);
  const STONE = P.rgb(0.431, 0.412, 0.380), Y = P.rgb(0.949, 0.776, 0.196), WHITE = P.rgb(1, 1, 1);

  return (async function () {
    const doc = await P.PDFDocument.create();
    doc.registerFontkit(o.fontkit);
    const reg = await doc.embedFont(F.reg, { subset: true });
    const sb = await doc.embedFont(F.sb, { subset: true });
    const xb = await doc.embedFont(F.xb, { subset: true });
    let pg, y = 0, first = true;

    const clean = s => String(s == null ? '' : s).replace(/[\u2010-\u2015]/g, ' ').replace(/[^\x20-\x7E\u00b7]/g, '');
    const wrap = (t, f, s, w) => {
      const out = [];
      String(t == null ? '' : t).split('\n').forEach(par => {
        let line = '';
        clean(par).split(/\s+/).filter(Boolean).forEach(word => {
          const t2 = line ? line + ' ' + word : word;
          if (f.widthOfTextAtSize(t2, s) > w && line) { out.push(line); line = word; } else line = t2;
        });
        out.push(line);
      });
      return out.filter(x => x !== '' || out.length === 1);
    };
    const track = (t, f, s, sp) => { let w = 0; const c = clean(t).split('');
      c.forEach(ch => { w += f.widthOfTextAtSize(ch, s) + sp; }); return w - sp; };
    const drawTrack = (t, x, yy, f, s, sp, col) => {
      clean(t).split('').forEach(ch => { pg.drawText(ch, { x, y: yy, size: s, font: f, color: col });
        x += f.widthOfTextAtSize(ch, s) + sp; });
    };

    function band() {
      pg.drawRectangle({ x: 0, y: H - 74, width: W, height: 74, color: INK });
      const t = 'LIVE', u = 'WORK';
      let x = L;
      pg.drawText(t, { x, y: H - 46, size: 19, font: xb, color: WHITE });
      x += xb.widthOfTextAtSize(t, 19) + 6;
      pg.drawRectangle({ x, y: H - 48, width: 2, height: 17, color: Y });
      x += 8;
      pg.drawText(u, { x, y: H - 46, size: 19, font: xb, color: WHITE });
      const lbl = client ? 'INTERVIEW GUIDE' : 'INTERVIEW GUIDE · RECRUITER COPY';
      drawTrack(lbl, R - track(lbl, sb, 7, 1.6), H - 44, sb, 7, 1.6, P.rgb(0.72, 0.70, 0.67));
    }
    function newPage() {
      pg = doc.addPage([W, H]);
      pg.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });
      band();
      y = H - 74 - (first ? 46 : 40);
      first = false;
    }
    const room = n => { if (y - n < 62) newPage(); };
    const rule = (col, pad) => { y -= (pad || 0); pg.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.7, color: col || LINE }); };
    const micro = (t, col) => { room(18); drawTrack(t.toUpperCase(), L, y - 8, sb, 7, 1.7, col || STONE); y -= 18; };
    const para = (t, size, font, col, lead, w, x) => {
      const lines = wrap(t, font, size, w || CW);
      lines.forEach(ln => { room(lead); pg.drawText(ln, { x: x || L, y: y - size, size, font, color: col }); y -= lead; });
    };
    function heading(t, sub) {
      room(215);
      y -= 26;
      pg.drawRectangle({ x: L, y: y - 2, width: 26, height: 4, color: Y });
      y -= 16;
      para(t, 26, xb, INK, 30);
      if (sub) { y -= 2; para(sub, 10.5, reg, STONE, 15, CW * 0.72); }
      y -= 10;
    }
    function specRow(k, v) {
      const lines = wrap(v || 'Not on file yet.', reg, 10.5, CW - 150);
      room(lines.length * 15 + 26);
      rule(LINE, 4);
      y -= 16;
      const top = y;
      drawTrack(k.toUpperCase(), L, y - 7, sb, 7, 1.7, STONE);
      let yy = top;
      lines.forEach(ln => { pg.drawText(ln, { x: L + 150, y: yy - 8, size: 10.5, font: reg, color: INK }); yy -= 15; });
      y = Math.min(top - 15, yy) - 8;
    }

    /* ---------- page one ---------- */
    newPage();
    const name = clean(m.name || 'The candidate') + '.';
    let ns = 40; while (xb.widthOfTextAtSize(name, ns) > CW && ns > 20) ns -= 1;
    pg.drawText(name, { x: L, y: y - ns, size: ns, font: xb, color: INK });
    y -= ns + 10;
    para([m.title, m.location].filter(Boolean).join(' · '), 11.5, reg, STONE, 16);
    y -= 18;

    const cells = [['The role', m.role], ['Client', m.client], ['Where', m.role_location || m.location], ['Screened by', m.staff]];
    const cw = CW / 4, ch = 52;
    pg.drawRectangle({ x: L, y: y - ch, width: CW, height: ch, borderColor: LINE, borderWidth: 0.7, color: PAPER });
    cells.forEach((c, i) => {
      const x = L + cw * i;
      if (i) pg.drawLine({ start: { x, y: y - ch }, end: { x, y }, thickness: 0.7, color: LINE });
      drawTrack(String(c[0]).toUpperCase(), x + 10, y - 17, sb, 6.5, 1.5, STONE);
      wrap(c[1] || 'Not set', sb, 9, cw - 20).slice(0, 2).forEach((ln, k) =>
        pg.drawText(ln, { x: x + 10, y: y - 31 - k * 11, size: 9, font: sb, color: INK }));
    });
    y -= ch + 6;

    /* ---------- the read, recruiter copy only ---------- */
    const rd = g.read || {};
    if (!client) {
      heading('The read.', 'Four lines on the file, so the hour starts where the paper stops.');
      specRow('Where they started', rd.started);
      specRow('How they moved', rd.moved);
      specRow('The pattern', rd.pattern);
      specRow('What is unproven', rd.unproven);
    }

    /* ---------- open ---------- */
    const op = g.opener || {};
    heading('Open.', 'Not scored, on purpose. A rating formed during the warm up follows the warm up all the way through.');
    room(150);
    rule(LINE, 4); y -= 18;
    pg.drawText('0', { x: L, y: y - 16, size: 18, font: xb, color: Y });
    const qx = L + 34, qw = CW - 34;
    drawTrack('THE OPENER', qx, y - 7, sb, 6.5, 1.5, STONE);
    y -= 16;
    para(op.question || 'Take me back to the start of your career and walk me forward to today.', 13, sb, INK, 18, qw, qx);
    const listen = Array.isArray(op.listen_for) ? op.listen_for : [];
    if (listen.length) {
      y -= 6;
      room(20); drawTrack('LISTEN FOR', qx, y - 8, sb, 7, 1.7, STONE); y -= 18;
      listen.forEach(t => { room(16); pg.drawRectangle({ x: qx, y: y - 5, width: 3, height: 3, color: Y });
        para(t, 10, reg, INK, 15, qw - 12, qx + 10); });
    }
    y -= 6;

    /* ---------- the role ---------- */
    const qs = Array.isArray(g.questions) ? g.questions : [];
    heading('The role.', 'Same questions, same order, every candidate on this search. Rate each answer the moment it lands, not at the end.');
    qs.forEach((q, i) => {
      const qlines = wrap(q.question, sb, 13, qw).length;
      room(qlines * 18 + 150);
      rule(LINE, 4); y -= 20;
      pg.drawText(String(i + 1), { x: L, y: y - 16, size: 18, font: xb, color: Y });
      drawTrack(String(q.must_have || 'Must have').toUpperCase(), qx, y - 7, sb, 6.5, 1.5, STONE);
      y -= 16;
      para(q.question, 13, sb, INK, 18, qw, qx);
      y -= 8;
      const pw = (qw - 10) / 2;
      const sl = wrap(q.strong, reg, 9.5, pw - 20), wl = wrap(q.weak, reg, 9.5, pw - 20);
      const ph = Math.max(sl.length, wl.length) * 13 + 30;
      room(ph + 40);
      pg.drawRectangle({ x: qx, y: y - ph, width: pw, height: ph, color: WHITE, borderColor: LINE, borderWidth: 0.7 });
      pg.drawRectangle({ x: qx + pw + 10, y: y - ph, width: pw, height: ph, color: WALL, borderColor: LINE, borderWidth: 0.7 });
      drawTrack('A STRONG ANSWER SOUNDS LIKE', qx + 10, y - 15, sb, 6, 1.3, STONE);
      drawTrack('A WEAK ANSWER SOUNDS LIKE', qx + pw + 20, y - 15, sb, 6, 1.3, STONE);
      sl.forEach((ln, k) => pg.drawText(ln, { x: qx + 10, y: y - 30 - k * 13, size: 9.5, font: reg, color: INK }));
      wl.forEach((ln, k) => pg.drawText(ln, { x: qx + pw + 20, y: y - 30 - k * 13, size: 9.5, font: reg, color: INK }));
      y -= ph + 14;
      drawTrack('RATE IT NOW', qx, y - 12, sb, 6.5, 1.5, STONE);
      let bx = qx + 74;
      for (let n = 1; n <= 5; n++) {
        pg.drawRectangle({ x: bx, y: y - 18, width: 22, height: 22, color: WHITE, borderColor: LINE, borderWidth: 0.7 });
        pg.drawText(String(n), { x: bx + 8, y: y - 12, size: 9, font: sb, color: STONE });
        bx += 26;
      }
      y -= 26;
    });

    /* ---------- probes, recruiter copy only ---------- */
    const probes = Array.isArray(g.probes) ? g.probes : [];
    if (!client && probes.length) {
      heading('Probe.', 'Recruiter copy only. These go at the unproven thing, and they do not travel to the client.');
      probes.forEach(p => {
        room(70); rule(LINE, 4); y -= 18;
        para(p.question, 12, sb, INK, 16);
        y -= 2;
        para(p.why, 9.5, reg, STONE, 13);
        y -= 8;
      });
    }

    /* ---------- do not spend your hour here ---------- */
    const asked = Array.isArray(g.already_asked) && g.already_asked.length ? g.already_asked
      : ['Our notes on this candidate are thin, so treat nothing as covered.'];
    const bLede = wrap('LIVEWORK already covered the ground below on the screen. Ask it again and you buy back an answer you already own.',
      reg, 10, CW * 0.78);
    const askLines = asked.reduce((n, a) => n + wrap(a, sb, 10, CW - 40).length, 0);
    const bh = 110 + bLede.length * 14 + askLines * 15 + asked.length * 7;
    if (y - bh < 62) { newPage(); y = H - 74; } else y -= 20;
    pg.drawRectangle({ x: 0, y: y - bh, width: W, height: bh, color: Y });
    let byy = y - 26;
    pg.drawRectangle({ x: L, y: byy - 2, width: 26, height: 4, color: INK });
    byy -= 18;
    pg.drawText('Do not spend your hour here.', { x: L, y: byy - 22, size: 22, font: xb, color: INK });
    byy -= 34;
    bLede.forEach(ln => { pg.drawText(ln, { x: L, y: byy - 12, size: 10, font: reg, color: INK }); byy -= 14; });
    byy -= 8;
    asked.forEach(a => {
      pg.drawLine({ start: { x: L, y: byy }, end: { x: R, y: byy }, thickness: 0.7, color: P.rgb(0.78, 0.63, 0.14) });
      wrap(a, sb, 10, CW - 40).forEach(ln => { pg.drawText(ln, { x: L, y: byy - 15, size: 10, font: sb, color: INK }); byy -= 15; });
      byy -= 7;
    });
    y -= bh + 4;

    /* ---------- close ---------- */
    const cl = g.close || {};
    heading('Close.', 'Two questions, always last. They tell you what actually moves this person, which is the thing that keeps them past year one.');
    [['A', 'The next chapter', 'What are you looking for in your next career and your next company?'],
     ['B', 'The intrinsic motivator', 'What is your favorite part of your job?']].forEach(q => {
      room(70); rule(LINE, 4); y -= 20;
      pg.drawText(q[0], { x: L, y: y - 16, size: 18, font: xb, color: Y });
      drawTrack(q[1].toUpperCase(), qx, y - 7, sb, 6.5, 1.5, STONE);
      y -= 16;
      para(q[2], 13, sb, INK, 18, qw, qx);
      y -= 10;
    });
    const tags = [['autonomy', 'Autonomy'], ['mastery', 'Mastery'], ['people', 'People'], ['impact', 'Impact']];
    room(60);
    if (!client && cl.tag_why) { para('Tick what you hear. The file says ' + cl.tag_why, 10, reg, STONE, 14, qw, qx); y -= 6; }
    else { para('Tick what you hear.', 10, reg, STONE, 14, qw, qx); y -= 6; }
    let tx = qx;
    tags.forEach(t => {
      const on = !client && String(cl.tag || '').toLowerCase() === t[0];
      const w = sb.widthOfTextAtSize(t[1], 9) + 22;
      pg.drawRectangle({ x: tx, y: y - 22, width: w, height: 24, color: on ? Y : WHITE, borderColor: on ? Y : LINE, borderWidth: 0.7 });
      pg.drawText(t[1], { x: tx + 11, y: y - 15, size: 9, font: sb, color: INK });
      tx += w + 8;
    });
    y -= 34;

    /* ---------- the write up ---------- */
    const fields = ['Strong at', 'Concerns', 'Compensation', 'Availability', 'Next step'];
    const wLede = wrap('Five lines, filled in before the next meeting starts. These are the same five fields the record carries, so nothing gets typed twice.',
      reg, 10, CW * 0.78);
    const wh = 100 + wLede.length * 14 + fields.length * 46;
    if (y - wh < 62) { newPage(); y = H - 74; } else y -= 20;
    pg.drawRectangle({ x: 0, y: y - wh, width: W, height: wh, color: INK });
    let wy = y - 26;
    pg.drawRectangle({ x: L, y: wy - 2, width: 26, height: 4, color: Y });
    wy -= 18;
    pg.drawText('The write up.', { x: L, y: wy - 22, size: 22, font: xb, color: WHITE });
    wy -= 34;
    wLede.forEach(ln => { pg.drawText(ln, { x: L, y: wy - 12, size: 10, font: reg, color: P.rgb(0.61, 0.59, 0.55) }); wy -= 14; });
    wy -= 10;
    fields.forEach(f => {
      pg.drawLine({ start: { x: L, y: wy }, end: { x: R, y: wy }, thickness: 0.7, color: P.rgb(0.17, 0.165, 0.153) });
      drawTrack(f.toUpperCase(), L, wy - 14, sb, 7, 1.7, P.rgb(0.61, 0.59, 0.55));
      wy -= 46;
    });
    pg.drawLine({ start: { x: L, y: wy }, end: { x: R, y: wy }, thickness: 0.7, color: P.rgb(0.17, 0.165, 0.153) });

    /* ---------- footers ---------- */
    const when = d.when || '';
    doc.getPages().forEach(p2 => {
      p2.drawText('LIVEWORK · A talent partner for modern work', { x: L, y: 34, size: 7.5, font: reg, color: STONE });
      const t = clean([m.ref, when].filter(Boolean).join(' · '));
      p2.drawText(t, { x: R - reg.widthOfTextAtSize(t, 7.5), y: 34, size: 7.5, font: reg, color: STONE });
    });
    doc.setTitle('Interview guide · ' + clean(m.name || ''));
    doc.setAuthor('LIVEWORK');
    return await doc.save();
  })();
}
if (typeof module !== 'undefined') module.exports = { buildGuidePdf };
