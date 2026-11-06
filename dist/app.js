'use strict';
const $=id=>document.getElementById(id), C=window.DQA, W=window.DQAWorkflow;
let overallStage='',attentionOnly=false,revalidationOnly=false,flowKey='',flowValue='';
const tableFields=[...C.fields.slice(0,3),['next','下一步／卡點'],['redmine','Redmine'],...C.fields.slice(3).filter(([key])=>!['automation','comment'].includes(key))];
let rows=[],book=null,matrix=[],fileName='',source=null,page=1,sortKey='',sortDir=1;
const statusKeys=['automation','review','function','parser'];
const statusNames=['自動化狀態','平台 Review','FunctionAuto','Parser Status'];
const colors={green:'#5b9c84',blue:'#7ca5bf',amber:'#d5ae61',red:'#cd8a82',gray:'#c4ced2'};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function tone(value){const v=String(value).trim().toLowerCase();if(['done','pass','passed','completed','complete','完成','已完成','已通過','通過','ready','ok'].includes(v))return 'green';if(['in progress','ongoing','進行中','開發中','reviewing','review中'].includes(v))return 'blue';if(['pending','待確認','待review','待 review','待審核','待處理','not started','未開始','todo'].includes(v))return 'amber';if(['fail','failed','blocked','異常','卡關','失敗','阻塞'].includes(v))return 'red';return 'gray'}
function badge(value){return el('span','badge '+tone(value),value||'未填寫')}
function message(text,error=false){$('message').replaceChildren();if(text)$('message').append(el('div','notice'+(error?' error':''),text))}
function option(value,text){const n=el('option','',text);n.value=value;return n}
function fillFilter(id,key,all){const select=$(id),old=select.value;select.replaceChildren(option('',all));const values=[...new Set(rows.map(r=>r[key]))].sort((a,b)=>a.localeCompare(b,'zh-Hant',{numeric:true}));for(const v of values)select.append(option(v||'__blank',v||'未填寫'));select.value=[...select.options].some(o=>o.value===old)?old:''}
function reset(){ flowKey='';flowValue='';overallStage='';attentionOnly=false;revalidationOnly=false;$('search').value='';$('ownerFilter').value='';$('statusFilter').value='';page=1;render() }
function baseRows(){const f={q:$('search').value,owner:$('ownerFilter').value};f[$('statusField').value]=$('statusFilter').value;return C.filter(rows,f)}
function needsAttention(r){return r.assessment.warnings.length>0||['review','function','parser'].some(key=>W.flowStatus(r,key)==='待確認')}
function current(){return baseRows().filter(r=>(!flowKey||W.flowStatus(r,flowKey)===flowValue)&&(!overallStage||r.assessment.stage===overallStage)&&(!attentionOnly||needsAttention(r))&&(!revalidationOnly||r.assessment.needsRevalidation))}
function linksFor(r){return W.issueLinks(r.redmineId||'')}
function appendIssues(container,r){const links=linksFor(r);if(!links.length){container.append(el('span','muted','未關聯工單'));return}for(const issue of links){const a=el('a','issue-link','#'+issue.id);a.href=issue.url;a.target='_blank';a.rel='noopener';container.append(a)}}
function sortValue(row,key){return key==='overall'?row.assessment.stage:key==='next'?row.assessment.reason:key==='redmine'?row.redmineId||'':String(row[key]||'')}
function renderStatusChoices(){
 const key=$('statusField').value, selected=$('statusFilter').value;
 const choices=C.statusChoices(rows,key,{q:$('search').value,owner:$('ownerFilter').value});
 const total=choices.reduce((n,p)=>n+p[1],0);
 $('statusFilter').replaceChildren(option('','全部狀態'));
 choices.forEach(([value,count])=>$('statusFilter').append(option(value==='未填寫'?'__blank':value,`${value}（${count}）`)));
 $('statusFilter').value=[...$('statusFilter').options].some(o=>o.value===selected)?selected:'';

}
function selectStatusField(key){$('statusField').value=key;$('statusFilter').value='';page=1;render()}
const piePalette={'待討論':'#7695bd','已排程':'#437fc0','審查中':'#64b5cf','待修改':'#d99270','待核定':'#b1a0d4','開發中':'#55aab0','待驗證':'#d5b064','已完成':'#72b899','待平台 Review':'#8caddc','待 FunctionAuto':'#b49bc7','不討論':'#5c687a','不適用':'#5c687a','--':'#39485e','未填寫':'#39485e','卡關':'#e07c7c'};
function selectFlow(key,value){if(flowKey===key&&flowValue===value){flowKey='';flowValue=''}else{flowKey=key;flowValue=value}page=1;render()}
function pieChart(key,title,counts,choices){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','-65 -35 370 310');svg.setAttribute('class','status-pie');svg.setAttribute('role','group');svg.setAttribute('aria-label',title+' 狀態分布，點選扇形篩選');
 const total=[...counts.values()].reduce((a,b)=>a+b,0),annotations=[];let start=-Math.PI/2;
 choices.filter(v=>(counts.get(v)||0)>0).forEach(value=>{const n=counts.get(value),angle=n/total*Math.PI*2,end=start+angle,path=document.createElementNS(ns,n===total?'circle':'path');
 if(n===total){path.setAttribute('cx','120');path.setAttribute('cy','120');path.setAttribute('r','105')}else{const x=a=>120+105*Math.cos(a),y=a=>120+105*Math.sin(a);path.setAttribute('d',`M120 120 L${x(start)} ${y(start)} A105 105 0 ${angle>Math.PI?1:0} 1 ${x(end)} ${y(end)} Z`)}
 path.setAttribute('fill',piePalette[value]||'#97a5b8');path.setAttribute('class','pie-slice'+(flowKey===key&&flowValue===value?' selected':''));path.setAttribute('role','button');path.setAttribute('tabindex','0');path.setAttribute('aria-pressed',String(flowKey===key&&flowValue===value));const label=`${value}：${n} 項（${Math.round(n/total*100)}%）`;path.setAttribute('aria-label',label);path.dataset.status=value;const tip=document.createElementNS(ns,'title');tip.textContent=label;path.append(tip);path.addEventListener('click',()=>selectFlow(key,value));path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectFlow(key,value)}});svg.append(path);annotations.push({value,n,mid:start+angle/2,small:n/total<0.085});start=end;
 });
 const small=annotations.filter(a=>a.small);
 [-1,1].forEach(side=>{const group=small.filter(a=>(Math.cos(a.mid)<0?-1:1)===side).sort((a,b)=>Math.sin(a.mid)-Math.sin(b.mid));group.forEach((a,i)=>{a.y=Math.max(5,Math.min(235,120+115*Math.sin(a.mid)));if(i)a.y=Math.max(a.y,group[i-1].y+32)});if(group.length&&group.at(-1).y>235){const shift=group.at(-1).y-235;group.forEach(a=>a.y-=shift)}});
 annotations.forEach(a=>{const g=document.createElementNS(ns,'g');g.setAttribute('class','pie-annotation');g.addEventListener('click',()=>selectFlow(key,a.value));let x=120+67*Math.cos(a.mid),y=120+67*Math.sin(a.mid);if(a.small){const side=Math.cos(a.mid)<0?-1:1;x=120+side*119;y=a.y;const line=document.createElementNS(ns,'polyline');line.setAttribute('points',`${120+100*Math.cos(a.mid)},${120+100*Math.sin(a.mid)} ${120+110*Math.cos(a.mid)},${y} ${x},${y}`);line.setAttribute('class','pie-leader');g.append(line)}const t=document.createElementNS(ns,'text');t.setAttribute('x',x);t.setAttribute('y',y-3);t.setAttribute('text-anchor',a.small?(x<120?'end':'start'):'middle');t.setAttribute('class',a.small?'pie-label outside':'pie-label');const name=document.createElementNS(ns,'tspan');name.setAttribute('x',x);name.textContent=a.value;const pct=document.createElementNS(ns,'tspan');pct.setAttribute('x',x);pct.setAttribute('dy','15');pct.textContent=`${Math.round(a.n/total*100)}%`;t.append(name,pct);g.append(t);svg.append(g)});
 if(!total){const c=document.createElementNS(ns,'circle');c.setAttribute('cx','120');c.setAttribute('cy','120');c.setAttribute('r','105');c.setAttribute('fill','#253448');svg.append(c)}return svg;
}
function render(){
 renderStatusChoices();
 const filtered=current();if(sortKey)filtered.sort((a,b)=>sortValue(a,sortKey).localeCompare(sortValue(b,sortKey),'zh-Hant',{numeric:true})*sortDir);
 const size=Math.max(1,filtered.length),pages=1;page=1;
 $('rowCount').textContent=filtered.length.toLocaleString();$('statusCards').replaceChildren();
 const base=baseRows();
 const definitions=[['review','平台 Review',['待討論','已排程','審查中','待修改','待核定','已完成','不討論']],['function','FunctionAuto',['待討論','待平台 Review','已排程','開發中','待驗證','已完成','不討論']],['parser','Parser',['待討論','待平台 Review','待 FunctionAuto','已排程','開發中','待驗證','已完成','不討論']]];
 definitions.forEach(([key,title,labels])=>{
  const card=el('article','flow-card'),counts=new Map();base.forEach(r=>{const value=W.flowStatus(r,key);counts.set(value,(counts.get(value)||0)+1)});
  const head=el('div','flow-heading');head.append(el('h3','',title),el('span','',`共 ${base.length} 個測項`));card.append(head);
  const extras=['待平台 Review','待 FunctionAuto','卡關','待評估','未填寫','待確認'];
  const choices=[...new Set([...labels,...extras,...counts.keys(),'不適用'])];
  card.append(pieChart(key,title,counts,choices));
  if(!base.length)card.append(el('p','muted','目前沒有符合條件的測項'));$('statusCards').append(card);
 });
 $('tableHead').replaceChildren();tableFields.forEach(([key,label])=>{const th=el('th');th.scope='col';th.setAttribute('aria-sort',sortKey===key?(sortDir===1?'ascending':'descending'):'none');const b=el('button','',label);b.append(el('span','',sortKey===key?(sortDir===1?'↑':'↓'):'↕'));b.addEventListener('click',()=>{sortDir=sortKey===key?-sortDir:1;sortKey=key;render()});th.append(b);$('tableHead').append(th)});
 $('tableBody').replaceChildren();filtered.forEach(r=>{const tr=el('tr');tableFields.forEach(([key])=>{const td=el('td');if(key==='overall'){td.append(el('span','overall-badge',r.assessment.stage));if(needsAttention(r))td.append(el('span','attention-tag','待確認'));if(r.assessment.needsRevalidation)td.append(el('span','attention-tag','需再驗證'));}else if(key==='next'){const b=el('button','comment-button',r.assessment.reason);b.title='查看判定依據與相依問題';b.addEventListener('click',()=>detail(r));td.append(b)}else if(key==='redmine'){appendIssues(td,r)}else if(key==='owner'){const owner=el('div','owner');owner.append(el('span','avatar',r.owner?r.owner.slice(0,2).toUpperCase():'—'),document.createTextNode(r.owner||'未填寫'));td.append(owner)}else if(key==='code'){const b=el('button','code-button',r.code||'查看明細');b.addEventListener('click',()=>detail(r));td.append(b)}else if(key==='comment'){if(r.comment){const b=el('button','comment-button',r.comment);b.title='查看完整 Comment';b.addEventListener('click',()=>detail(r));td.append(b)}else td.append(el('span','muted','未填寫'))}else if(statusKeys.includes(key)){td.append(badge(r[key]));if(r.statusNotes?.[key])td.append(el('small','dependency-note',r.statusNotes[key]));if(['function','parser'].includes(key)&&W.flowNote(r,key)){td.append(el('span','dependency-state',W.flowStatus(r,key)),el('small','dependency-note',W.flowNote(r,key)))}}else td.textContent=r[key]||'未填寫';tr.append(td)});$('tableBody').append(tr)});
 const empty=$('empty');empty.hidden=filtered.length>0;if(!empty.hidden){empty.querySelector('h3').textContent=rows.length?'沒有符合條件的項目':'從一份 Excel 開始';empty.querySelector('p').textContent=rows.length?'試著調整搜尋文字，或重設篩選。':'匯入測試計畫，查看各項狀態與負責人。';$('emptyImport').hidden=rows.length>0}
 $('range').textContent=filtered.length?`顯示 ${(page-1)*size+1}–${Math.min(page*size,filtered.length)}，共 ${filtered.length.toLocaleString()} 項`:'共 0 項';$('pageLabel').textContent=`${page} / ${pages}`;$('prev').disabled=page<=1;$('next').disabled=page>=pages;

}
function detail(r){$('detailTitle').textContent=r.code||'項目明細';const d=$('detailContent');d.replaceChildren();
 for(const [label,value] of [['整體進度',r.assessment.stage],['判定依據／下一步',r.assessment.reason],['適用流程',r.assessment.path],['待確認事項',r.assessment.warnings.join('\n')||'無'],['主責 Owner（暫用 SharePoint）',r.owner],['Owner 原文',r.ownerRaw||'未填寫']])d.append(el('dt','',label),el('dd','',value));
 for(const key of ['review','function','parser'])if(r.statusNotes?.[key])d.append(el('dt','',`${key} 補充說明`),el('dd','',r.statusNotes[key]));
 for(const key of ['function','parser'])if(W.flowNote(r,key))d.append(el('dt','',`${key==='function'?'FunctionAuto':'Parser'} · ${W.flowStatus(r,key)}`),el('dd','',W.flowNote(r,key)));
 const tickets=el('dd');appendIssues(tickets,r);d.append(el('dt','','Redmine：負責人、子任務、討論與驗證證據'),tickets,el('dd','muted','尚未直接同步 Redmine 指派者，請開啟工單核對。'));
 for(const [k,label] of C.fields)d.append(el('dt','',label+'（原始）'),el('dd','',k==='owner'?r.ownerRaw||'未填寫':r[k]||'未填寫'));
 if(r.reviewChange)d.append(el('dt','','Review 改版記錄'),el('dd','',`Review#${r.reviewChange.from} → Review#${r.reviewChange.to}\n發現時間：${formatTime(r.reviewChange.changedAt)}\n需驗證對應版本後才能解除。`));
 d.append(el('dt','','來源'),el('dd','',`${source?.name||''} · ${source?.sheet||''} · Excel 第 ${r.sourceRow} 列`));$('detailDialog').showModal()}
function applyData(data,meta){if(!meta.remote){$('autoSync').checked=false;$('syncInfo').textContent='手動檢視中；勾選可返回 SharePoint 資料。'}rows=data.map(row=>({...row,ownerRaw:row.owner,owner:W.ownerName(row.owner),assessment:W.assess(row)}));source=meta;page=1;sortKey='';$('sourceName').textContent=meta.name;$('sourceMeta').textContent=`工作表：${meta.sheet} · ${meta.demo?'載入':'匯入'}時間：${new Date().toLocaleString('zh-TW',{hour12:false})}`;$('demoBadge').hidden=!meta.demo;$('clearData').hidden=false;$('demoBtn').textContent='載入示範';$('search').value='';$('ownerFilter').value='';$('statusFilter').value='';fillFilter('ownerFilter','owner','全部負責人');fillFilter('statusFilter',$('statusField').value,'全部狀態');render()}
function chooseSheet(){matrix=C.sheetMatrix(XLSX,book.Sheets[$('sheetSelect').value]);const d=C.detect(matrix);$('headerRow').value=d.row+1;$('headerRow').max=Math.max(1,matrix.length);buildMapping(d.map)}
function buildMapping(map){const index=Number($('headerRow').value)-1;const headers=matrix[index]||[];const width=Math.max(headers.length,...matrix.slice(index,index+5).map(r=>r.length),0);$('mapping').replaceChildren();C.fields.forEach(([key,label],i)=>{const wrap=el('label',map[i]<0?'missing':'',label),select=el('select');select.id='map-'+key;select.append(option('-1','請選擇來源欄位'));for(let c=0;c<width;c++)select.append(option(String(c),`${XLSX.utils.encode_col(c)} · ${headers[c]||'（空白表頭）'}`));select.value=String(map[i]??-1);select.addEventListener('change',()=>{wrap.classList.toggle('missing',select.value==='-1');$('importError').textContent=''});wrap.append(select);$('mapping').append(wrap)});$('importPreview').textContent=`工作表共 ${matrix.length.toLocaleString()} 列，空白資料列會自動略過。若表頭判斷不同，請調整上方列號。`;$('importError').textContent=''}
async function readFile(file){if(!file)return;message('');if(!/\.(xlsx|xls)$/i.test(file.name)){message('請選擇 .xlsx 或 .xls Excel 檔案。',true);return}if(file.size>30*1024*1024){message('檔案超過 30 MB，請先移除不需要的工作表或圖片。',true);return}try{if(!window.XLSX)throw Error('Excel 解析元件未載入，請重新整理頁面。');message('正在讀取 Excel…');await new Promise(r=>setTimeout(r,30));const data=await file.arrayBuffer();const nextBook=XLSX.read(data,{type:'array',cellHTML:false,cellFormula:false});if(!nextBook.SheetNames.length)throw Error('Excel 中找不到工作表。');book=nextBook;fileName=file.name;$('sheetSelect').replaceChildren(...book.SheetNames.map(s=>option(s,s)));chooseSheet();message('');$('importDialog').showModal()}catch(e){book=null;message('無法讀取 Excel。請確認檔案未加密且格式正確。'+(e.message?' '+e.message:''),true)}finally{$('file').value=''}}
const samples=[
 ['Amy','SYS-001','System information','已完成基本資訊擷取，等待平台 Review。','完成','待 Review','Pass','Pass'],
 ['Ben','CPU-002','CPU stress test','長時間負載測試進行中，預計下一輪確認。','進行中','未開始','In progress','Pass'],
 ['Cindy','MEM-003','Memory performance','確認不同容量組合的測試結果。','完成','通過','Pass','Pass'],
 ['David','LAN-004','Ethernet throughput','部分輸出格式不同，需確認 Parser 規則。','待確認','待 Review','Pass','待確認'],
 ['Amy','USB-005','USB device detection','USB 3.2 裝置辨識結果需再次確認。','進行中','未開始','In progress','未開始'],
 ['Ben','SSD-006','Storage read / write','讀寫驗證已通過。\n相關平台：DEMO-A 已 Review；DEMO-B 待確認。','完成','DEMO-A：通過\nDEMO-B：待確認','Pass','Pass'],
 ['Cindy','COM-007','Serial port loopback','等待測試治具。','未開始','未開始','Pending','未開始'],
 ['David','PWR-008','Power cycle','重啟後偶發失敗，需追蹤原因。','卡關','待確認','Fail','Pass'],
 ['Amy','BIOS-009','BIOS configuration','等待規格確認。','待確認','','Pending',''],
 ['Ben','FAN-010','Fan speed control','已完成控制測試與資料解析。','完成','通過','Pass','Pass'],
 ['Cindy','TMP-011','Thermal sensor','驗證感測器輸出與單位。','進行中','待 Review','Pass','In progress'],
 ['David','DISP-012','Display output','尚未開始。','未開始','未開始','','未開始']
];
function demo(){applyData(C.extract([C.fields.map(f=>f[1]),...samples],0,[0,1,2,3,4,5,6,7]),{name:'DQA_Project_Demo.xlsx',sheet:'示範測試計畫',demo:true});message('目前顯示虛構示範資料。匯入你的 Excel 後將完整取代示範內容。')}
['importBtn','emptyImport'].forEach(id=>$(id).addEventListener('click',()=>$('file').click()));$('file').addEventListener('change',e=>readFile(e.target.files[0]));$('sheetSelect').addEventListener('change',chooseSheet);$('headerRow').addEventListener('change',()=>{const n=Number($('headerRow').value);if(!Number.isInteger(n)||n<1||n>matrix.length){$('importError').textContent='請輸入工作表範圍內的有效表頭列號。';return}buildMapping(C.detect([matrix[n-1]]).map)});
['closeImport','cancelImport'].forEach(id=>$(id).addEventListener('click',()=>$('importDialog').close()));$('importDialog').addEventListener('close',()=>{book=null;matrix=[]});$('closeDetail').addEventListener('click',()=>$('detailDialog').close());
$('importForm').addEventListener('submit',e=>{e.preventDefault();try{const h=Number($('headerRow').value)-1;if(!Number.isInteger(h)||h<0||h>=matrix.length)throw Error('表頭列號超出工作表範圍。');const data=C.extract(matrix,h,C.fields.map(([k])=>Number($('map-'+k).value)));if(!data.length)throw Error('對應欄位下找不到資料，請確認工作表與表頭列。');applyData(data,{name:fileName,sheet:$('sheetSelect').value,demo:false});$('importDialog').close();message(`已匯入 ${data.length.toLocaleString()} 項。點選 Test Code 或 Comment 可查看完整內容。`)}catch(err){$('importError').textContent=err.message}});
$('demoBtn').addEventListener('click',demo);$('reset').addEventListener('click',reset);$('search').addEventListener('input',()=>{page=1;render()});['ownerFilter','statusFilter','pageSize'].forEach(id=>$(id).addEventListener('change',()=>{page=1;render()}));$('statusField').addEventListener('change',()=>{$('statusFilter').value='';fillFilter('statusFilter',$('statusField').value,'全部狀態');page=1;render()});$('prev').addEventListener('click',()=>{page--;render()});$('next').addEventListener('click',()=>{page++;render()});$('clearData').addEventListener('click',()=>{$('autoSync').checked=false;$('syncInfo').textContent='已清除畫面；勾選可返回 SharePoint 資料。';rows=[];source=null;book=null;matrix=[];$('sourceName').textContent='尚未匯入 Excel';$('sourceMeta').textContent='選擇檔案開始，或先體驗示範資料。';$('demoBadge').hidden=true;$('clearData').hidden=true;fillFilter('ownerFilter','owner','全部負責人');fillFilter('statusFilter',$('statusField').value,'全部狀態');message('');reset()});
$('closeRules').addEventListener('click',()=>$('rulesDialog').close());
render();

let snapshotVersion='', snapshotBusy=false;
const formatTime=value=>new Date(value).toLocaleString('zh-TW',{hour12:false});
async function loadSnapshot(force=false){
 if(snapshotBusy||(!$('autoSync').checked&&!force))return;
 snapshotBusy=true;$('refreshSnapshot').disabled=true;
 try{
  const response=await fetch(['localhost','127.0.0.1','::1'].includes(location.hostname)?'/api/progress':'./progress.json',{cache:'no-store'});
  if(!response.ok)throw Error('尚無可讀取的來源資料');
  const data=await response.json();
  if(!Array.isArray(data.rows)||!data.rows.length||!data.version||!Number.isFinite(Date.parse(data.checkedAt)))throw Error('資料格式不正確');
  if(!$('autoSync').checked&&!force)return;
  if(force)$('autoSync').checked=true;
  if(source?.remote!==true||snapshotVersion!==data.version){
   const previous={q:$('search').value,owner:$('ownerFilter').value,status:$('statusFilter').value,page};
   applyData(data.rows,{name:data.name,sheet:data.sheet,demo:false,remote:true});
   $('search').value=previous.q;
   $('ownerFilter').value=[...$('ownerFilter').options].some(o=>o.value===previous.owner)?previous.owner:'';
   $('statusFilter').value=previous.status;page=previous.page;render();snapshotVersion=data.version;
  }
  const stale=false;
  const failed=data.syncStatus?.status==='error';
  $('sourceMeta').textContent=`工作表：${data.sheet} · 最後成功擷取：${formatTime(data.checkedAt)} · ${data.rows.length} 個測項`;
  $('syncInfo').textContent=failed?`擷取失敗：${data.syncStatus.message}（保留上次成功資料）`:stale?'來源資料超過 45 分鐘未更新，請確認電腦、Codex 與 SharePoint 登入狀態。':'來源採手動同步；此處顯示最近發布的資料';
  $('syncInfo').classList.toggle('sync-warning',stale||failed);
  message(`來源：SharePoint · ${data.rows.length} 個有 Test Code 的測項；略過 ${data.skippedRows} 列分類標題／未編碼備註。網頁每 60 秒檢查新快照。`);
 }catch(error){
  if($('autoSync').checked){$('syncInfo').textContent='目前無法讀取發布資料；可按「匯入 Excel」查看資料。';$('syncInfo').classList.add('sync-warning');}
 }finally{snapshotBusy=false;$('refreshSnapshot').disabled=false;}
}
$('autoSync').addEventListener('change',()=>{if($('autoSync').checked)loadSnapshot(true);else $('syncInfo').textContent='自動更新已暫停，保留目前畫面。'});
$('refreshSnapshot').addEventListener('click',()=>loadSnapshot(true));
setInterval(()=>loadSnapshot(),60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadSnapshot()});
loadSnapshot();
