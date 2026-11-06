(function(root){
 'use strict';
 const stages=['待 Review','開發中','待驗證','卡關','已完成','待評估','N/A'];
 const text=v=>String(v??'').trim(),low=v=>text(v).toLowerCase();
 function state(value,review=false){
  const v=low(value);if(!v||v==='--')return 'unknown';
  if(/^skip\b|略過|跳過|不討論/.test(v))return 'skip';
  if(/^(n\s*\/?\s*a)(?:$|[\s.\[])/i.test(v)||v==='不適用')return 'na';
  if(/\b(fail(?:ed)?|blocked|blocking)\b|卡關|阻塞|失敗/.test(v))return 'blocked';
  if(/評估|去留/.test(v))return 'assess';
  if(review&&(/未完成|尚未完成|未通過|not\s*(completed|done)|incomplete|待\s*review|等(?:待)?(?:平台)?\s*review/i.test(v)||revision(v).includes(',')))return 'waitReview';
  if(review&&/完成\s*review|review\s*(?:completed|passed)|^(pass|passed|done|完成|已完成|通過|已通過)$/i.test(v))return 'done';
  if(/wait(?:ing)?\s*(?:for\s*)?(?:platform\s*)?review|等(?:待)?(?:平台)?\s*review|待\s*review|平台\s*review中|reviewing/.test(v))return 'waitReview';
  if(/wait(?:ing)?\s*(?:for\s*)?function\s*auto|等(?:待)?\s*function\s*auto/.test(v))return 'waitFunction';
  if(review&&/review/.test(v))return 'waitReview';
  if(/recheck|to check|驗證中|待驗證|需.*確認|待.*確認|確認功能正確|功能已經完成/.test(v))return 'verify';
  if(/^(done|completed|complete|完成|已完成)$/i.test(v))return 'verify';
  if(/^(pass|passed|verified|驗證通過|已驗證|測試通過|通過|已通過|ok)$/i.test(v))return 'done';
  if(/not\s*start|planning|ongoing|in progress|開發中|研發中|進行中|未開始|未開發|尚未開始|排程/.test(v))return 'development';
  return 'unknown';
 }
 function route(row){
  const p=low(row.path),ambiguous=/\?|？|\bor\b|去留|討論/.test(p);
  const manual=/\bmanual\b|手動/.test(p),parser=/parser|paser/.test(p),func=/function\s*auto|functionauto/.test(p);
  return {label:p?text(row.path):'未指定流程',confirmed:!ambiguous&&(manual||parser||func),manual,parser,function:func,ambiguous};
 }
 function assess(row){
  const canonical=(key)=>{const raw=text(row[key]);if(row.standardStatusKeys?.includes(key)){if(raw==='已完成')return 'done';if(raw==='待平台 Review')return 'waitReview';if(raw==='待 FunctionAuto')return 'waitFunction';if(['待討論','已排程','待修改','待核定','審查中'].includes(raw))return key==='review'?'waitReview':'development';if(raw==='未填寫'||raw==='待確認')return 'unknown';}return state(raw,key==='review')};
  const r=route(row),a=state(row.automation),rv=canonical('review'),f=canonical('function'),p=canonical('parser'),warnings=[];
  const result={stage:'待評估',reason:'尚未確認適用流程與執行狀態',warnings,path:r.label,needsRevalidation:!!row.reviewChange?.pending};
  const required=[];
  if(r.confirmed){if(r.function)required.push(['FunctionAuto',f]);if(r.parser)required.push(['Parser',p]);}
  else {if(!['unknown','na'].includes(f))required.push(['FunctionAuto',f]);if(!['unknown','na'].includes(p))required.push(['Parser',p]);if(a!=='na'&&(a!=='assess'||required.some(([,s])=>!['unknown','na','assess'].includes(s))))warnings.push(r.ambiguous?'流程仍有候選方案，請在 Redmine 確認適用流程':'適用流程未指定，請確認 Manual／Parser／FunctionAuto');}
  if(rv==='done'&&(f==='waitReview'||p==='waitReview'))warnings.push('Review 已完成，但開發狀態仍等待 Review，請確認資料是否同步');
  if(rv==='waitReview'&&(/完成\s*review/i.test(text(row.review))||revision(row.review).includes(',')))warnings.push('Review 包含未完成／多版本結果，請確認全部適用平台狀態');
  if(row.identityAmbiguous)warnings.push('Test Code + Test Item 重複，改版歷史對應需人工確認');
  if(p==='waitFunction'&&f==='done')warnings.push('FunctionAuto 已通過，Parser 仍等待 FunctionAuto，請確認下一步');
  if(result.needsRevalidation)warnings.push(`Review 版本已變更，需再驗證（${row.reviewChange.from} → ${row.reviewChange.to}）`);
  if(a==='na'&&required.some(([,s])=>!['na','unknown'].includes(s)))warnings.push('整體標為 N/A，但仍有適用階段活動，請確認適用性');
  const unknownValues=[['自動化',row.automation,a],['Review',row.review,rv],['FunctionAuto',row.function,f],['Parser',row.parser,p]].filter(([,raw,s])=>text(raw)&&text(raw)!=='--'&&s==='unknown');
  unknownValues.forEach(([label])=>warnings.push(`${label} 有未辨識狀態，請確認判定`));
  const choose=(stage,reason)=>Object.assign(result,{stage,reason});
  if(a==='blocked'||required.some(([,s])=>s==='blocked')||rv==='blocked')return choose('卡關','有明確失敗／阻塞狀態，請由 Redmine 指派排除人員');
  if(a==='na')return choose('N/A','來源明確標示整體不適用；原始狀態保留');
  if(a==='assess'&&required.every(([,s])=>['assess','unknown','na'].includes(s)))return choose('待評估','先確認測項效益與去留；Review 批次編號不代表已開始執行');
  if(rv==='waitReview'||required.some(([,s])=>s==='waitReview')&&rv!=='done')return choose('待 Review','等待平台 Review；已完成的開發成果仍保留');
  if(result.needsRevalidation)return choose('待驗證','Review 已改版，等待對應新版本的驗證證據');
  if(required.some(([,s])=>s==='verify'||s==='waitReview'))return choose('待驗證','開發完成或狀態待確認，仍需驗證功能與流程');
  if(required.some(([,s])=>s==='waitFunction'))return choose('開發中','Parser 等待 FunctionAuto；兩者相依，不視為已完成');
  if(required.some(([,s])=>s==='development')||a==='development')return choose('開發中','適用階段正在規劃、尚未開工或開發中');
  if(a==='assess'||required.some(([,s])=>s==='assess'))return choose('待評估','等待確認效益、去留或適用方式');
  if(required.some(([,s])=>s==='skip'))return choose('待評估','適用階段標為 Skip，請在 Redmine 確認略過原因與適用範圍');
  const reviewOK=rv==='done'||rv==='na';
  const manualPassed=!r.manual||/^(verified|驗證通過|已驗證|測試通過)$/i.test(text(row.manualStatus||row.automation));
  const devPassed=required.every(([,s])=>s==='done'||s==='na');
  const hasEvidence=required.some(([,s])=>s==='done')||r.manual&&manualPassed;
  if(r.confirmed&&reviewOK&&devPassed&&manualPassed&&hasEvidence&&!warnings.length)return choose('已完成','適用階段已驗證通過，Review 也已通過／明確不適用');
  if(a==='done'||a==='verify'||required.some(([,s])=>s==='done')||r.manual&&reviewOK)return choose('待驗證',!reviewOK?'已有完成紀錄，但 Review 尚無通過證據':'尚缺適用階段的明確驗證證據');
  if(!warnings.length)warnings.push('資料不足，暫列待評估；空白不等於 N/A 或完成');
  return result;
 }
 function revision(v){const matches=[...text(v).matchAll(/review\s*#\s*(\d+)/ig)].map(m=>m[1]);return [...new Set(matches)].sort((a,b)=>Number(a)-Number(b)).join(',');}
 function trackReviewChanges(rows,previous=[],at){
  const key=r=>JSON.stringify([text(r.code),text(r.item)]),old=new Map(),counts=new Map();
  previous.forEach(r=>{const k=key(r);if(!old.has(k))old.set(k,[]);old.get(k).push(r)});rows.forEach(r=>counts.set(key(r),(counts.get(key(r))||0)+1));
  return rows.map(row=>{const copy={...row},candidates=old.get(key(row))||[],before=candidates[0];
   if(candidates.length>1||counts.get(key(row))!==1){copy.identityAmbiguous=true;const pending=candidates.find(r=>r.reviewChange?.pending);if(pending)copy.reviewChange={...pending.reviewChange};return copy;}
   if(!before)return copy;
   if(before.reviewChange)copy.reviewChange={...before.reviewChange};
   const from=revision(before.review),to=revision(row.review);
   if(from&&to&&from!==to)copy.reviewChange={from,to,changedAt:at,pending:true};
   if(copy.reviewChange&&text(row.verifiedReviewVersion)===to&&to)copy.reviewChange.pending=false;
   return copy;
  });
 }
 function ownerName(v){const n=text(v);if(!n||/^(--|n\/?a)$/i.test(n)||/評估|等待|priority|review|待指派/i.test(n))return '待指派';return n.split('/').map(s=>s.trim().replace(/^./,c=>c.toUpperCase())).join(' / ');}
 function issueLinks(value){const ids=[...new Set(text(value).match(/\b\d{4,9}\b/g)||[])];return ids.map(id=>({id,url:`http://advrm.advantech.com:3002/issues/${id}`}));}
 function flowStatus(row,key){
  const raw=text(row[key]),v=low(raw),st=state(raw,key==='review'),r=route(row);
  if(row.standardStatusKeys?.includes(key))return raw||'未填寫';
  if(/^skip\b|不討論|略過|跳過/.test(v))return '不討論';
  if(st==='na')return '不適用';
  if(key!=='review'&&st==='waitReview')return '待平台 Review';
  if(key==='parser'&&st==='waitFunction')return '待 FunctionAuto';
  if(key!=='review'&&r.confirmed&&!r[key])return '不適用';
  if(!raw||raw==='--')return '未填寫';
  if(st==='blocked')return '卡關';
  if(st==='assess')return '待評估';
  if(key==='review'){
   if(st==='done')return '已完成';
   if(/待核定|主管|manager|supervisor/.test(v))return '待核定';
   if(/待修改|owner.*(?:修改|修正)|等待.*修改|待修正|修訂中/.test(v))return '待修改';
   if(/已安排|scheduled|已排定|已排程|已規劃時間/.test(v))return '已排程';
   if(/討論|discussion|discuss/.test(v))return '待討論';
   if(/review\s*中|reviewing|審查中|審核中/.test(v))return '審查中';
   return '待確認';
  }
  if(row.reviewChange?.pending&&['done','verify'].includes(st))return '待驗證';
  if(st==='done')return '已完成';
  if(st==='verify')return '待驗證';
  if(/討論|discussion|discuss/.test(v))return '待討論';
  if(/已安排|scheduled|已排定|已排程|已規劃時間/.test(v))return '已排程';
  if(/in progress|ongoing|開發中|研發中|進行中/.test(v))return '開發中';
  if(st==='waitReview')return '待平台 Review';
  if(st==='waitFunction')return '待 FunctionAuto';
  return '待確認';
 }
 function flowNote(row,key){
  const status=flowStatus(row,key),raw=text(row[key])+' '+text(row.statusNotes?.[key]);
  if(!['待平台 Review','待 FunctionAuto'].includes(status))return '';
  const completed=/開發(?:已)?完成|功能(?:已經|已)?完成|(?:development|coding)\s*(?:is\s*)?(?:done|completed)/i.test(raw);
  const prerequisite=status==='待平台 Review'?'Review':'FunctionAuto';
  const passed=status==='待平台 Review'?state(row.review,true)==='done':state(row.function)==='done';
  if(passed)return '前置流程已有完成紀錄，請 Owner 確認下一步';
  return completed?`開發已完成，${prerequisite} 完成後待驗證`:`等待${prerequisite==='Review'?'平台 Review':' FunctionAuto'}完成；保留既有成果`;
 }
 const api={flowNote,flowStatus,stages,state,route,assess,revision,trackReviewChanges,ownerName,issueLinks};root.DQAWorkflow=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

