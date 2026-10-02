// node build.js "https://your-link" → hosted copy (+ PWA tags), tests, Start Here PDF.
const {execSync:x}=require('child_process'),fs=require('fs'),P=require('path'),R=P.join(__dirname,'..'),run=c=>x(c,{cwd:__dirname,stdio:'inherit'});
const PWA='<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/icon-180.png">\n<meta name="theme-color" content="#0a0907">\n<meta name="apple-mobile-web-app-title" content="CalmStudio">\n';
const SW='<script>if("serviceWorker"in navigator&&location.protocol==="https:")addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));</script>\n';
let h=fs.readFileSync(P.join(R,'1-SELL-THIS','CalmStudio Desk.html'),'utf8');
if(!h.includes('rel="manifest"'))h=h.replace('</title>\n','</title>\n'+PWA);
if(!h.includes('serviceWorker'))h=h.replace(/<\/body>(?![\s\S]*<\/body>)/,SW+'</body>');
fs.writeFileSync(P.join(R,'2-HOST-ONLINE','index.html'),h);console.log('✓ 2-HOST-ONLINE/index.html built (bump the cache name in sw.js when you ship a new version)');
run(`node guide/make-guide.js ${JSON.stringify(process.argv[2]||'')}`);console.log('✓ Build complete');
