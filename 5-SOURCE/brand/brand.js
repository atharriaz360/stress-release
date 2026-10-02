// node brand/brand.js → icons (2-HOST-ONLINE/icons), logos + tokens (4-BRAND). Noir & Gold — matches the app's BRAND_SVG.
const {chromium}=require('playwright'),fs=require('fs'),P=require('path');const R=P.join(__dirname,'..','..'),B=P.join(R,'4-BRAND'),H=P.join(R,'2-HOST-ONLINE','icons');
const T={noir:'#0a0907',panel:'#14120e',raise:'#1d1a14',ivory:'#f4ecdc',muted:'#a1957f',gold:'#d4af6a',gold2:'#f1e0b5',goldDeep:'#a67c2e',paper:'#f6f1e6',paperPanel:'#fffcf5',ink:'#1b1710',ok:'#7bae96',warn:'#d4b06a',bad:'#e08a80'};
// Same geometry as the in-app mark (32-unit grid): noir tile, gold horizon line, gold point.
const mark=(m)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" ${m?'':'rx="9"'} fill="${T.noir}"/><g ${m?'transform="translate(3.2 3.2) scale(.8)"':''}><path d="M7 16h18" stroke="${T.gold}" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="16" r="3" fill="${T.gold}"/></g></svg>`;
const font=`@font-face{font-family:F;font-weight:100 900;src:url(file://${require.resolve('@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2')})}`;
const logo=(c)=>`<style>${font}*{margin:0}body{display:inline-flex;align-items:center;gap:30px;padding:25px}svg{width:140px;height:140px}b{font:500 104px/1 F;letter-spacing:-3px;color:${c};white-space:nowrap}</style>${mark()}<b>CalmStudio Desk</b>`;
(async()=>{[B,H].forEach(d=>fs.mkdirSync(d,{recursive:true}));const b=await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium')?{executablePath:'/opt/pw-browsers/chromium'}:{}),p=await b.newPage();
 const shot=async(html,w,h,f,bg)=>{await p.setViewportSize({width:w,height:h});const tf=P.join(__dirname,'_b.html');fs.writeFileSync(tf,'<!doctype html><meta charset=utf-8>'+html);await p.goto('file://'+tf);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:f,omitBackground:!bg,clip:{x:0,y:0,width:w,height:h}})};
 const svg=(m,s)=>`<style>*{margin:0}svg{display:block;width:${s}px;height:${s}px}</style>${mark(m)}`;
 for(const[n,s,m]of[['icon-180',180,1],['icon-192',192,0],['icon-512',512,0],['icon-maskable-512',512,1]])await shot(svg(m,s),s,s,P.join(H,n+'.png'));
 await shot(svg(0,1024),1024,1024,P.join(B,'calmstudio-icon-1024.png'));await shot(svg(0,512),512,512,P.join(B,'calmstudio-icon-512.png'));
 await shot(logo(T.ink),1060,190,P.join(B,'calmstudio-logo-dark-text.png'));await shot(logo(T.gold2),1060,190,P.join(B,'calmstudio-logo-light-text.png'));
 fs.writeFileSync(P.join(B,'calmstudio-icon.svg'),mark());fs.writeFileSync(P.join(B,'calmstudio-icon-maskable.svg'),mark(1));
 fs.writeFileSync(P.join(B,'color-tokens.css'),':root{'+Object.entries(T).map(([k,v])=>`--cs-${k}:${v}`).join(';')+'}\n/* Noir & Gold. Headings: Fraunces (app falls back to Iowan/Palatino/Georgia). Body: Inter / system sans. */\n');
 fs.writeFileSync(P.join(B,'color-tokens.json'),JSON.stringify(T,null,1));fs.rmSync(P.join(__dirname,'_b.html'),{force:true});await b.close();console.log('brand ok')})();
