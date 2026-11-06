const {test}=require('node:test');const assert=require('node:assert/strict');const X=require('../dist/vendor/xlsx.full.min.js');const C=require('../dist/core.js');
test('source projects only coded items and restores actual vertical merged cells',()=>{
 const sheet=X.utils.aoa_to_sheet([C.fields.map(f=>f[1]),['--','','Function Test'],['Ann','USB-001','USB A','shared comment','研發中','','Pass',''],['','', 'USB B','','','','',''],['','','No code note']]);
 sheet['!merges']=[{s:{r:2,c:1},e:{r:3,c:1}},{s:{r:2,c:3},e:{r:3,c:3}}];
 const result=C.sourceRows(X,sheet);assert.equal(result.rows.length,2);assert.equal(result.rows[1].code,'USB-001');assert.equal(result.rows[1].comment,'shared comment');assert.equal(result.rows[1].owner,'');assert.equal(result.skippedRows,2);
});
test('source refuses changed schema and empty data rather than publishing blank snapshot',()=>{
 assert.throws(()=>C.sourceRows(X,X.utils.aoa_to_sheet([['Test Code'],['001']])),/欄位/);
 assert.throws(()=>C.sourceRows(X,X.utils.aoa_to_sheet([C.fields.map(f=>f[1])])),/測項/);
});
