const {test}=require('node:test'),assert=require('node:assert/strict');const W=require('../dist/workflow.js');
test('development finished is still waiting for review or verification',()=>{
 assert.equal(W.assess({path:'function auto',automation:'完成',review:'Review#2',function:'功能已經完成=>需確認功能正確'}).stage,'待 Review');
 assert.equal(W.assess({path:'function auto',review:'[完成Review] Review#2',function:'功能已經完成=>需確認功能正確'}).stage,'待驗證');
});
test('manual does not require parser and FunctionAuto, but does require validation',()=>{
 assert.equal(W.assess({path:'manual',automation:'驗證通過',review:'通過'}).stage,'已完成');
 assert.equal(W.assess({path:'manual',automation:'完成',review:'通過'}).stage,'待驗證');
});
test('independent parser path can finish without FunctionAuto',()=>{
 assert.equal(W.assess({path:'parser',review:'通過',parser:'Pass'}).stage,'已完成');
 assert.equal(W.assess({path:'function auto and parser',review:'通過',function:'Pass',parser:'not start yet'}).stage,'開發中');
});
test('review complete with parser waiting review is flagged without overwriting raw status',()=>{
 const row={path:'parser',review:'[完成Review] Review#1',parser:'wait review finish'};const a=W.assess(row);
 assert.equal(a.stage,'待驗證');assert.ok(a.warnings.some(w=>w.includes('Review')));assert.equal(row.parser,'wait review finish');
});
test('assessment, NA and real blockers remain distinct',()=>{
 assert.equal(W.assess({automation:'等待評估效益'}).stage,'待評估');
 assert.equal(W.assess({automation:'N/A'}).stage,'N/A');
 assert.equal(W.assess({path:'parser',parser:'Fail'}).stage,'卡關');
 assert.notEqual(W.assess({path:'function auto',function:'N/A[by x86uni log]'}).stage,'N/A');
});
test('evaluation backlog is not promoted to pending review solely by assigned review batch',()=>{
 assert.equal(W.assess({automation:'等待評估效益',review:'Review#5'}).stage,'待評估');
});
test('ambiguous or unknown paths cannot silently become completed',()=>{
 const a=W.assess({path:'function auto or parser',review:'通過',parser:'Pass',function:'Pass'});assert.notEqual(a.stage,'已完成');assert.ok(a.warnings.length);
 const b=W.assess({automation:'奇怪新狀態'});assert.equal(b.stage,'待評估');assert.ok(b.warnings.length);
});
test('review revision changes persist pending validation, matching code plus item',()=>{
 const old=[{code:'A',item:'one',review:'[完成Review] Review#1',parser:'Pass'},{code:'A',item:'two',review:'Review#4'}];
 const updated=W.trackReviewChanges([{code:'A',item:'one',review:'Review#2',parser:'Pass'},{code:'A',item:'two',review:'Review#4'}],old,'2026-11-03T09:00:00Z');
 assert.equal(updated[0].reviewChange.pending,true);assert.equal(updated[1].reviewChange,undefined);
 const again=W.trackReviewChanges(updated,updated,'2026-11-03T09:30:00Z');assert.equal(again[0].reviewChange.pending,true);assert.equal(W.assess({...again[0],path:'parser'}).needsRevalidation,true);
});
test('finishing same review revision does not invent a revision change',()=>{
 const r=W.trackReviewChanges([{code:'A',item:'one',review:'[完成Review] Review#1'}],[{code:'A',item:'one',review:'Review#1'}],'now');assert.equal(r[0].reviewChange,undefined);
});
test('only validated person names appear as owners; issue URLs use numeric IDs',()=>{
 assert.equal(W.ownerName('等待評估效益'),'待指派');assert.equal(W.ownerName('priority low_wait 評估效益'),'待指派');assert.equal(W.ownerName('bruce'),'Bruce');
 assert.deepEqual(W.issueLinks('#146926\n#146920').map(x=>x.id),['146926','146920']);assert.deepEqual(W.issueLinks('javascript:alert(1)'),[]);
});
test('generic FunctionAuto completion is not validation evidence',()=>{
 assert.equal(W.assess({path:'function auto',review:'通過',function:'完成'}).stage,'待驗證');
});
test('unfinished or mixed platform review cannot be treated as passed',()=>{
 for(const review of ['[未完成Review] Review#2','[完成Review] Review#1 / 待 Review#2'])assert.notEqual(W.assess({path:'parser',review,parser:'Pass'}).stage,'已完成');
 assert.ok(W.assess({path:'parser',review:'[完成Review] Review#1 / 待 Review#2',parser:'Pass'}).warnings.length);
});
test('duplicate identities never discard pending revalidation',()=>{
 const prior={code:'A',item:'USB',path:'parser',review:'[完成Review] Review#2',parser:'Pass',reviewChange:{from:'1',to:'2',pending:true,changedAt:'yesterday'}};
 const raw={...prior};delete raw.reviewChange;
 for(const previous of [[prior],[prior,{...prior}]]){
  const next=W.trackReviewChanges([raw,{...raw}],previous,'today');
  assert.ok(next.every(r=>r.reviewChange?.pending));assert.ok(next.every(r=>W.assess(r).stage!=='已完成'));
 }
});
test('known pending-review text and legitimate assessment/NA do not create spurious warnings',()=>{
 assert.equal(W.assess({path:'parser',automation:'平台review中',review:'Review#2',parser:'wait review finish'}).warnings.length,0);
 assert.equal(W.assess({automation:'等待評估效益',review:'Review#5'}).warnings.length,0);
 assert.equal(W.assess({automation:'N/A',review:'N/A'}).warnings.length,0);
});
