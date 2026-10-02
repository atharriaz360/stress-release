const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script>(.*?)<\/script>/sg)];
fs.writeFileSync('test.js', scripts[1][1]);
