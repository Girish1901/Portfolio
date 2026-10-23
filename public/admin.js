// Private editor. Loaded only after the secret trigger; every save is checked on the server.
(() => {
const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const call = (m, u, b) => fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: b ? JSON.stringify(b) : undefined })
  .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Error ' + r.status); return j; });

const st = document.createElement('style');
st.textContent = `
.pfA,.pfL{font:15px/1.5 'Hanken Grotesk',system-ui,sans-serif;color:#EDEDF2}
.pfA{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);background:#0f0f13;border-left:1px solid #26262d;z-index:60;overflow:auto;padding:0 1rem 3rem}
.pfA .top{position:sticky;top:0;background:#0f0f13;padding:.9rem 0;border-bottom:1px solid #26262d;z-index:2}
.pfA .top b{display:block;margin-bottom:.6rem}.pfA .acts,.pfA .tabs,.pfA .row{display:flex;gap:.4rem;flex-wrap:wrap}
.pfA .tabs{margin-top:.7rem}.pfA button{font:inherit;color:#EDEDF2;background:#1a1a20;border:1px solid #26262d;border-radius:99px;padding:.35rem .9rem;cursor:pointer}
.pfA button:hover{border-color:#007BA7}.pfA .on{background:#007BA7;border-color:#007BA7}.pfA .sv{background:#FF2A8A;border-color:#FF2A8A;color:#fff}
.pfA .sm{padding:.15rem .7rem;font-size:.85rem}.pfA .add{margin-top:.8rem;width:100%;border-radius:10px;border-style:dashed}
.pfA .card{border:1px solid #26262d;border-radius:12px;padding:.8rem;margin-top:.9rem;background:#121216}
.pfA label{display:block;margin:.5rem 0}.pfA label span{display:block;font-size:.8rem;color:#9A9AA6;margin-bottom:.2rem}
.pfA input[type=text],.pfA input[type=number],.pfA textarea{width:100%;font:inherit;color:#EDEDF2;background:#0A0A0A;border:1px solid #26262d;border-radius:8px;padding:.45rem .6rem}
.pfA label.ck{display:flex;gap:.5rem;align-items:center}.pfA .msg{font-size:.85rem;color:#9A9AA6;margin-top:.5rem;min-height:1.2em}.pfA .row{margin-top:.6rem}
.pfL{border:1px solid #26262d;border-radius:16px;background:#0f0f13;padding:1.4rem;width:min(360px,92vw)}.pfL::backdrop{background:rgba(0,0,0,.8)}
.pfL input{width:100%;font:inherit;color:#EDEDF2;background:#0A0A0A;border:1px solid #26262d;border-radius:10px;padding:.65rem .8rem;margin:.8rem 0}
.pfL button{font:inherit;color:#fff;background:#FF2A8A;border:0;border-radius:99px;padding:.6rem 1.3rem;cursor:pointer}.pfL p{color:#FF2A8A;min-height:1.3em;margin-top:.6rem}`;
document.head.append(st);

let W, panel, body, msg, tab = 'Profile', dirty = false, timer;
const live = () => { dirty = true; msg.textContent = 'Unsaved changes'; clearTimeout(timer); timer = setTimeout(() => PF.set(structuredClone(W)), 350); };
const swap = (a, i, j) => { [a[i], a[j]] = [a[j], a[i]]; };

function field(parent, label, obj, key, o = {}) {
  const l = $('label'); l.append($('span', '', label));
  if (o.check) { l.className = 'ck'; const c = $('input'); c.type = 'checkbox'; c.checked = !!obj[key]; c.onchange = () => { obj[key] = c.checked; live(); }; l.prepend(c); l.lastChild.style.margin = 0; parent.append(l); return; }
  const i = $(o.area ? 'textarea' : 'input'); if (o.area) i.rows = o.rows || 3; else i.type = o.num ? 'number' : 'text'; if (o.num) i.step = 'any';
  i.value = o.get ? o.get(obj) : (obj[key] ?? '');
  i.oninput = () => { if (o.set) o.set(obj, i.value); else obj[key] = o.num ? (+i.value || 0) : i.value; live(); };
  l.append(i); parent.append(l);
}
const lines = (key) => ({ area: 1, rows: 4, get: (o) => (o[key] || []).join('\n'), set: (o, v) => { o[key] = v.split('\n').map((s) => s.trim()).filter(Boolean); } });

function list(parent, arr, make, draw, addLabel) {
  arr.forEach((it, i) => {
    const c = $('div', 'card'); draw(c, it, i);
    const r = $('div', 'row');
    [['Up', () => i && swap(arr, i, i - 1)], ['Down', () => i < arr.length - 1 && swap(arr, i, i + 1)], ['Delete', () => confirm('Delete this?') && arr.splice(i, 1)]].forEach(([t, fn]) => {
      const b = $('button', 'sm', t); b.onclick = () => { fn(); live(); draw_(); }; r.append(b);
    });
    c.append(r); parent.append(c);
  });
  const a = $('button', 'add', '+ ' + addLabel); a.onclick = () => { arr.push(make()); live(); draw_(); }; parent.append(a);
}

const TABS = {
  Profile(b) {
    const p = W.profile;
    field(b, 'Name', p, 'name'); field(b, 'Line under your name', p, 'headline');
    field(b, 'Bio / summary', p, 'summary', { area: 1, rows: 7 }); field(b, 'Location (shown in footer)', p, 'location');
  },
  Skills(b) {
    list(b, W.skills, () => ({ name: 'New group', sub: '', color: '#007BA7', items: [] }), (c, g) => {
      field(c, 'Group name', g, 'name'); field(c, 'Short description', g, 'sub'); field(c, 'Accent colour (hex)', g, 'color');
      field(c, 'Skills (one per line)', g, 'items', lines('items'));
    }, 'Add skill group');
  },
  Projects(b) {
    list(b, W.projects, () => ({ title: 'New project', tools: '', big: 0, pre: '', suf: '', dec: 0, cap: '', finding: '', businessProblem: '', points: [], questions: [], businessValue: '', images: [], github: '', note: '', extraLinks: [] }), (c, p) => {
      field(c, 'Title', p, 'title'); field(c, 'Tools', p, 'tools');
      field(c, 'Big number', p, 'big', { num: 1 }); field(c, 'Before the number (e.g. $)', p, 'pre'); field(c, 'After the number (e.g. M, K+, %)', p, 'suf'); field(c, 'Decimals', p, 'dec', { num: 1 });
      field(c, 'Caption under the number', p, 'cap');
      field(c, 'Business Problem', p, 'businessProblem', { area: 1, rows: 2 });
      field(c, 'What I Built / did (one point per line)', p, 'points', lines('points'));
      field(c, 'Key Business Questions (one per line)', p, 'questions', lines('questions'));
      field(c, 'Key finding', p, 'finding', { area: 1, rows: 3 });
      field(c, 'Business Value', p, 'businessValue', { area: 1, rows: 2 });
      field(c, 'Images (one per line: https://link or img/file.jpg | caption)', p, 'images', { area: 1, rows: 4,
        get: (o) => (o.images || []).map((i) => i.src + (i.alt ? ' | ' + i.alt : '')).join('\n'),
        set: (o, v) => { o.images = v.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => { const [src, ...a] = s.split('|'); return { src: src.trim(), alt: a.join('|').trim() }; }); } });
      field(c, 'GitHub link', p, 'github'); field(c, 'Note (shown if no GitHub link)', p, 'note');
      field(c, 'Case Study URL (e.g. ecommerce.html or churn.html)', p, 'caseStudyUrl', {
        get: (o) => (o.extraLinks && o.extraLinks[0]) ? o.extraLinks[0].url : (o.caseStudyUrl || ''),
        set: (o, v) => { o.caseStudyUrl = v.trim(); o.extraLinks = v.trim() ? [{ label: 'View Full Case Study', url: v.trim(), primary: true }] : []; }
      });
      field(c, 'Show number in pink', p, 'rose', { check: 1 }); field(c, 'Show a percentage ring (uses the number as %)', p, 'ring', { check: 1 });
    }, 'Add project');
  },
  Sections(b) {
    const t = W.texts;
    [['Skills heading', 'stackTitle'], ['Projects heading', 'workTitle'], ['Contact heading', 'contactTitle']].forEach(([l, k]) => field(b, l, t, k));
    field(b, 'Skills intro text', t, 'stackLede', { area: 1 });
    field(b, 'Currently Learning (e.g. Microsoft Fabric · PySpark · Data Engineering)', t, 'stackLearning');
    field(b, 'Contact text', t, 'contactLede', { area: 1 });
    field(b, 'Hide the skills section', W.hide, 'stack', { check: 1 }); field(b, 'Hide the projects section', W.hide, 'work', { check: 1 });
    b.append($('b', '', 'Extra sections (shown between Projects and Contact)'));
    list(b, W.sections, () => ({ title: 'New section', body: '' }), (c, s) => { field(c, 'Heading', s, 'title'); field(c, 'Text', s, 'body', { area: 1, rows: 5 }); }, 'Add section');
  },
  Contact(b) {
    list(b, W.contacts, () => ({ label: 'New link', url: 'https://' }), (c, k) => {
      field(c, 'Button text', k, 'label'); field(c, 'Link (https://, mailto: or tel:)', k, 'url'); field(c, 'Highlight in pink', k, 'primary', { check: 1 });
    }, 'Add contact');
  },
};
function draw_() { body.replaceChildren(); TABS[tab](body); }

function edit() {
  W = structuredClone(PF.get()); dirty = false;
  panel?.remove(); panel = $('div', 'pfA'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Edit portfolio');
  const top = $('div', 'top'), acts = $('div', 'acts'), tabs = $('div', 'tabs'); msg = $('div', 'msg'); body = $('div');
  top.append($('b', '', 'Edit portfolio'), acts, msg, tabs);
  const sv = $('button', 'sv', 'Save'), cl = $('button', '', 'Close'), lo = $('button', '', 'Sign out');
  sv.onclick = () => { msg.textContent = 'Saving…'; call('PUT', '/api/content', W).then(() => { dirty = false; saved = structuredClone(W); PF.set(structuredClone(W)); msg.textContent = 'Saved. Visitors see it now.'; }).catch((e) => { msg.textContent = 'Not saved: ' + e.message; }); };
  cl.onclick = () => { if (dirty && !confirm('Close without saving?')) return; panel.remove(); PF.set(JSON.parse(JSON.stringify(saved))); };
  lo.onclick = () => call('DELETE', '/api/auth').then(() => { panel.remove(); location.reload(); });
  acts.append(sv, cl, lo);
  Object.keys(TABS).forEach((k) => { const b = $('button', k === tab ? 'on' : '', k); b.onclick = () => { tab = k; tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw_(); }; tabs.append(b); });
  panel.append(top, body); document.body.append(panel); saved = structuredClone(W); draw_();
}
let saved;
function login() {
  const d = $('dialog', 'pfL'), f = $('form'), email = $('input'), password = $('input'), e = $('p');
  email.type = 'email'; email.placeholder = 'Email'; email.autocomplete = 'username'; email.required = true; email.setAttribute('aria-label', 'Email');
  password.type = 'password'; password.placeholder = 'Password'; password.autocomplete = 'current-password'; password.required = true; password.setAttribute('aria-label', 'Password');
  const b = $('button', '', 'Enter'); f.method = 'dialog'; f.append(email, password, b, e); d.append(f); document.body.append(d); d.showModal(); email.focus();
  d.addEventListener('close', () => d.remove());
  f.onsubmit = (ev) => { ev.preventDefault(); e.textContent = ''; call('POST', '/api/auth', { email: email.value, password: password.value }).then(() => { d.close(); edit(); }).catch((x) => { e.textContent = x.message; password.select(); }); };
}
window.PFAdmin = { open: () => { if (panel && panel.isConnected) return; call('GET', '/api/auth').then((j) => (j.admin ? edit() : login())).catch(login); } };
})();
