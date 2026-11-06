const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../dist/core.js');
const headers=['Owner','Test Code','Test Item','Comment','自動化狀態','目前平台review狀態\n[連棟平台狀態]','Function Status','Parser status'];
test('finds a header after workbook title and blank rows',()=>{
 const result=C.detect([['DQA plan'],[],headers,['Ann','001','USB']]);
 assert.equal(result.row,2); assert.deepEqual(result.map,[0,1,2,3,4,5,6,7]);
});
test('rejects missing or duplicate column assignments',()=>{
 assert.throws(()=>C.extract([headers],0,[0,1,2,3,4,5,6,-1]),/欄位/);
 assert.throws(()=>C.extract([headers],0,[0,1,2,3,4,5,6,6]),/重複/);
});
test('keeps blank values, leading zero codes and unknown statuses; drops only empty rows',()=>{
 const rows=C.extract([headers,['Ann','001','USB','','新狀態','','Pass',''],[],['','002','LAN']],0,[0,1,2,3,4,5,6,7]);
 assert.equal(rows.length,2);assert.equal(rows[0].code,'001');assert.equal(rows[0].automation,'新狀態');assert.equal(rows[0].parser,'');assert.equal(rows[1].owner,'');
});
test('combines case-insensitive search with exact owner and missing status filters',()=>{
 const rows=[{owner:'Ann',code:'A01',item:'USB',comment:'待確認',parser:''},{owner:'Bob',code:'B02',item:'LAN',comment:'',parser:'Pass'}];
 assert.equal(C.filter(rows,{q:'usb',owner:'Ann',parser:'__blank'}).length,1);
 assert.equal(C.filter(rows,{q:'usb',owner:'Bob'}).length,0);
});
test('status distribution includes missing cells in denominator',()=>{
 assert.deepEqual(C.distribution([{parser:''},{parser:'Pass'},{parser:'Pass'}],'parser'),[['Pass',2],['未填寫',1]]);
});
test('status choices belong to selected field and reflect owner/search context',()=>{
 const data=[{owner:'Ann',item:'USB',automation:'完成',review:'待 Review',function:'Auto ready',parser:''},{owner:'Bob',item:'LAN',automation:'未開始',review:'通過',function:'Manual',parser:'Pass'}];
 assert.deepEqual(C.statusChoices(data,'review',{}),[['待 Review',1],['通過',1]]);
 assert.deepEqual(C.statusChoices(data,'function',{owner:'Ann'}),[['Auto ready',1]]);
 assert.deepEqual(C.statusChoices(data,'parser',{q:'USB'}),[['未填寫',1]]);
});
test('recognizes functionAuto header as Function column',()=>{
 assert.equal(C.detect([['Owner','Test Code','Test Item','Comment','自動化狀態','平台review狀態','functionAuto','Parser status']]).map[6],6);
});
