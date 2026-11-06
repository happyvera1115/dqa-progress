(function(root){
 'use strict';
 const fields=[['owner','Owner'],['code','Test Code'],['item','Test Item'],['comment','Comment'],['automation','自動化狀態'],['review','平台 Review'],['function','FunctionAuto'],['parser','Parser Status']];
 const norm=v=>String(v??'').toLowerCase().replace(/[\s\[\]［］()（）_\-]/g,'');
 const aliases=[['owner','負責人'],['testcode','測試代碼'],['testitem','測試項目'],['comment','comments','備註'],['自動化狀態','automationstatus','automation'],['目前平台review狀態連棟平台狀態','目前平台review狀態','平台review狀態','平台review','reviewstatus'],['functionstatus','functionauto','functionautostatus'],['parserstatus']];
 function detect(matrix){
  let best={row:0,map:fields.map(()=>-1)},score=-1;
  matrix.slice(0,100).forEach((row,i)=>{const map=aliases.map(names=>row.findIndex(v=>names.includes(norm(v))));[['平台Review標準狀態','平台Review狀態'],['FunctionAuto標準狀態','FunctionAuto狀態'],['Parser標準狀態','Parser狀態']].forEach((names,j)=>{const col=row.findIndex(v=>names.some(name=>norm(v)===norm(name)));if(col>=0)map[j+5]=col});const n=map.filter(v=>v>=0).length;if(n>score){score=n;best={row:i,map};}});return best;
 }
 function extract(matrix,header,map,optional=[]){
  if(map.length!==8||map.some((v,i)=>!Number.isInteger(v)||(v<0&&!optional.includes(i))))throw Error('請對應全部 8 個必要欄位。');
  if(new Set(map.filter(v=>v>=0)).size!==map.filter(v=>v>=0).length)throw Error('欄位對應重複，請為每個欄位選擇不同的來源欄。');
  return matrix.slice(header+1).map((r,i)=>{const o={sourceRow:header+i+2};fields.forEach(([k],j)=>o[k]=String(r[map[j]]??'').trim());return o;}).filter(r=>fields.some(([k])=>r[k]!==''));
 }
 function filter(rows,f){const q=(f.q||'').trim().toLowerCase();return rows.filter(r=>(!q||fields.some(([k])=>String(r[k]||'').toLowerCase().includes(q)))&&fields.every(([k])=>!f[k]||(f[k]==='__blank'? !r[k]:r[k]===f[k])));}
 function distribution(rows,key){const counts=new Map();rows.forEach(r=>{const v=r[key]||'未填寫';counts.set(v,(counts.get(v)||0)+1)});return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-Hant'));}
 function sheetMatrix(X,sheet){if(!sheet['!ref'])return [];const end=X.utils.decode_range(sheet['!ref']).e;return X.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:true,range:{s:{r:0,c:0},e:end}});}
 function statusChoices(rows,key,context){return distribution(filter(rows,{q:context.q,owner:context.owner}),key);}
 function sourceRows(X,sheet){
  const matrix=sheetMatrix(X,sheet),d=detect(matrix);
  for(const merge of sheet['!merges']||[]){
   if(merge.s.r<=d.row||merge.s.c!==merge.e.c||!d.map.includes(merge.s.c))continue;
   const value=matrix[merge.s.r]?.[merge.s.c]??'';
   for(let r=merge.s.r+1;r<=merge.e.r;r++){matrix[r]??=[];matrix[r][merge.s.c]=value;}
  }
  const standardHeaders=['平台Review狀態','FunctionAuto狀態','Parser標準狀態'];
  const hasStandard=standardHeaders.every((name,j)=>norm(matrix[d.row]?.[d.map[j+5]])===norm(name)||norm(matrix[d.row]?.[d.map[j+5]])===norm(['平台Review標準狀態','FunctionAuto標準狀態','Parser標準狀態'][j]));
  const all=extract(matrix,d.row,d.map,hasStandard?[3]:[]),rows=all.filter(r=>r.code&&r.code!=='--');
  const headers=matrix[d.row]||[],pathColumn=headers.findIndex(h=>['parser/manual/functionauto','適用流程','流程'].includes(norm(h))),issueColumn=headers.findIndex(h=>['redmineid#','redmineid','redmine工單'].includes(norm(h)));
  for(const row of rows){const raw=matrix[row.sourceRow-1]||[];if(pathColumn>=0)row.path=String(raw[pathColumn]??'').trim();if(issueColumn>=0)row.redmineId=String(raw[issueColumn]??'').trim();row.standardStatusKeys=['review','function','parser'].filter((key,j)=>[['平台Review標準狀態','平台Review狀態'],['FunctionAuto標準狀態','FunctionAuto狀態'],['Parser標準狀態','Parser狀態']][j].some(name=>norm(headers[d.map[j+5]])===norm(name)));row.statusNotes={};for(const [key,label] of [['review','Note for 平台review'],['function','Note for FunctionAuto Status'],['parser','Note for Parser status']]){const col=headers.findIndex(h=>norm(h)===norm(label));if(col>=0)row.statusNotes[key]=String(raw[col]??'').trim();}}
  if(!rows.length)throw Error('找不到有 Test Code 的測項，保留原有資料。');
  return {rows,skippedRows:all.length-rows.length,headerRow:d.row+1};
 }
 const api={fields,norm,detect,extract,filter,distribution,sheetMatrix,statusChoices,sourceRows};if(typeof module!=='undefined')module.exports=api;root.DQA=api;
})(typeof globalThis!=='undefined'?globalThis:this);
