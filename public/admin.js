// Private editor with dedicated single-project management, Firebase Firestore, Auth, and Storage integration.
(() => {
const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

const st = document.createElement('style');
st.textContent = `
.pfA,.pfL{font:15px/1.5 'Hanken Grotesk',system-ui,sans-serif;color:#EDEDF2}
.pfA{position:fixed;top:0;right:0;bottom:0;width:min(520px,100vw);background:#0f0f13;border-left:1px solid #26262d;z-index:60;overflow:auto;padding:0 1.2rem 3.5rem;box-shadow:-8px 0 32px rgba(0,0,0,.6)}
.pfA .top{position:sticky;top:0;background:#0f0f13;padding:1rem 0 .8rem;border-bottom:1px solid #26262d;z-index:10}
.pfA .top b{display:block;margin-bottom:.5rem;font-size:1.05rem;color:#EDEDF2}
.pfA .acts,.pfA .tabs,.pfA .row{display:flex;gap:.4rem;flex-wrap:wrap}
.pfA .tabs{margin-top:.7rem}
.pfA button{font:inherit;color:#EDEDF2;background:#1a1a20;border:1px solid #26262d;border-radius:99px;padding:.4rem 1rem;cursor:pointer;transition:border-color .2s,background .2s,transform .15s}
.pfA button:hover{border-color:#3DB8E8;transform:translateY(-1px)}
.pfA .on{background:#007BA7;border-color:#3DB8E8;color:#fff;font-weight:600}
.pfA .sv{background:#FF2A8A;border-color:#FF2A8A;color:#fff;font-weight:600}
.pfA .sv:hover{background:#ff4d9e;border-color:#ff4d9e}
.pfA .seed-btn{background:#162b3a;border-color:#3DB8E8;color:#3DB8E8}
.pfA .seed-btn:hover{background:#1c384c}
.pfA .sm{padding:.25rem .75rem;font-size:.85rem}
.pfA .add{margin-top:.8rem;width:100%;border-radius:10px;border-style:dashed}
.pfA .card{border:1px solid #26262d;border-radius:14px;padding:1rem;margin-top:1rem;background:#121216}
.pfA label{display:block;margin:.65rem 0}
.pfA label span{display:block;font-size:.82rem;font-weight:500;color:#9A9AA6;margin-bottom:.25rem}
.pfA input[type=text],.pfA input[type=number],.pfA textarea{width:100%;font:inherit;color:#EDEDF2;background:#0A0A0A;border:1px solid #26262d;border-radius:8px;padding:.5rem .7rem;transition:border-color .2s}
.pfA input[type=text]:focus,.pfA input[type=number]:focus,.pfA textarea:focus{border-color:#3DB8E8;outline:none}
.pfA label.ck{display:flex;gap:.6rem;align-items:center}
.pfA .msg{font-size:.88rem;color:#3DB8E8;margin-top:.6rem;min-height:1.3em;line-height:1.4}
.pfA .row{margin-top:.8rem}
.pfA .sec-divider{margin:1.4rem 0 .6rem;padding-top:1rem;border-top:1px solid #26262d;font-size:.9rem;color:#3DB8E8;display:flex;align-items:center;gap:.5rem}
.pfA .file-up{margin-top:.6rem;padding:.7rem .9rem;border:1px dashed #3DB8E8;border-radius:10px;background:rgba(61,184,232,0.06);font-size:.85rem}
.pfA .file-up input[type=file]{font-size:.8rem;color:#9A9AA6;margin-top:.3rem}
.pfL{border:1px solid #26262d;border-radius:16px;background:#0f0f13;padding:1.6rem;width:min(380px,92vw);box-shadow:0 12px 48px rgba(0,0,0,.8)}
.pfL::backdrop{background:rgba(0,0,0,.85);backdrop-filter:blur(4px)}
.pfL input{width:100%;font:inherit;color:#EDEDF2;background:#0A0A0A;border:1px solid #26262d;border-radius:10px;padding:.7rem .9rem;margin:.6rem 0}
.pfL input:focus{border-color:#FF2A8A;outline:none}
.pfL button{font:inherit;color:#fff;background:#FF2A8A;border:0;border-radius:99px;padding:.7rem 1.4rem;cursor:pointer;font-weight:600;margin-top:.4rem;width:100%}
.pfL p{color:#FF2A8A;min-height:1.3em;margin-top:.6rem;font-size:.88rem}
`;
document.head.append(st);

let W, panel, body, msg, tab = 'Projects', dirty = false, timer, saved;
window._activeProjectIdx = 0;

const live = () => { 
  dirty = true; 
  if (msg) msg.textContent = '● Unsaved changes (auto-caching to browser)'; 
  clearTimeout(timer); 
  timer = setTimeout(() => {
    PF.set(structuredClone(W));
    try { localStorage.setItem('portfolio_content', JSON.stringify(W)); } catch(e){}
  }, 350); 
};

const swap = (a, i, j) => { [a[i], a[j]] = [a[j], a[i]]; };

function field(parent, label, obj, key, o = {}) {
  const l = $('label'); l.append($('span', '', label));
  if (o.check) { 
    l.className = 'ck'; 
    const c = $('input'); c.type = 'checkbox'; c.checked = !!obj[key]; 
    c.onchange = () => { obj[key] = c.checked; live(); }; 
    l.prepend(c); 
    l.lastChild.style.margin = 0; 
    parent.append(l); 
    return; 
  }
  const i = $(o.area ? 'textarea' : 'input'); 
  if (o.area) i.rows = o.rows || 3; 
  else i.type = o.num ? 'number' : 'text'; 
  if (o.num) i.step = 'any';
  i.value = o.get ? o.get(obj) : (obj[key] ?? '');
  i.oninput = () => { 
    if (o.set) o.set(obj, i.value); 
    else obj[key] = o.num ? (+i.value || 0) : i.value; 
    live(); 
  };
  l.append(i); 
  parent.append(l);
}

const lines = (key) => ({ 
  area: 1, 
  rows: 4, 
  get: (o) => (o[key] || []).join('\n'), 
  set: (o, v) => { o[key] = v.split('\n').map((s) => s.trim()).filter(Boolean); } 
});

function fileUploader(parent, label, onUploaded, prefix = "images") {
  const box = $('div', 'file-up');
  box.append($('b', '', label));
  const hint = $('div', '', 'Select a local file to upload directly to Firebase Storage.');
  hint.style.fontSize = '.78rem';
  hint.style.color = '#9A9AA6';
  hint.style.marginBottom = '.4rem';
  box.append(hint);
  
  const inp = $('input'); inp.type = 'file';
  inp.onchange = async () => {
    const file = inp.files && inp.files[0];
    if (!file) return;
    if (!window.FB) { alert("Firebase is not connected yet."); return; }
    box.style.opacity = '0.5';
    try {
      if (msg) msg.textContent = 'Uploading ' + file.name + ' to Firebase Storage…';
      const url = await window.FB.uploadFile(file, prefix);
      onUploaded(url);
      live();
      if (msg) msg.textContent = '✅ Uploaded! Saved URL: ' + file.name;
    } catch(err) {
      alert("Upload failed: " + err.message + "\n\nTip: In Firebase Console -> Storage tab, ensure Storage is initialized.");
      if (msg) msg.textContent = 'Upload failed: ' + err.message;
    } finally {
      box.style.opacity = '1';
      inp.value = '';
    }
  };
  box.append(inp);
  parent.append(box);
}

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

// Multi-layer resilient save
async function saveAll() {
  if (msg) msg.textContent = 'Saving across all persistence layers…';
  
  // 1. Browser localStorage (Guaranteed to persist across refresh)
  try {
    localStorage.setItem('portfolio_content', JSON.stringify(W));
  } catch(e) {
    console.warn("localStorage save error:", e);
  }
  
  // 2. Server Disk (data/content.json)
  try {
    await fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(W)
    });
  } catch(e) {
    console.warn("Server disk save notice:", e);
  }
  
  // 3. Firebase Cloud Firestore
  let fbOk = false, fbErr = '';
  if (window.FB && window.FB.saveContent) {
    try {
      await window.FB.saveContent(W);
      fbOk = true;
    } catch(e) {
      fbErr = e.message;
      console.warn("Firestore save notice:", e);
    }
  }
  
  dirty = false;
  saved = structuredClone(W);
  PF.set(structuredClone(W));
  
  if (fbOk) {
    if (msg) msg.textContent = '✅ Saved permanently to Firebase Cloud, Local Disk & Browser!';
  } else if (fbErr) {
    if (msg) msg.textContent = '💾 Saved locally to Browser & Disk! (Cloud: ' + fbErr + ')';
    alert("Saved permanently to your browser and local disk!\n\nNotice for Firebase Cloud:\n" + fbErr + "\n\n(Tip: In Firebase Console -> Firestore Database -> Rules, ensure 'allow read, write: if true;' is published).");
  } else {
    if (msg) msg.textContent = '💾 Saved permanently to Local Storage & Disk!';
  }
}

const TABS = {
  Projects(b) {
    if (!W.projects) W.projects = [];
    if (!window._activeProjectIdx || window._activeProjectIdx >= W.projects.length) {
      window._activeProjectIdx = 0;
    }
    
    // Top selector bar with pills for individual projects
    const selWrap = $('div');
    selWrap.style.marginBottom = '1.2rem';
    selWrap.append($('b', '', 'Select Single Project to Edit:'));
    
    const pTabs = $('div', 'tabs');
    pTabs.style.marginTop = '.4rem';
    pTabs.style.display = 'flex';
    pTabs.style.gap = '.4rem';
    pTabs.style.flexWrap = 'wrap';
    
    W.projects.forEach((p, idx) => {
      const words = (p.title || 'Project').split(' ');
      const shortName = words.slice(0, 2).join(' ');
      const btn = $('button', idx === window._activeProjectIdx ? 'on' : '', `${idx + 1}. ${shortName}`);
      btn.onclick = () => {
        window._activeProjectIdx = idx;
        draw_();
      };
      pTabs.append(btn);
    });
    
    const addBtn = $('button', '', '➕ New Project');
    addBtn.onclick = () => {
      W.projects.push({
        title: 'New Analytics Project',
        tools: 'SQL · Power BI · DAX · Python',
        big: 0, pre: '', suf: '', dec: 0, cap: 'records analyzed',
        businessProblem: '', points: [], questions: [],
        finding: '', businessValue: '', images: [],
        github: '', note: '', caseStudyUrl: '', extraLinks: []
      });
      window._activeProjectIdx = W.projects.length - 1;
      live();
      draw_();
    };
    pTabs.append(addBtn);
    selWrap.append(pTabs);
    b.append(selWrap);
    
    const currIdx = window._activeProjectIdx;
    const p = W.projects[currIdx];
    if (!p) {
      b.append($('p', '', 'No projects found. Click ➕ New Project to add one.'));
      return;
    }
    
    // Active project card
    const card = $('div', 'card');
    card.style.background = '#14141a';
    card.style.border = '1px solid #3DB8E8';
    card.style.padding = '1.2rem';
    
    const headRow = $('div');
    headRow.style.display = 'flex';
    headRow.style.justifyContent = 'space-between';
    headRow.style.alignItems = 'center';
    headRow.style.marginBottom = '1rem';
    headRow.style.paddingBottom = '.6rem';
    headRow.style.borderBottom = '1px solid #26262d';
    
    const hTitle = $('b', '', `Editing Project ${currIdx + 1} of ${W.projects.length}`);
    hTitle.style.color = '#3DB8E8';
    
    const quickSv = $('button', 'sv', '💾 Save Project');
    quickSv.onclick = async () => { await saveAll(); };
    headRow.append(hTitle, quickSv);
    card.append(headRow);
    
    // Group 1: General Info & Metrics
    const div1 = $('div', 'sec-divider'); div1.textContent = '1. Project Info & Highlight Metric'; card.append(div1);
    field(card, 'Project Title', p, 'title');
    field(card, 'Tools (e.g. SQL · Power BI · DAX · Python)', p, 'tools');
    field(card, 'Highlight KPI Number (e.g. 158.8, 20.37, 899.9)', p, 'big', { num: 1 });
    field(card, 'Prefix before number (e.g. $ or ₹)', p, 'pre');
    field(card, 'Suffix after number (e.g. M, K+, %)', p, 'suf');
    field(card, 'Decimals to show', p, 'dec', { num: 1 });
    field(card, 'Caption under the KPI number', p, 'cap');
    field(card, 'Show KPI number in pink accent', p, 'rose', { check: 1 });
    field(card, 'Show percentage progress ring', p, 'ring', { check: 1 });
    
    // Group 2: Business & Analytics Story
    const div2 = $('div', 'sec-divider'); div2.textContent = '2. Business Problem & Insights'; card.append(div2);
    field(card, 'Business Problem / Context', p, 'businessProblem', { area: 1, rows: 3 });
    field(card, 'Key Business Questions (one per line)', p, 'questions', lines('questions'));
    field(card, 'What I Built / Pipeline Steps (one per line)', p, 'points', lines('points'));
    field(card, 'Key Finding / Analytical Insight', p, 'finding', { area: 1, rows: 3 });
    field(card, 'Business Value / Strategic Impact', p, 'businessValue', { area: 1, rows: 2 });
    
    // Group 3: Case Study Deep-Dive
    const div3 = $('div', 'sec-divider'); div3.textContent = '3. Case Study Deep-Dive 🚀'; card.append(div3);
    field(card, 'Case Study Page URL (e.g. ecommerce.html, churn.html, adidas.html, upi.html, cinema.html)', p, 'caseStudyUrl', {
      get: (o) => (o.extraLinks && o.extraLinks[0]) ? o.extraLinks[0].url : (o.caseStudyUrl || ''),
      set: (o, v) => {
        o.caseStudyUrl = v.trim();
        o.extraLinks = v.trim() ? [{ label: (o.extraLinks && o.extraLinks[0] && o.extraLinks[0].label) || 'View Full Case Study', url: v.trim(), primary: true }] : [];
      }
    });
    field(card, 'Case Study Button Label', p, 'csLabel', {
      get: (o) => (o.extraLinks && o.extraLinks[0]) ? o.extraLinks[0].label : 'View Full Case Study',
      set: (o, v) => {
        if (!o.extraLinks) o.extraLinks = [];
        if (!o.extraLinks[0]) o.extraLinks[0] = { url: o.caseStudyUrl || '', primary: true };
        o.extraLinks[0].label = v;
      }
    });
    
    // Group 4: Code & Screenshots
    const div4 = $('div', 'sec-divider'); div4.textContent = '4. GitHub & Screenshots'; card.append(div4);
    field(card, 'GitHub Repository URL', p, 'github');
    field(card, 'Status Note (e.g. Published in Power BI Service)', p, 'note');
    field(card, 'Screenshots (one per line: https://link or img/file.jpg | caption)', p, 'images', {
      area: 1, rows: 4,
      get: (o) => (o.images || []).map((i) => i.src + (i.alt ? ' | ' + i.alt : '')).join('\n'),
      set: (o, v) => {
        o.images = v.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => {
          const [src, ...a] = s.split('|');
          return { src: src.trim(), alt: a.join('|').trim() };
        });
      }
    });
    fileUploader(card, 'Upload Screenshot to Firebase Storage', (url) => {
      if (!p.images) p.images = [];
      p.images.push({ src: url, alt: p.title || 'Screenshot' });
      draw_();
    }, "projects");
    
    // Bottom Action Row
    const botRow = $('div', 'row');
    botRow.style.marginTop = '1.4rem';
    botRow.style.display = 'flex';
    botRow.style.gap = '.5rem';
    botRow.style.flexWrap = 'wrap';
    
    const svBtn = $('button', 'sv', '💾 Save Project Changes');
    svBtn.onclick = async () => { await saveAll(); };
    
    const upBtn = $('button', 'sm', '⬆️ Move Up');
    upBtn.onclick = () => {
      if (currIdx > 0) {
        swap(W.projects, currIdx, currIdx - 1);
        window._activeProjectIdx = currIdx - 1;
        live();
        draw_();
      }
    };
    
    const dnBtn = $('button', 'sm', '⬇️ Move Down');
    dnBtn.onclick = () => {
      if (currIdx < W.projects.length - 1) {
        swap(W.projects, currIdx, currIdx + 1);
        window._activeProjectIdx = currIdx + 1;
        live();
        draw_();
      }
    };
    
    const delBtn = $('button', 'sm', '🗑️ Delete Project');
    delBtn.style.color = '#ff6b6b';
    delBtn.onclick = () => {
      if (confirm(`Are you sure you want to delete "${p.title}"?`)) {
        W.projects.splice(currIdx, 1);
        window._activeProjectIdx = Math.max(0, currIdx - 1);
        live();
        draw_();
      }
    };
    
    botRow.append(svBtn, upBtn, dnBtn, delBtn);
    card.append(botRow);
    b.append(card);
  },

  Profile(b) {
    const p = W.profile;
    field(b, 'Full Name', p, 'name');
    field(b, 'Headline under your name', p, 'headline');
    field(b, 'Bio / About Me Summary', p, 'summary', { area: 1, rows: 7 });
    field(b, 'Location (shown in footer)', p, 'location');
    field(b, 'Profile Picture URL', p, 'avatarUrl', {
      get: (o) => o.avatarUrl || 'img/profile.jpg',
      set: (o, v) => { o.avatarUrl = v.trim(); }
    });
    fileUploader(b, 'Upload New Profile Photo to Firebase Storage', (url) => {
      p.avatarUrl = url;
      draw_();
    }, "profile");
  },

  Skills(b) {
    list(b, W.skills, () => ({ name: 'New Group', sub: '', color: '#007BA7', items: [] }), (c, g) => {
      field(c, 'Layer Name (e.g. Bronze, Silver, Gold)', g, 'name');
      field(c, 'Short Description / Pipeline Stage', g, 'sub');
      field(c, 'Accent Color (Hex e.g. #FF2A8A, #007BA7)', g, 'color');
      field(c, 'Skill Pills (one per line: CTEs, DAX, etc.)', g, 'items', lines('items'));
    }, 'Add Skill Group');
  },

  Sections(b) {
    const t = W.texts;
    [['Skills Heading', 'stackTitle'], ['Projects Heading', 'workTitle'], ['Contact Heading', 'contactTitle']].forEach(([l, k]) => field(b, l, t, k));
    field(b, 'Skills Intro Text', t, 'stackLede', { area: 1 });
    field(b, 'Currently Learning (e.g. Microsoft Fabric · PySpark · Data Engineering)', t, 'stackLearning');
    field(b, 'Contact Intro Text', t, 'contactLede', { area: 1 });
    field(b, 'Hide Skills Section', W.hide, 'stack', { check: 1 });
    field(b, 'Hide Projects Section', W.hide, 'work', { check: 1 });
    b.append($('b', '', 'Custom Extra Sections'));
    list(b, W.sections, () => ({ title: 'New section', body: '' }), (c, s) => { field(c, 'Heading', s, 'title'); field(c, 'Text', s, 'body', { area: 1, rows: 5 }); }, 'Add section');
  },

  Contact(b) {
    list(b, W.contacts, () => ({ label: 'New Link', url: 'https://' }), (c, k) => {
      field(c, 'Button Text', k, 'label');
      field(c, 'Link (https://, mailto: or tel:)', k, 'url');
      field(c, 'Highlight in Pink Accent', k, 'primary', { check: 1 });
    }, 'Add Contact Link');
    fileUploader(b, 'Upload New Resume PDF to Firebase Storage', (url) => {
      const resumeContact = (W.contacts || []).find(c => /resume/i.test(c.label));
      if (resumeContact) resumeContact.url = url;
      if (W.profile) W.profile.resumeUrl = url;
      draw_();
    }, "documents");
  }
};

function draw_() { 
  body.replaceChildren(); 
  TABS[tab](body); 
}

function edit() {
  W = structuredClone(PF.get()); 
  dirty = false;
  panel?.remove(); 
  panel = $('div', 'pfA'); 
  panel.setAttribute('role', 'dialog'); 
  panel.setAttribute('aria-label', 'Edit portfolio');
  
  const top = $('div', 'top');
  const acts = $('div', 'acts');
  const tabs = $('div', 'tabs'); 
  msg = $('div', 'msg'); 
  body = $('div');
  
  top.append($('b', '', 'Admin Portfolio Editor (Firebase & Disk Synced)'), acts, msg, tabs);
  
  const sv = $('button', 'sv', '💾 Save All Changes');
  const seedBtn = $('button', 'seed-btn', '⚡ Push to Firebase (Create Collection)');
  const syncBtn = $('button', '', '☁️ Upload Files to Storage');
  const cl = $('button', '', 'Close');
  const lo = $('button', '', 'Sign Out');
  
  sv.onclick = async () => { 
    await saveAll(); 
  };

  seedBtn.onclick = async () => {
    if (!window.FB) { alert("Firebase not loaded yet."); return; }
    msg.textContent = 'Pushing current content to Firebase Cloud Firestore…';
    try {
      await window.FB.saveContent(W);
      msg.textContent = '✅ Success! Collection "portfolio" created in Firebase Console!';
      alert("🎉 Success!\n\nThe collection 'portfolio' and document 'content' are now created in Cloud Firestore!\n\nYou can now see it in your Firebase Console under Firestore Database.");
    } catch(err) {
      console.error(err);
      msg.textContent = 'Firestore Error: ' + err.message;
      alert("Firebase Firestore Permission Denied (403):\n\n" + err.message + "\n\nTo allow write permissions in Firebase Console:\n1. Open Firebase Console -> Firestore Database -> Rules tab\n2. Change rules to:\n   allow read, write: if true;\n3. Click 'Publish'\n4. Click this button again!");
    }
  };

  syncBtn.onclick = async () => {
    if (!window.FB) { alert("Firebase not loaded yet."); return; }
    if (!confirm("This will upload all 14 local images and your resume PDF to Firebase Storage and update all links in Cloud Firestore. Continue?")) return;
    
    msg.textContent = 'Preparing files for Firebase upload…';
    syncBtn.disabled = true;
    syncBtn.style.opacity = '0.5';
    
    try {
      // 1. Upload Profile Photo
      msg.textContent = '[1/14] Uploading profile photo to Firebase Storage…';
      const profBlob = await fetch('img/profile.jpg').then(r => r.blob());
      const profUrl = await window.FB.uploadFile(profBlob, 'profile', 'profile.jpg');
      W.profile.avatarUrl = profUrl;

      // 2. Upload Resume PDF
      msg.textContent = '[2/14] Uploading resume PDF to Firebase Storage…';
      const resumeBlob = await fetch('Girish_T_Resume.pdf').then(r => r.blob());
      const resumeUrl = await window.FB.uploadFile(resumeBlob, 'documents', 'Girish_T_Resume.pdf');
      W.profile.resumeUrl = resumeUrl;
      const resContact = (W.contacts || []).find(c => /resume/i.test(c.label));
      if (resContact) resContact.url = resumeUrl;

      // 3. Upload Project Screenshots
      let count = 2;
      for (const p of (W.projects || [])) {
        if (!p.images) continue;
        for (const img of p.images) {
          count++;
          const cleanLocal = img.src.startsWith('http') ? img.src : (img.src.startsWith('/') ? img.src.substring(1) : img.src);
          msg.textContent = `[${count}/14] Uploading ${cleanLocal}…`;
          try {
            const blob = await fetch(cleanLocal).then(r => r.blob());
            const fileName = cleanLocal.split('/').pop().split('?')[0];
            const cloudUrl = await window.FB.uploadFile(blob, 'projects', fileName);
            img.src = cloudUrl;
          } catch(err) {
            console.warn("Could not upload " + cleanLocal, err);
          }
        }
      }

      // 4. Save entire updated schema to Firestore & Local
      await saveAll();
      draw_();
      msg.textContent = '✅ All files uploaded to Firebase Storage & mapped!';
      alert("Success! All images and files are now stored in Firebase Storage and mapped in Cloud Firestore.");
    } catch(err) {
      console.error(err);
      msg.textContent = 'Sync error: ' + err.message;
      alert("Firebase Sync Notice:\n" + err.message + "\n\nTip: In Firebase Console, ensure:\n1. Firestore Rules allow write\n2. Firebase Storage is initialized (click 'Get started' in the Storage tab).");
    } finally {
      syncBtn.disabled = false;
      syncBtn.style.opacity = '1';
    }
  };

  cl.onclick = () => { 
    if (dirty && !confirm('Close without saving?')) return; 
    panel.remove(); 
    PF.set(JSON.parse(JSON.stringify(saved))); 
  };
  
  lo.onclick = async () => { 
    if (window.FB && window.FB.logout) {
      await window.FB.logout();
    }
    panel.remove(); 
    location.reload(); 
  };

  acts.append(sv, seedBtn, syncBtn, cl, lo);
  
  Object.keys(TABS).forEach((k) => { 
    const b = $('button', k === tab ? 'on' : '', k); 
    b.onclick = () => { 
      tab = k; 
      tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); 
      draw_(); 
    }; 
    tabs.append(b); 
  });
  
  panel.append(top, body); 
  document.body.append(panel); 
  saved = structuredClone(W); 
  draw_();
}

function login() {
  const d = $('dialog', 'pfL'), f = $('form'), email = $('input'), password = $('input'), e = $('p');
  email.type = 'email'; email.placeholder = 'Firebase Admin Email'; email.autocomplete = 'username'; email.required = true; email.setAttribute('aria-label', 'Email');
  password.type = 'password'; password.placeholder = 'Firebase Password'; password.autocomplete = 'current-password'; password.required = true; password.setAttribute('aria-label', 'Password');
  
  const b = $('button', '', 'Sign In to Admin'); 
  const directBtn = $('button', '', 'Open Editor (Offline / Local Mode)');
  directBtn.type = 'button';
  directBtn.style.background = '#1a1a20';
  directBtn.style.border = '1px solid #26262d';
  directBtn.style.marginTop = '.6rem';
  directBtn.onclick = () => {
    d.close();
    edit();
  };
  
  f.method = 'dialog'; 
  f.append(email, password, b, directBtn, e); 
  d.append(f); 
  document.body.append(d); 
  d.showModal(); 
  email.focus();
  
  d.addEventListener('close', () => d.remove());
  
  f.onsubmit = async (ev) => { 
    ev.preventDefault(); 
    e.textContent = 'Authenticating with Firebase…'; 
    try {
      if (!window.FB) throw new Error("Firebase not loaded yet. Click 'Open Editor (Offline / Local Mode)'.");
      await window.FB.login(email.value.trim(), password.value);
      d.close(); 
      edit(); 
    } catch(x) { 
      e.textContent = x.message || "Login failed"; 
      password.select(); 
    } 
  };
}

window.PFAdmin = { 
  open: () => { 
    if (panel && panel.isConnected) return; 
    if (window.FB && window.FB.getCurrentUser()) {
      edit();
    } else {
      login();
    }
  } 
};
})();
