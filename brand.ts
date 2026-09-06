// brand.ts - the LIVEWORK email brand, in one place.
// Every edge function imports this from the repo, so wording and styling
// change here once instead of in six functions.
// @ts-nocheck

export const BRAND = {
  ink: '#000000',
  paper: '#F4F2ED',
  white: '#FFFFFF',
  line: '#D3CEC4',
  stone: '#75716A',
  gold: '#E3BD3B',
  wordmark: 'LIVE&nbsp;|&nbsp;WORK',
  name: 'LIVEWORK',
  // short address for email and marketing
  address: '26632 Towne Centre Dr., Foothill Ranch, CA 92610',
  // full address for contracts, invoices and legal notice
  addressFull: '26632 Towne Centre Dr. #300, Suite 3, Foothill Ranch, CA 92610',
  entity: 'GERMANN INC, a California corporation, dba LIVEWORK',
  hello: 'hello@livework.inc',
  site: 'livework.inc'
};

export const esc = (t) => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONT = 'Arial,Helvetica,sans-serif';

/* a row of label and value, the spec sheet look, table based so Outlook keeps it */
export function rows(pairs) {
  const cells = (pairs || []).filter(Boolean).map(([k, v]) =>
    '<tr>' +
    '<td width="150" style="padding:10px 0;border-bottom:1px solid ' + BRAND.line + ';font:700 12px ' + FONT + ';color:' + BRAND.stone + ';letter-spacing:1px;text-transform:uppercase;vertical-align:top">' + esc(k) + '</td>' +
    '<td style="padding:10px 0;border-bottom:1px solid ' + BRAND.line + ';font:400 15px ' + FONT + ';color:' + BRAND.ink + '">' + v + '</td>' +
    '</tr>').join('');
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px">' + cells + '</table>';
}

/* a black button that survives Outlook */
export function button(label, href) {
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px">' +
    '<tr><td bgcolor="' + BRAND.ink + '" style="background:' + BRAND.ink + '">' +
    '<a href="' + href + '" style="display:inline-block;padding:14px 26px;font:700 14px ' + FONT + ';color:' + BRAND.white + ';text-decoration:none;letter-spacing:1px">' +
    esc(label) + '</a></td></tr></table>';
}

/* big number or code block, centred on paper */
export function bigBlock(text, note) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px">' +
    '<tr><td bgcolor="' + BRAND.paper + '" align="center" style="background:' + BRAND.paper + ';padding:26px 20px">' +
    '<span style="font:700 38px ' + FONT + ';color:' + BRAND.ink + ';letter-spacing:8px">' + esc(text) + '</span>' +
    (note ? '<br><span style="font:400 13px ' + FONT + ';color:' + BRAND.stone + '">' + esc(note) + '</span>' : '') +
    '</td></tr></table>';
}

/*
  shell(body, fromName, opts)
  body     plain text, blank lines make paragraphs, or pass opts.html for blocks
  fromName who signs it, omit for system mail
  opts     { kicker, headline, html, footer, unsubscribe }
*/
export function shell(bodyText, fromName, opts) {
  opts = opts || {};
  const P = 'margin:0 0 16px;font:400 16px/1.6 ' + FONT + ';color:' + BRAND.ink;
  const paras = String(bodyText || '').split(/\n{2,}/).filter(Boolean).map(p =>
    '<p style="' + P + '">' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
  const kicker = opts.kicker ? '<tr><td style="padding:0 32px 14px">' +
    '<span style="font:700 11px ' + FONT + ';color:' + BRAND.stone + ';letter-spacing:2px;text-transform:uppercase">' +
    esc(opts.kicker) + '</span></td></tr>' : '';
  const headline = opts.headline ? '<tr><td style="padding:0 32px 18px">' +
    '<span style="font:700 30px/1.15 ' + FONT + ';color:' + BRAND.ink + '">' + esc(opts.headline) + '</span></td></tr>' : '';
  const sign = fromName ? '<tr><td style="padding:8px 32px 0">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
      '<tr><td bgcolor="' + BRAND.line + '" height="1" style="background:' + BRAND.line + ';height:1px;line-height:1px;font-size:0">&nbsp;</td></tr></table>' +
    '</td></tr>' +
    '<tr><td style="padding:18px 32px 30px">' +
      '<span style="font:700 15px ' + FONT + ';color:' + BRAND.ink + '">' + esc(fromName) + '</span><br>' +
      '<span style="font:700 14px ' + FONT + ';color:' + BRAND.stone + ';letter-spacing:2px">' + BRAND.wordmark + '</span>' +
    '</td></tr>' : '<tr><td style="padding:0 32px 26px">&nbsp;</td></tr>';
  const foot = (opts.footer ? esc(opts.footer) + '<br>' : '') + BRAND.name + ' &middot; ' + BRAND.address +
    (opts.unsubscribe ? '<br><a href="' + opts.unsubscribe + '" style="color:' + BRAND.stone + '">Unsubscribe</a>' : '');

  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:' + BRAND.paper + '">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + BRAND.paper + '" style="background:' + BRAND.paper + ';margin:0;padding:0">' +
  '<tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="' + BRAND.white + '" style="width:600px;max-width:600px;background:' + BRAND.white + '">' +
      '<tr><td bgcolor="' + BRAND.ink + '" style="background:' + BRAND.ink + ';padding:22px 32px">' +
        '<span style="font:700 20px ' + FONT + ';color:' + BRAND.white + ';letter-spacing:3px">' + BRAND.wordmark + '</span>' +
      '</td></tr>' +
      '<tr><td bgcolor="' + BRAND.gold + '" height="6" style="background:' + BRAND.gold + ';height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>' +
      '<tr><td style="padding:32px 32px 0">&nbsp;</td></tr>' +
      kicker + headline +
      '<tr><td style="padding:0 32px 8px">' + paras + (opts.html || '') + '</td></tr>' +
      sign +
      '<tr><td bgcolor="' + BRAND.paper + '" style="background:' + BRAND.paper + ';padding:16px 32px;font:400 12px/1.5 ' + FONT + ';color:' + BRAND.stone + '">' +
        foot +
      '</td></tr>' +
    '</table>' +
  '</td></tr></table></body></html>';
}
