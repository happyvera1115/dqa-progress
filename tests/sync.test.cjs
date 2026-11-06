const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const X=require('../dist/vendor/xlsx.full.min.js'),C=require('../dist/core.js');
test('CLI rejects stale downloads and preserves last successful snapshot on failure',t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dqa-sync-test-'));
 t.after(()=>{const resolved=path.resolve(temp);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('dqa-sync-test-'))throw Error('Invalid cleanup target');fs.rmSync(resolved,{recursive:true,force:true});});
 fs.mkdirSync(path.join(temp,'dist','vendor'),{recursive:true});
 for(const file of ['sync-snapshot.cjs','dist/core.js','dist/workflow.js','dist/vendor/xlsx.full.min.js'])fs.copyFileSync(path.join(__dirname,'..',file),path.join(temp,file));
 const book=X.utils.book_new();X.utils.book_append_sheet(book,X.utils.aoa_to_sheet([C.fields.map(f=>f[1]),['Ann','001','USB','','完成','','Pass','']]),'2.status_Parser_functionAuto');
 const file=path.join(temp,'fresh.xlsx');fs.writeFileSync(file,X.write(book,{type:'buffer',bookType:'xlsx'}));
 const run=(...args)=>spawnSync(process.execPath,[path.join(temp,'sync-snapshot.cjs'),...args],{encoding:'utf8'});
 assert.equal(run(file,'2000-01-01T00:00:00Z').status,0);
 const snapshot=path.join(temp,'.runtime','progress.json'),before=fs.readFileSync(snapshot,'utf8');
 assert.equal(JSON.parse(before).rows.length,1);
 assert.equal(run(file,'2099-01-01T00:00:00Z').status,1);
 assert.equal(fs.readFileSync(snapshot,'utf8'),before);
 assert.equal(JSON.parse(fs.readFileSync(path.join(temp,'.runtime','sync-status.json'),'utf8')).status,'error');
});
