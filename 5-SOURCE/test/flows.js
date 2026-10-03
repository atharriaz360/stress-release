// node test/flows.js → end-to-end checks for Career Hub. Exit 1 on any FAIL.
// Runs: file:// (sell copy), http + Live-Server-style script injection (host copy), storage fallback, migration, a11y contrast.
// Also writes light/dark screenshots to 3-ETSY-LISTING/screens/.
const puppeteer=require('puppeteer'),fs=require('fs'),http=require('http'),P=require('path');
const ROOT=P.join(__dirname,'..','..'),HOST=P.join(ROOT,'2-HOST-ONLINE'),SELL=P.join(ROOT,'1-SELL-THIS','Career Hub.html');
const SHOTS=P.join(ROOT,'3-ETSY-LISTING','screens');fs.mkdirSync(SHOTS,{recursive:true});
const R=[];const ok=(n,c,extra)=>{R.push((c?'PASS ':'FAIL ')+n+(c||!extra?'':'  -> '+extra))};
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// Static server that mimics VS Code Live Server: injects a <script> before the FIRST "</body>" it sees.
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f==='/')f='/index.html';const p=P.join(HOST,f);
 if(!p.startsWith(HOST)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);r.end('nf');return}
 let b=fs.readFileSync(p);const ext=P.extname(p);
 if(ext==='.html'){let t=b.toString('utf8');const i=t.indexOf('</body>');if(i>=0)t=t.slice(0,i)+'<!-- Code injected by live-server -->\n<script>\n\t// <![CDATA[  <-- For SVG support\n\tif ("WebSocket" in window) { (function(){ var x="live"; })(); }\n\t// ]]>\n</script>\n'+t.slice(i);b=Buffer.from(t)}
 r.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json'}[ext]||'application/octet-stream'});r.end(b)}).listen(0,'127.0.0.1',()=>res(s))})}

async function page(b,opts={}){const ctx=await b.createBrowserContext();const p=await ctx.newPage();await p.setViewport({width:opts.w||1440,height:opts.h||900,deviceScaleFactor:opts.dpr||1});
 const errs=[];p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
 p.on('requestfailed',q=>{const u=q.url();if(!/fonts\.(googleapis|gstatic)\.com/.test(u))errs.push('requestfailed: '+u)});
 p.on('response',r=>{if(r.status()>=400)errs.push('http '+r.status()+': '+r.url())});
 p.on('dialog',d=>d.accept());
 if(opts.init)await p.evaluateOnNewDocument(opts.init);
 if(opts.dark)await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);
 return {p,ctx,errs}}
const go=async(p,v)=>{await p.evaluate(v=>{location.hash=v},v);await wait(150)};
const txt=(p,s)=>p.$eval(s,n=>n.textContent).catch(()=>null);

(async()=>{
 const b=await puppeteer.launch({args:['--no-sandbox']});
 const srv=await serve();const URL_='http://127.0.0.1:'+srv.address().port+'/';

 // ---------- 1. Hosted copy behind Live-Server-style injection ----------
 {const {p,ctx,errs}=await page(b);await p.goto(URL_+'index.html',{waitUntil:'networkidle0'});await wait(300);
  ok('Live-Server injection: app still boots',(await txt(p,'#title'))==='Hub');
  ok('Live-Server injection: zero console errors',errs.length===0,errs.join(' | '));
  await ctx.close()}

 // ---------- 2. Main flows (hosted, plain) ----------
 const {p,ctx,errs}=await page(b);
 await p.goto(URL_+'index.html',{waitUntil:'networkidle0'});await wait(300);
 ok('Empty hub renders',(await txt(p,'#title'))==='Hub'&&!!(await p.$('.ring-card')));
 ok('Exactly one <h1>',(await p.$$eval('h1',n=>n.length))===1);
 for(const v of ['bank','resume','jobs','contacts','playbook','settings','hub']){await go(p,v);ok('view '+v+' renders',(await p.$eval('#view',n=>n.children.length))>0)}

 // Add application with salary text -> integer cents
 await go(p,'jobs');await p.click('#acts button[data-act=new]');await wait(150);
 ok('Dialog opens + first field focused',await p.evaluate(()=>document.querySelector('#dlg').open&&document.activeElement.name==='company'));
 await p.type('#db [name=company]','<img src=x onerror="window.__xss=1">Acme');await p.type('#db [name=role]','Designer');
 await p.type('#db [name=salaryMin]','70k');await p.type('#db [name=salaryMax]','85,000.50');
 await p.click('#db button.primary');await wait(250);
 const app=await p.evaluate(()=>S.applications[0]);
 ok('Salary stored as integer cents',app&&app.salaryMin===7000000&&app.salaryMax===8500050,JSON.stringify(app&&[app.salaryMin,app.salaryMax]));
 ok('E() escaping: no injected <img>, no script run',await p.evaluate(()=>!document.querySelector('#view img')&&!window.__xss));
 ok('Kanban shows formatted salary',/\$70K/.test(await p.$eval('.kcard',n=>n.textContent)));
 // keyboard open
 await p.focus('.kcard');await p.keyboard.press('Enter');await wait(150);
 ok('Kanban card opens with Enter key',await p.evaluate(()=>document.querySelector('#dlg').open&&/Edit/.test(document.querySelector('#dt').textContent)));
 ok('Edit form shows salary in plain units',(await p.$eval('#db [name=salaryMin]',n=>n.value))==='70000');
 await p.click('#db [data-act=dlgdel]');await wait(250);
 ok('Delete via data-act dlgdel',(await p.evaluate(()=>S.applications.length))===0);

 // Profile via SCH form + persistence through IndexedDB
 await go(p,'bank');await p.type('#profile [name=name]','Sam Rivera');await p.type('#profile [name=email]','sam@example.com');
 await p.click('#profile button.primary');await wait(300);
 await go(p,'settings');await p.select('#set [name=theme]','dark');await p.select('#set [name=accent]','emerald');await p.select('#set [name=currency]','EUR');
 await p.click('#set button.primary');await wait(300);
 await p.reload({waitUntil:'networkidle0'});await wait(400);
 const st=await p.evaluate(()=>({n:S.profile.name,t:document.documentElement.dataset.theme,a:document.documentElement.dataset.accent,c:S.settings.currency,v:S.version}));
 ok('Profile persists after reload (IndexedDB)',st.n==='Sam Rivera',JSON.stringify(st));
 ok('Theme/accent/currency persist',st.t==='dark'&&st.a==='emerald'&&st.c==='EUR',JSON.stringify(st));
 ok('Data saved at current version 4',st.v===4);

 // Backup export -> import roundtrip
 const dl=P.join(ROOT,'scratch','dl');fs.rmSync(dl,{recursive:true,force:true});fs.mkdirSync(dl,{recursive:true});
 const cdp=await p.createCDPSession();await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:dl});
 await go(p,'settings');await p.click('[data-act=export]');await wait(800);
 const files=fs.readdirSync(dl).filter(f=>f.endsWith('.json'));ok('Export backup downloads .json',files.length===1);
 if(files.length){await p.evaluate(()=>{S.profile.name='CHANGED';save();render()});await wait(200);
  const [fc]=await Promise.all([p.waitForFileChooser(),p.click('[data-act=import]')]);await fc.accept([P.join(dl,files[0])]);await wait(600);
  ok('Restore backup roundtrip',(await p.evaluate(()=>S.profile.name))==='Sam Rivera')}

 // Sample + all views + no errors
 await p.click('[data-act=sample]');await wait(300);
 ok('Sample loads',(await p.evaluate(()=>sampleMode&&S.applications.length===5)));
 for(const v of ['hub','bank','resume','jobs','contacts','playbook','settings']){await go(p,v);ok('sample view '+v+' renders',(await p.$eval('#view',n=>n.children.length))>0)}
 await go(p,'resume');await p.click('[data-act=tpl][data-id=executive]');await wait(150);
 ok('Resume template switch',!!(await p.$('#paper.tpl-executive')));
 await p.click('[data-act=dl-doc]');await wait(500);ok('DOC export downloads',fs.readdirSync(dl).some(f=>f.endsWith('.doc')));
 const doc=fs.readdirSync(dl).find(f=>f.endsWith('.doc'));if(doc){const d=fs.readFileSync(P.join(dl,doc),'utf8');ok('DOC export is valid html',/<\/body><\/html>$/.test(d.trim()))}
 ok('Main flow: zero console errors',errs.length===0,errs.join(' | '));

 // ---------- 3. Contrast audit (WCAG AA 4.5:1 text) light + dark x 5 accents ----------
 const contrast=await p.evaluate(async()=>{
  const lum=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return [.2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]),m[3]==null?1:m[3]]};
  const mix=(fg,bg)=>{const a=fg.match(/[\d.]+/g).map(Number),bb=bg.match(/[\d.]+/g).map(Number),al=a[3]==null?1:a[3];return 'rgb('+[0,1,2].map(i=>Math.round(a[i]*al+bb[i]*(1-al))).join(',')+')'};
  const bgOf=el=>{const stack=[];let n=el;while(n&&n.nodeType===1){const c=getComputedStyle(n).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))stack.push(c);n=n.parentElement}let base=getComputedStyle(document.body).backgroundColor;if(/rgba\(0, 0, 0, 0\)/.test(base))base='rgb(255,255,255)';return stack.reverse().reduce((acc,c)=>mix(c,acc),base)};
  const ratio=el=>{const bg=bgOf(el),fg=mix(getComputedStyle(el).color,bg);const a=lum(fg)[0],b=lum(bg)[0];return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  const out=[];location.hash='hub';await new Promise(r=>setTimeout(r,150));
  for(const th of ['light','dark'])for(const ac of ['indigo','emerald','amber','rose','slate']){S.settings.theme=th;S.settings.accent=ac;render();await new Promise(r=>setTimeout(r,30));
   for(const sel of ['.action-card h2','.action-card p','.action-card button.solid','.pill.ok','.pill.warn','.pill.bad','.pill.brand','.stat-sub','.hero-eyebrow','#acts button.primary,.empty button.primary,.row-actions button','nav a[aria-current]','small.muted']){const el=document.querySelector(sel);if(!el)continue;const r=ratio(el);if(r<4.5)out.push(th+'/'+ac+' '+sel+' '+r.toFixed(2))}}
  S.settings.theme='light';S.settings.accent='indigo';render();return out});
 ok('Contrast AA on key text (10 theme combos)',contrast.length===0,contrast.join(' | '));

 // ---------- 4. Screenshots (sample data, light + dark) ----------
 const shoot=async(v,name,th)=>{await p.evaluate((th)=>{S.settings.theme=th;S.settings.accent='indigo';bannerHidden=true;render()},th);await go(p,v);await p.evaluate(()=>scrollTo(0,0));await wait(250);await p.screenshot({path:P.join(SHOTS,name+'-'+th+'.png')})};
 await p.evaluate(()=>{S.profile.name='Jordan Lee'});
 for(const th of ['light','dark']){await shoot('hub','hub',th);await shoot('jobs','jobs',th);await shoot('resume','resume',th);await p.evaluate(()=>{bankTab='experiences'});await shoot('bank','bank',th);await shoot('contacts','contacts',th);await p.evaluate(()=>{document.querySelectorAll('details.pb')[3]&&(document.querySelectorAll('details.pb')[3].open=true)});await shoot('playbook','playbook',th);await shoot('settings','settings',th)}
 await p.evaluate(()=>{S.settings.theme='light';bannerHidden=true;render()});
 for(const ac of ['indigo','emerald','amber','rose','slate'])for(const th of ['light','dark']){await p.evaluate((ac,th)=>{S.settings.theme=th;S.settings.accent=ac;render()},ac,th);await go(p,'hub');await wait(120);await p.screenshot({path:P.join(SHOTS,'accent-'+ac+'-'+th+'.png')})}
 ok('Screenshots: zero console errors',errs.length===0,errs.join(' | '));
 await ctx.close();

 // ---------- 5. Mobile ----------
 {const {p,ctx,errs}=await page(b,{w:390,h:844,dpr:2});await p.goto(URL_+'index.html#settings',{waitUntil:'networkidle0'});await wait(200);
  await p.click('[data-act=sample]');await wait(200);await p.evaluate(()=>{bannerHidden=true;render()});
  for(const v of ['hub','jobs']){await go(p,v);await wait(150);await p.screenshot({path:P.join(SHOTS,'mobile-'+v+'-light.png')})}
  ok('Mobile: no horizontal overflow',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  ok('Mobile: zero console errors',errs.length===0,errs.join(' | '));await ctx.close()}

 // ---------- 6. OS dark default on first run ----------
 {const {p,ctx}=await page(b,{dark:true});await p.goto(URL_+'index.html',{waitUntil:'networkidle0'});await wait(200);
  ok('First run follows OS dark mode',(await p.evaluate(()=>document.documentElement.dataset.theme))==='dark');await ctx.close()}

 // ---------- 7. Migration v3 -> v4 (localStorage only, salary text -> cents) ----------
 {const v3={version:3,settings:{theme:'light',accent:'rose'},profile:{name:'Old User'},applications:[{id:'a1',company:'X',role:'Y',status:'Applied',salary:'$140k-$160k'},{id:'a2',company:'Z',role:'W',status:'Bogus',salary:'$150k + equity',notes:'n'}],contacts:[],badges:[]};
  const {p,ctx,errs}=await page(b,{init:`try{if(!sessionStorage.getItem('seeded')){localStorage.setItem('careerhub.v1',${JSON.stringify(JSON.stringify(v3))});sessionStorage.setItem('seeded','1')}}catch(e){}`});
  await p.goto(URL_+'index.html',{waitUntil:'networkidle0'});await wait(400);
  const m=await p.evaluate(()=>({v:S.version,a:S.applications.map(a=>[a.salaryMin,a.salaryMax,a.status,a.notes||'',('salary' in a)])}));
  ok('Migration: v3 salary text -> cents',m.v===4&&m.a[0][0]===14000000&&m.a[0][1]===16000000,JSON.stringify(m));
  ok('Migration: keeps non-numeric salary info in notes',/equity/.test(m.a[1][3])&&m.a[1][4]===false,JSON.stringify(m.a[1]));
  ok('Migration: invalid status normalised',m.a[1][2]==='Wishlist');
  ok('Migration: zero console errors',errs.length===0,errs.join(' | '));await ctx.close()}

 // ---------- 8. Storage fallback: IndexedDB blocked -> localStorage; both blocked -> memory ----------
 {const {p,ctx,errs}=await page(b,{init:`Object.defineProperty(window,'indexedDB',{get(){throw new Error('blocked')}})`});
  await p.goto(URL_+'index.html#bank',{waitUntil:'networkidle0'});await wait(300);
  await p.type('#profile [name=name]','LS Only');await p.click('#profile button.primary');await wait(200);
  await p.reload({waitUntil:'networkidle0'});await wait(300);
  ok('Fallback: IndexedDB blocked -> localStorage persists',(await p.evaluate(()=>S.profile.name))==='LS Only');
  ok('Fallback LS: zero console errors',errs.length===0,errs.join(' | '));await ctx.close()}
 {const {p,ctx,errs}=await page(b,{init:`Object.defineProperty(window,'indexedDB',{get(){throw new Error('blocked')}});Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})`});
  await p.goto(URL_+'index.html#bank',{waitUntil:'networkidle0'});await wait(300);
  await p.type('#profile [name=name]','Mem Only');await p.click('#profile button.primary');await wait(250);
  const r=await p.evaluate(()=>({m:memStore&&memStore.profile.name,t:document.querySelector('#toast').textContent}));
  ok('Fallback: both blocked -> memory + warning toast',r.m==='Mem Only'&&/backup/i.test(r.t),JSON.stringify(r));
  ok('Fallback mem: zero console errors',errs.length===0,errs.join(' | '));await ctx.close()}

 // ---------- 9. Sell copy via file:// ----------
 if(fs.existsSync(SELL)){const {p,ctx,errs}=await page(b);await p.goto('file://'+SELL,{waitUntil:'networkidle0'});await wait(300);
  ok('Sell copy (file://) boots',(await txt(p,'#title'))==='Hub');
  ok('Sell copy has no PWA/SW tags',!(await p.$('link[rel=manifest]')));
  ok('Sell copy: zero console errors',errs.length===0,errs.join(' | '));await ctx.close()}else ok('Sell copy exists (run build first)',false);

 await b.close();srv.close();
 console.log(R.join('\n'));const f=R.filter(x=>x.startsWith('FAIL')).length;console.log(`\n${R.length-f}/${R.length} passed`);process.exit(f?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
