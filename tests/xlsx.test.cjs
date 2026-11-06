const {test}=require('node:test');const assert=require('node:assert/strict');const X=require('../dist/vendor/xlsx.full.min.js');const C=require('../dist/core.js');
test('round-trips a real XLSX with title rows, multiple sheets, formatted code, and literal HTML comment',()=>{
 const ws=X.utils.aoa_to_sheet([['測試計畫'],[],C.fields.map(f=>f[1]),['Ann',1,'USB','<img src=x onerror=alert(1)>','自訂','','Pass','']]);ws.B4.z='0000';const wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['說明']]),'Readme');X.utils.book_append_sheet(wb,ws,'Plan');const parsed=X.read(X.write(wb,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});const matrix=X.utils.sheet_to_json(parsed.Sheets.Plan,{header:1,defval:'',raw:false,blankrows:true});const d=C.detect(matrix),rows=C.extract(matrix,d.row,d.map);assert.equal(rows[0].code,'0001');assert.equal(rows[0].comment,'<img src=x onerror=alert(1)>');assert.equal(rows[0].review,'');assert.equal(parsed.SheetNames.length,2);
});
test('preserves actual row and column coordinates when used range begins at B3',()=>{
 const s=X.utils.aoa_to_sheet([C.fields.map(f=>f[1]),['Ann','001','USB','','完成','','Pass','']],{origin:'B3'});
 const matrix=C.sheetMatrix(X,s),d=C.detect(matrix);assert.equal(d.row,2);assert.deepEqual(d.map,[1,2,3,4,5,6,7,8]);assert.equal(C.extract(matrix,d.row,d.map)[0].sourceRow,4);
});
