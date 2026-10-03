// node test/flows.js → end-to-end checks for CalmStudio Desk (file mode + hosted mode). Exit 1 on any failure.
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),P=require('path');
const ROOT=P.join(__dirname,'..','..'),APP=P.join(ROOT,'1-SELL-THIS','CalmStudio Desk.html'),HOST=P.join(ROOT,'2-HOST-ONLINE');
const R=[];const ok=(n,c)=>R.push((c?'PASS ':'FAIL ')+n);
(async()=>{
 const b=await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium')?{executablePath:'/opt/pw-browsers/chromium'}:{});
 const ctx=await b.newContext({viewport:{width:1280,height:860}}),p=await ctx.newPage();
 const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 p.on('dialog',d=>{errs.push('native dialog: '+d.message());d.dismiss()});
 await p.goto('file://'+APP);await p.waitForTimeout(400);
 const go=async v=>{await p.evaluate(v=>{location.hash=v},v);await p.waitForTimeout(120)};
 const saveDlg=async()=>{await p.click('#dlg button.gold');await p.waitForTimeout(120)};

 ok('Empty overview renders',await p.isVisible('text=Studio at a glance'));
 await go('settings');await p.click('text=Open sample workspace');await p.waitForTimeout(200);
 ok('Sample workspace loads',await p.isVisible('text=Sample workspace.'));
 for(const v of ['overview','calendar','tasks','projects','clients','invoices','events','time','tax','settings']){await go(v);ok('view '+v+' renders',(await p.$eval('#view',n=>n.children.length))>0)}

 // header links are styled (were browser-blue)
 await go('overview');
 ok('Header links use palette colour',await p.$eval('a.link',a=>getComputedStyle(a).color!=='rgb(0, 0, 238)'));

 // repeating task: tick schedules next, untick removes it
 await go('tasks');const before=await p.evaluate(()=>S.tasks.length);
 await p.locator('.row',{hasText:'Weekly invoicing review'}).first().locator('[data-act=toggle]').click();
 ok('Ticking a weekly task schedules the next one',await p.evaluate(()=>S.tasks.length)===before+1);
 await go('tasks');await p.click('[data-act=tf][data-id=all]');
 await p.locator('.row.done',{hasText:'Weekly invoicing review'}).first().locator('[data-act=toggle]').click();
 ok('Unticking removes the auto-scheduled copy',await p.evaluate(()=>S.tasks.length)===before);

 // payment → paid
 await go('invoices');await p.locator('.row',{hasText:'INV-002'}).locator('[data-act=pay]').click();await saveDlg();
 ok('Recording full payment marks invoice Paid',await p.locator('.row',{hasText:'INV-002'}).locator('.pill').innerText()==='Paid');

 // expense
 await go('tax');await p.click('#acts [data-act=edit]');await p.fill('#dlg [name=name]','Test Expense');await p.fill('#dlg [name=amount]','100');await saveDlg();
 ok('Expense saved',await p.isVisible('text=Test Expense'));

 // timer
 await go('time');await p.click('[data-act=start]');await p.waitForTimeout(1100);await p.click('[data-act=stop]');await p.waitForTimeout(100);
 ok('Timer logs an entry',await p.evaluate(()=>S.entries.length)===3);

 // palettes + theme
 for(const pal of ['jet','emerald','violet','rose','azure','gold']){await p.selectOption('#palSel',pal);ok('palette '+pal,await p.evaluate(()=>document.documentElement.dataset.palette)===pal)}
 await p.click('#acts [data-act=theme]');ok('Light theme',await p.evaluate(()=>document.documentElement.dataset.theme)==='light');
 await p.click('#acts [data-act=theme]');

 // date + recurrence maths
 const m=await p.evaluate(()=>({a:shift('2026-01-31',1,'m'),b:shift('2024-02-29',12,'m'),
   c:expandRec('2020-01-06','weekly','2026-09-01','2026-09-30').length,d:expandRec('2026-01-31','monthly','2026-04-01','2026-04-30')[0],
   e:expandRec('2026-09-10','none','2026-09-01','2026-09-30').length}));
 ok('Jan 31 + 1 month = Feb 28',m.a==='2026-02-28');ok('Leap day + 1 year = Feb 28',m.b==='2025-02-28');
 ok('Weekly event started years ago still expands',m.c===4||m.c===5);ok('Monthly on the 31st lands Apr 30',m.d==='2026-04-30');ok('One-off event in window',m.e===1);
 const up=await p.evaluate(()=>{S.events.push({id:'old',name:'Old weekly',date:shift(iso(),-400),recurrence:'weekly',type:'Call'});location.hash='events';return 1});
 await p.waitForTimeout(150);ok('Old repeating event appears under Upcoming',await p.locator('section.card',{hasText:'Upcoming'}).locator('text=Old weekly').count()>0);

 // hostile backup: ids with quotes must not inject markup
 await go('settings');await p.click('text=Back to my workspace').catch(()=>{});await p.waitForTimeout(100);
 const evil={settings:{currency:'USD',business:'<img src=x onerror=window.pwned=1>'},clients:[{id:'x" onmouseover="window.pwned=1',name:'<b>Evil</b>'}],
   projects:[{id:'p"><img src=x onerror=window.pwned=1>',name:'P',clientId:'x" onmouseover="window.pwned=1',budget:'abc'}],
   tasks:[{id:'t1',name:'<script>window.pwned=1</script>',projectId:'nope"',done:1}],invoices:[{id:'i1',number:' INV-9 ',amount:'5000',payments:[{amount:'1000'}],due:'2026-01-01',issued:'2026-01-01'}],events:[{id:'e1',name:'E',date:'2026-01-01',recurrence:'hourly'}]};
 fs.writeFileSync(P.join(__dirname,'_evil.json'),JSON.stringify(evil));
 await p.setInputFiles('#imp',P.join(__dirname,'_evil.json'));await p.waitForTimeout(150);await p.click('#cfy');await p.waitForTimeout(150);
 for(const v of ['overview','clients','projects','tasks','invoices','events','calendar'])await go(v);
 await p.mouse.move(300,300);await p.mouse.move(700,400);
 ok('Hostile backup cannot run script',!(await p.evaluate(()=>window.pwned)));
 ok('Hostile backup numbers normalised',await p.evaluate(()=>S.projects[0].budget===0&&S.invoices[0].amount===5000&&S.events[0].recurrence==='none'));
 fs.unlinkSync(P.join(__dirname,'_evil.json'));

 // persistence
 await p.reload();await p.waitForTimeout(400);
 ok('Workspace persists after reload',await p.evaluate(()=>S.invoices.length===1));
 ok('No console errors (file mode)',errs.length===0);if(errs.length)console.log(errs);

 // hosted mode
 const types={'.html':'text/html','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png'};
 const srv=http.createServer((q,r)=>{let f=P.join(HOST,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith(P.sep))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':types[P.extname(f)]||'text/plain'});r.end(d)})}).listen(8765);
 const q=await (await b.newContext()).newPage();const herr=[];q.on('pageerror',e=>herr.push(e.message));
 await q.goto('http://localhost:8765/');await q.waitForTimeout(400);
 ok('Hosted: manifest linked',await q.evaluate(()=>!!document.querySelector('link[rel=manifest]')));
 const man=await q.evaluate(()=>fetch('manifest.webmanifest').then(r=>r.json()).catch(()=>null));
 ok('Hosted: manifest valid with icons',!!(man&&man.icons&&man.icons.length===3));
 for(const ic of ['icon-180','icon-192','icon-512','icon-maskable-512'])ok('Hosted: '+ic+' served',await q.evaluate(u=>fetch(u).then(r=>r.ok),'icons/'+ic+'.png'));
 ok('Hosted: no page errors',herr.length===0);
 srv.close();await b.close();
 console.log(R.join('\n'));const f=R.filter(r=>r.startsWith('FAIL')).length;console.log(`\n${R.length-f}/${R.length} passed`);process.exit(f?1:0);
})().catch(e=>{console.log(R.join('\n'));console.error('CRASH',e);process.exit(1)});
