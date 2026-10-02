// node guide/make-guide.js "https://your-link" → 1-SELL-THIS/CalmStudio Desk-Start-Here.pdf (buyer's private link inside)
const {chromium}=require('playwright'),fs=require('fs'),P=require('path');const link=process.argv[2]||'';
if(link&&!/^https:\/\//.test(link)){console.error('Use the full https:// link');process.exit(1)}
(async()=>{let h=fs.readFileSync(P.join(__dirname,'start-here.html'),'utf8').replace(/{{LINK}}/g,link?`<a href="${link}">${link.replace(/^https:\/\//,'')}</a>`:'<span style="color:#e8c46a">[run make-guide.js with your link]</span>');
 const t=P.join(__dirname,'_r.html');fs.writeFileSync(t,h);const b=await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium')?{executablePath:'/opt/pw-browsers/chromium'}:{}),p=await b.newPage();
 await p.goto('file://'+t);await p.evaluate(()=>document.fonts.ready);const out=P.join(__dirname,'..','..','1-SELL-THIS','CalmStudio Desk-Start-Here.pdf');
 await p.pdf({path:out,format:'A4',printBackground:true});await b.close();fs.unlinkSync(t);console.log(link?'PDF ready: '+out:'PDF has a PLACEHOLDER link. Re-run with your https:// link before uploading.')})();
