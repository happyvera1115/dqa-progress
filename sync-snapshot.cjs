'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const X=require('./dist/vendor/xlsx.full.min.js'),C=require('./dist/core.js');
const W=require('./dist/workflow.js');
const runtime=path.join(__dirname,'.runtime');
const sourceUrl='https://advantecho365.sharepoint.com/:x:/r/sites/DQA841/_layouts/15/doc2.aspx?sourcedoc=%7B33fe652b-ccde-49b0-b660-81bf59a8a797%7D&action=edit';
function atomic(name,obj){fs.mkdirSync(runtime,{recursive:true});const target=path.join(runtime,name),tmp=target+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(obj));fs.renameSync(tmp,target);}
function fail(message){atomic('sync-status.json',{status:'error',checkedAt:new Date().toISOString(),message});}
function publish(file,after){
 const stat=fs.statSync(file);if(after&&(!Number.isFinite(Date.parse(after))||stat.mtimeMs<Date.parse(after)))throw Error('下載檔案早於本次擷取，不能視為最新來源。');
 const bytes=fs.readFileSync(file);if(bytes.length>30*1024*1024)throw Error('來源檔案超過 30 MB。');
 const book=X.read(bytes,{type:'buffer',cellHTML:false,cellFormula:false});const sheet='2.status_Parser_functionAuto';
 if(!book.Sheets[sheet])throw Error('找不到指定來源工作表。');
 const parsed=C.sourceRows(X,book.Sheets[sheet]);
 let previous=[];try{previous=JSON.parse(fs.readFileSync(path.join(runtime,'progress.json'),'utf8')).rows||[];}catch(error){if(error.code!=='ENOENT')throw Error('前次快照無法讀取，保留原有資料以免遺失改版紀錄。');}
 parsed.rows=W.trackReviewChanges(parsed.rows,previous,new Date().toISOString());
 const hash=crypto.createHash('sha256').update(JSON.stringify(parsed.rows)).digest('hex');
 const snapshot={...parsed,version:hash,checkedAt:new Date().toISOString(),downloadedAt:stat.mtime.toISOString(),name:path.basename(file).replace(/ \(\d+\)(?=\.xlsx$)/i,''),sheet,sourceUrl,intervalMinutes:30};
 atomic('progress.json',snapshot);atomic('sync-status.json',{status:'ok',checkedAt:snapshot.checkedAt,message:'SharePoint 擷取成功'});
 return {items:parsed.rows.length,excluded:parsed.skippedRows,checkedAt:snapshot.checkedAt,version:hash};
}
if(require.main===module){try{const [arg,after]=process.argv.slice(2);if(arg==='--error'){fail(after||'SharePoint 擷取失敗，顯示上次成功資料。');console.log('Sync failure recorded; previous snapshot preserved.');}else{if(!arg||!after)throw Error('Usage: node sync-snapshot.cjs <fresh-xlsx> <run-start-ISO>');console.log(JSON.stringify(publish(arg,after)));}}catch(e){fail(e.message);console.error(e.message);process.exitCode=1;}}
module.exports={publish};
