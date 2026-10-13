const fs=require('node:fs');
const css=fs.readFileSync('dist/style.css','utf8');
let html=fs.readFileSync('dist/index.html','utf8').replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>');
for(const file of ['core.js','batch.js','app.js'])html=html.replace('<script src="'+file+'"></script>','<script>'+fs.readFileSync('dist/'+file,'utf8')+'</script>');
html=html.replaceAll('href="guide.html"','href="Caption_Desk_Guide.html"');
fs.writeFileSync('index.html',html);
fs.writeFileSync('Caption_Desk_Guide.html',fs.readFileSync('dist/guide.html','utf8').replace('<link rel="stylesheet" href="style.css">','<style>'+css+'</style>'));
console.log('Built standalone app and guide.');
