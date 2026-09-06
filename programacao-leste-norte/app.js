(() => {
  'use strict';
  const C=window.ProgramacaoCore, esc=C.escape, $=id=>document.getElementById(id);
  const fmt=new Intl.NumberFormat('pt-BR');
  const n=v=>fmt.format(v), pct=(a,b)=>b?(100*a/b).toFixed(1).replace('.',',')+'%':'0,0%';
  const monthNames=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const fullMonths=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dateLabel=s=>C.validDate(s)?s.split('-').reverse().join('/'):(s||'Não informado');
  const compactDate=s=>C.validDate(s)?`${Number(s.slice(8,10))} ${monthNames[Number(s.slice(5,7))-1]}`:'Sem data';
  const monthLabel=s=>/^\d{4}-\d{2}$/.test(s)?`${fullMonths[Number(s.slice(5,7))-1]} / ${s.slice(0,4)}`:s;
  const colors={released:'#169078',pending:'#e4a23d',docs:'#6488df',draft:'#a3adbf',done:'#15917c',canceled:'#c94964',partial:'#d78945',other:'#8c78b8'};
  const palette=['#456dd2','#dd548a','#21a2a5','#a28bc4','#7188a8','#be8d50'];
  const filterIDs={search:'fSearch',from:'fFrom',to:'fTo',month:'fMonth',region:'fRegion',contractor:'fContractor',status:'fStatus',type:'fType',description:'fDescription',power:'fPower'};
  const labels={search:'Busca',from:'De',to:'Até',month:'Mês',region:'Região',contractor:'Contratada',status:'Status',type:'Intervenção',description:'Serviço',power:'PowerON',project:'Projeto',attention:'Atenção'};
  const attentionLabels={releasedMissing:'Liberados sem PowerON',missingPower:'PowerON não preenchido',powerText:'Observação no PowerON',dateMismatch:'Data de início divergente',otherRegion:'Outras regiões'};
  const storageKey='programacao-leste-norte-base-v1';
  const original=window.PROGRAMACAO_DATA;
  let payload=original, all=[], filtered=[], mode='history', period='day', pivot='status',page=1,pageSize=25,sortKey='date',sortDir='asc',extraFilters={},toastTimer,projectCounts=new Map();
  const paths={
    upload:'M12 16V3m-4 4 4-4 4 4M4 15v5h16v-5',download:'M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5',
    file:'M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h8',refresh:'M20 7a9 9 0 0 0-15-2L2 8m0-5v5h5M4 17a9 9 0 0 0 15 2l3-3m0 5v-5h-5',
    info:'M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',filter:'M3 5h18l-7 8v6l-4 2v-8z',
    reset:'M3 10a9 9 0 1 1 2 8M3 4v6h6',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    pie:'M21 12a9 9 0 1 1-9-9v9zM15 2v7h7a9 9 0 0 0-7-7',team:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4-3a4 4 0 0 1 0 7.75',
    layers:'m12 3 10 5-10 5L2 8zm-10 9 10 5 10-5m-20 5 10 5 10-5',list:'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
    attention:'m12 3 10 18H2zm0 6v5m0 3h.01',check:'m8 12 3 3 5-6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    expand:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5',folder:'M3 7V4h6l3 3h9v14H3z',calendar:'M8 2v4m8-4v4M3 10h18M3 4h18v18H3z',clock:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0'};
  function icon(name){return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.file}"></path></svg>`;}
  document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
  function notify(text,isError=false){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.toggle('error',isError);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,isError?12000:6000);}
  function empty(message='Nenhum registro neste recorte.'){return `<div class="empty-state">${icon('search')}<strong>Sem resultados</strong><span>${esc(message)}</span></div>`;}
  function getFilters(){const f={mode,...extraFilters};Object.entries(filterIDs).forEach(([k,id])=>f[k]=$(id).value);return f;}
  function setFilter(key,value,scroll=false){if(filterIDs[key])$(filterIDs[key]).value=value;else extraFilters[key]=value;page=1;render();if(scroll)$('database').scrollIntoView({behavior:'smooth',block:'start'});}
  function resetFilters(){Object.values(filterIDs).forEach(id=>$(id).value='');extraFilters={};page=1;render();}
  function fill(id,values,first){const el=$(id),prior=el.value;el.innerHTML=`<option value="">${esc(first)}</option>`+values.map(v=>{const val=Array.isArray(v)?v[0]:v,label=Array.isArray(v)?v[1]:v;return `<option value="${esc(val)}">${esc(label)}</option>`;}).join('');if([...el.options].some(o=>o.value===prior))el.value=prior;}
  function populate(){
    const unique=key=>[...new Set(all.map(r=>r[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));
    fill('fMonth',[...new Set(all.map(r=>r.date.slice(0,7)).filter(Boolean))].sort().map(v=>[v,monthLabel(v)]),'Todos os meses');
    fill('fRegion',['Leste e Norte',...unique('region'),'Outras regiões'],'Todas as regiões');
    [['fContractor','contractor','Todas as contratadas'],['fStatus','status','Todos os status'],['fType','type','Todas as intervenções'],['fDescription','description','Todos os serviços']].forEach(([id,key,first])=>fill(id,unique(key),first));
  }
  function rangeText(rows){const dates=rows.map(r=>r.date).filter(Boolean).sort();if(!dates.length)return 'Sem datas no recorte';const a=dates[0],b=dates.at(-1);return a===b?dateLabel(a):`${compactDate(a)} ${a.slice(0,4)!==b.slice(0,4)?a.slice(0,4):''} — ${compactDate(b)} ${b.slice(0,4)}`.replace(/\s+/g,' ');}
  function sourceMeta(){
    const m=C.metrics(all);$('sourceName').textContent=payload.filename;$('sourceCaption').textContent=payload===original?'Aba Dados · base incorporada':`Aba ${payload.sheet||'Dados'} · importação neste navegador`;
    $('sourcePeriod').textContent=rangeText(all);$('sourceTotal').textContent=`${n(m.records)} registros · ${n(m.projects)} projetos`;
    const fileMonth=/dezembro/i.test(payload.filename);const hasDecember=all.some(r=>r.date.slice(5,7)==='12');
    $('dataNote').querySelector('span:nth-child(2)').textContent=(fileMonth&&!hasDecember?'O arquivo se chama “Dezembro”, mas as datas são de '+[...new Set(all.map(r=>r.date.slice(0,7)))].sort().map(monthLabel).join(' e ')+'. ':'Período definido pelas datas de programação. ')+(m.otherRegion?`${n(m.otherRegion)} registros são de outras regiões e estão incluídos na base.`:'Todos os registros identificados pertencem a Leste ou Norte.');
    $('showOtherRegions').hidden=!m.otherRegion;
    $('restoreButton').disabled=payload===original;
  }
  function renderChips(f){
    const entries=Object.entries(f).filter(([k,v])=>k!=='mode'&&v);
    $('filterCount').textContent=entries.length?`${entries.length} filtro${entries.length>1?'s':''}`:'Base completa';
    $('activeFilters').innerHTML=entries.map(([key,v])=>{const value=key==='attention'?attentionLabels[v]:key==='month'?monthLabel(v):['from','to'].includes(key)?dateLabel(v):v;return `<button class="filter-chip" data-clear="${esc(key)}" aria-label="Remover filtro ${esc(labels[key])}: ${esc(value)}">${esc(labels[key])}: ${esc(value)} <b aria-hidden="true">×</b></button>`;}).join('');
    $('dateError').hidden=!(f.from&&f.to&&f.from>f.to);
    $('modeHint').textContent=mode==='latest'?'Maior data programada por projeto; inclui datas futuras.':'Indicadores e gráficos seguem os mesmos filtros.';
  }
  function kpis(m){
    const cards=[
      ['Projetos únicos',m.projects,'Códigos distintos no recorte','folder',''],
      ['Programações',m.records,'Registros no recorte','calendar',''],
      ['Liberados para execução',m.released,`<span class="kpi-tag">${pct(m.released,m.records)}</span> da consulta`,'check','released'],
      ['Pendentes de aprovação',m.pending,`${pct(m.pending,m.records)} da consulta`,'clock','pending'],
      ['Liberados para documentação',m.docs,`${pct(m.docs,m.records)} da consulta`,'file',''],
      ['Projetos com 2+ registros',m.repeated,'Mais de uma linha no recorte','layers','']
    ];
    $('kpis').innerHTML=cards.map(([label,value,caption,ic,cls])=>`<article class="kpi ${cls}"><div class="kpi-top"><span class="kpi-label">${label}</span><span class="kpi-icon">${icon(ic)}</span></div><strong class="kpi-value">${n(value)}</strong><p class="kpi-caption">${caption}</p></article>`).join('');
  }
  function statusChart(){
    const entries=C.countBy(filtered,'status');if(!entries.length){$('statusChart').innerHTML=empty();return;}
    let accum=0;const gradient=entries.map(([label,count],i)=>{const start=accum;accum+=count/filtered.length*100;return `${colors[C.categoryOf(label)]||palette[i%palette.length]} ${start}% ${accum}%`;}).join(',');
    $('statusChart').innerHTML=`<div class="donut" style="background:conic-gradient(${gradient})" role="img" aria-label="Distribuição dos ${n(filtered.length)} registros por status"><div class="donut-center"><strong>${n(filtered.length)}</strong><span>programações</span></div></div><div class="status-legend">${entries.map(([label,count],i)=>`<button class="legend-row" data-filter="status" data-value="${esc(label)}"><span class="legend-dot" style="background:${colors[C.categoryOf(label)]||palette[i%palette.length]}"></span><span class="legend-name">${esc(label)}</span><span class="legend-number"><strong>${n(count)}</strong><small>${pct(count,filtered.length)}</small></span></button>`).join('')}</div>`;
  }
  function scheduleChart(){
    const valid=filtered.filter(r=>r.date);if(!valid.length){$('scheduleChart').innerHTML=empty();$('peakCaption').textContent='';$('chartRange').textContent='';return;}
    let entries=C.countBy(valid,r=>period==='month'?r.date.slice(0,7):r.date).sort((a,b)=>a[0].localeCompare(b[0]));
    if(period==='day'){
      const first=Date.parse(entries[0][0]+'T00:00:00Z'),last=Date.parse(entries.at(-1)[0]+'T00:00:00Z');
      if((last-first)/86400000>370){period='month';document.querySelectorAll('[data-period]').forEach(el=>{el.classList.toggle('selected',el.dataset.period===period);el.setAttribute('aria-pressed',el.dataset.period===period);});scheduleChart();return;}
      const counts=new Map(entries);entries=[];for(let d=first;d<=last;d+=86400000){const day=new Date(d).toISOString().slice(0,10);entries.push([day,counts.get(day)||0]);}
    }
    const max=Math.max(...entries.map(x=>x[1])),scale=Math.max(4,Math.ceil(max/4)*4),peak=entries.find(x=>x[1]===max);
    $('peakCaption').textContent=`Pico: ${n(max)} · ${period==='month'?monthLabel(peak[0]):dateLabel(peak[0])}`;
    const interval=Math.max(1,Math.ceil(entries.length/6));
    $('scheduleChart').innerHTML=`<div class="chart-scale" aria-hidden="true">${[0,1,2,3,4].map(i=>`<span style="bottom:${i*25}%">${n(scale*i/4)}</span>`).join('')}</div><div class="chart-plot">${entries.map(([day,count],i)=>{const label=period==='month'?monthLabel(day):dateLabel(day);const tick=period==='month'?`${monthNames[Number(day.slice(5,7))-1]}/${day.slice(2,4)}`:day.slice(8,10)+'/'+day.slice(5,7);return `<div class="column-slot ${i===0?'first-column':i===entries.length-1?'last-column':''}">${count?`<button class="chart-column" style="height:${count/scale*100}%" data-chart-date="${day}" data-chart-period="${period}" aria-label="Filtrar ${esc(label)}: ${n(count)} programações"><span class="bar-tooltip">${esc(label)} · ${n(count)}</span></button>`:''}${i%interval===0||entries.length<5?`<span class="chart-x-label">${tick}</span>`:''}</div>`;}).join('')}</div>`;
    $('chartRange').textContent=rangeText(valid);
  }
  function contractorLabel(s){return s.replace(/\s*\((Área.*?)\)\s*(.*)$/i,'<break>$1 · $2');}
  function barChart(id,key,limit=8){
    const entries=C.countBy(filtered,key).slice(0,limit);if(!entries.length){$(id).innerHTML=empty();return;}
    const max=entries[0][1];
    $(id).innerHTML=entries.map(([label,count])=>{const split=key==='contractor'?contractorLabel(label).split('<break>'):[label];return `<button class="bar-item" data-filter="${key}" data-value="${esc(label)}" title="${esc(label)}: ${n(count)} programações"><span class="bar-line"><span class="bar-label">${esc(split[0])}${split[1]?`<span class="contract-sub">${esc(split[1])}</span>`:''}</span><strong class="bar-count">${n(count)}</strong></span><span class="bar-track"><span class="bar-fill" style="width:${100*count/max}%"></span></span></button>`;}).join('');
  }
  function typeChart(){
    const entries=C.countBy(filtered,'type');
    const typeColors={FI:'#2563ce',PIE:'#df1761',BRA:'#078875',OLVR:'#7e55be'};
    const colorFor=label=>typeColors[label.toUpperCase()]||palette[[...label].reduce((sum,c)=>sum+c.charCodeAt(0),0)%palette.length];
    const selected=$('fType').value;
    $('typeChart').innerHTML=entries.length?`
      <div class="intervention-summary"><div><strong>${n(filtered.length)}</strong><span>programações na consulta</span></div><span class="intervention-total-types">${n(entries.length)} ${entries.length===1?'tipo':'tipos'}</span></div>
      <div class="intervention-columns" aria-hidden="true"><span>Tipo de intervenção</span><span>Quantidade / participação</span></div>
      <div class="intervention-ranking" role="list">${entries.map(([label,count])=>{
        const color=colorFor(label),share=count/filtered.length*100,active=selected===label;
        return `<div role="listitem"><button class="intervention-row${active?' is-selected':''}" style="--type-color:${color};--type-tint:${color}0d" data-filter="type" data-value="${esc(label)}" aria-pressed="${active}" aria-label="${active?'Remover filtro':'Filtrar'} ${esc(label)}: ${n(count)} programações, ${pct(count,filtered.length)} da consulta"><span class="intervention-row-header"><span class="intervention-label"><span class="intervention-color" aria-hidden="true"></span><strong>${esc(label)}</strong></span><span class="intervention-values"><strong>${n(count)}</strong><span>${pct(count,filtered.length)}</span></span></span><span class="intervention-track" aria-hidden="true"><span class="intervention-fill" style="width:${share}%"></span></span></button></div>`;
      }).join('')}</div>
      <div class="intervention-scale" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
      <p class="intervention-note">${selected?'Clique no tipo selecionado para remover o filtro.':'Selecione um tipo para filtrar o painel.'} As barras representam a participação na consulta.</p>`:empty();
    $('regionChart').innerHTML=C.countBy(filtered,'region').map(([label,count])=>`<button class="region-pill" data-filter="region" data-value="${esc(label)}">${esc(label)}<strong>${n(count)}</strong></button>`).join('');
  }
  function attention(m){
    const data=[['releasedMissing',m.releasedMissing,'Liberados sem PowerON','Campo em branco em registros liberados para execução.'],['powerText',m.powerText,'Observações no PowerON','Texto informado no lugar de um número de identificação.'],['dateMismatch',m.dateMismatch,'Datas de início divergentes','Data do horário inicial diferente da data programada.'],['otherRegion',m.otherRegion,'Registros de outras regiões','Códigos de projeto fora de Leste e Norte.']];
    $('attentionCards').innerHTML=data.map(([key,count,title,desc])=>`<button class="attention-card ${count?'':'clear'}" data-attention="${key}" ${count?'':'disabled'}><strong>${n(count)}</strong><span><b>${title}</b><small>${desc}</small></span><span class="arrow" aria-hidden="true">↗</span></button>`).join('');
  }
  function pivotRows(){return C.countBy(filtered,pivot==='month'?r=>r.date.slice(0,7):pivot).sort(pivot==='month'?(a,b)=>a[0].localeCompare(b[0]):()=>0);}
  function renderPivot(){
    const keyLabel={status:'Status de programação',contractor:'Contratada',type:'Tipo de intervenção',description:'Descrição do serviço',month:'Mês / ano',project:'Projeto'}[pivot];
    const entries=pivotRows();
    $('pivotHead').innerHTML=`<tr><th>${keyLabel}</th><th>Registros</th><th>% da consulta</th></tr>`;
    $('pivotBody').innerHTML=entries.length?entries.map(([label,count])=>`<tr><td><button class="inline-button" data-filter="${pivot}" data-value="${esc(label)}">${esc(pivot==='month'?monthLabel(label):label)}</button></td><td>${n(count)}</td><td>${pct(count,filtered.length)}</td></tr>`).join(''):'<tr><td colspan="3">Nenhum registro neste recorte.</td></tr>';
    $('pivotFoot').innerHTML=`<tr><td>Total da consulta</td><td>${n(filtered.length)}</td><td>${filtered.length?'100,0%':'0,0%'}</td></tr>`;
    $('pivotPanel').setAttribute('aria-labelledby','tab-'+pivot);
  }
  function quality(m){
    const filled=filtered.reduce((acc,r)=>acc+C.columns.filter(k=>C.clean(r.raw[k])).length,0),total=filtered.length*C.columns.length;
    const unique=new Set(filtered.map(r=>JSON.stringify(C.columns.map(k=>r.raw[k])))).size;
    $('qualityStats').innerHTML=`<div class="quality-row"><span>Preenchimento das 10 colunas</span><strong class="${m.records?'good':''}">${pct(filled,total)}</strong></div><div class="quality-bar"><span style="width:${total?filled/total*100:0}%"></span></div><div class="quality-row"><span>Projeto e data válidos</span><strong class="good">${n(filtered.filter(r=>r.project&&r.date).length)} de ${n(m.records)}</strong></div><div class="quality-row"><button class="text-button" data-attention="missingPower">PowerON não preenchido ↗</button><strong class="${m.missingPower?'warn':''}">${n(m.missingPower)}</strong></div><div class="quality-row"><span>Linhas integralmente repetidas</span><strong class="${filtered.length-unique?'warn':'good'}">${n(filtered.length-unique)}</strong></div>`;
  }
  function statusBadge(row){return `<span class="status-badge ${row.category}">${esc(row.status||'Não informado')}</span>`;}
  function powerCell(row){return !row.power?'<span class="muted-cell">Não informado</span>':row.powerText?`<span class="power-note" title="Observação preservada da coluna PowerON">${esc(row.power)}</span>`:`<span class="mono">${esc(row.power)}</span>`;}
  function timeCell(value,warn=false){if(!value)return '<span class="muted-cell">Não informado</span>';const d=C.dateValue(value);return d&&value.includes('T')?`<div class="time-cell ${warn?'warn':''}"><strong>${esc(value.slice(11,16))}</strong><span>${dateLabel(d)}</span></div>`:esc(value);}
  function tableColumns(){return [
    {key:'project',label:'Projeto',raw:'Projeto'},
    {key:'description',label:'Empresa Executante',raw:'Empresa Executante',title:'Cabeçalho original: esta coluna contém a descrição do serviço.'},
    {key:'date',label:'Data Programacao',raw:'Data Programacao'},
    {key:'status',label:'Status Programacao',raw:'Status Programacao'},
    {key:'type',label:'Tipo Intervencao',raw:'Tipo Intervencao'},
    {key:'power',label:'Numero PowerON',raw:'Numero PowerON'},
    {key:'equipment',label:'Equipamentos',raw:'Equipamentos'},
    {key:'start',label:'Horario Inicio',raw:'Horario Inicio'},
    {key:'end',label:'Horario Fim',raw:'Horario Fim'},
    {key:'contractor',label:'Contratada',raw:'Contratada'},
    ...payload.columns.filter(k=>!C.columns.includes(k)).map(k=>({key:'raw:'+k,label:k,raw:k})),
    {key:'region',label:'Região (código)',title:'Informação adicional: região identificada no código do projeto.'},
    {key:'count',label:'Programações na base',title:'Informação adicional: total de linhas deste projeto na base atual, sem filtros.'}
  ];}
  function renderTable(){
    const cols=tableColumns(),size=pageSize==='all'?Math.max(1,filtered.length):pageSize,totalPages=Math.max(1,Math.ceil(filtered.length/size));
    page=Math.max(1,Math.min(page,totalPages));const start=(page-1)*size,rows=filtered.slice(start,start+size);
    $('tableHead').innerHTML='<tr>'+cols.map(c=>`<th scope="col" ${sortKey===c.key?`aria-sort="${sortDir==='asc'?'ascending':'descending'}"`:''} title="${esc(c.title||c.label)}">${c.key==='count'?`<span style="display:block;padding:13px 15px">${c.label}</span>`:`<button data-sort="${esc(c.key)}">${esc(c.label)} <span class="sort-mark" aria-hidden="true">${sortKey===c.key?(sortDir==='asc'?'↑':'↓'):'↕'}</span></button>`}</th>`).join('')+'</tr>';
    $('tableBody').innerHTML=rows.length?rows.map(r=>'<tr>'+cols.map(c=>{
      let value;
      if(c.key==='project')value=`<button class="project-button" data-project="${esc(r.project)}">${esc(r.project||'Sem projeto')}</button><span class="table-region">${esc(r.region)}</span>`;
      else if(c.key==='status')value=statusBadge(r);
      else if(c.key==='type')value=`<span class="type-badge">${esc(r.type||'Não informado')}</span>`;
      else if(c.key==='power')value=powerCell(r);
      else if(c.key==='start'||c.key==='end')value=timeCell(r[c.key],c.key==='start'&&r.dateMismatch);
      else if(c.key==='date')value=`<span class="mono">${dateLabel(r.date||r.raw['Data Programacao'])}</span>`;
      else if(c.key==='count'){const count=projectCounts.get(r.project)||1;value=`<span class="history-count ${count>1?'multiple':''}">${n(count)}</span>`;}
      else value=esc(c.key.startsWith('raw:')?r.raw[c.raw]:r[c.key])||'<span class="muted-cell">Não informado</span>';
      return '<td>'+value+'</td>';
    }).join('')+'</tr>').join(''):`<tr><td class="empty-cell" colspan="${cols.length}"><strong>Nenhum registro encontrado.</strong><br>Altere os filtros ou clique em “Limpar filtros”.</td></tr>`;
    $('tableCount').textContent=n(filtered.length);$('pageInfo').textContent=filtered.length?`Exibindo ${n(start+1)}–${n(Math.min(start+size,filtered.length))} de ${n(filtered.length)} registros`:'0 registros na consulta';
    $('pageNumber').textContent=`${n(page)} / ${n(totalPages)}`;$('prevPage').disabled=page===1;$('nextPage').disabled=page===totalPages;
    $('tableCaption').textContent=`${payload.columns.length} colunas da planilha + região e histórico · role a tabela para ver todas`;
  }
  function render(){
    const f=getFilters();filtered=C.sortedRows(C.filterRows(all,f),sortKey,sortDir);const m=C.metrics(filtered);
    renderChips(f);$('resultCount').textContent=`${n(m.records)} de ${n(all.length)} registros na consulta`;
    kpis(m);statusChart();scheduleChart();barChart('contractorChart','contractor',10);barChart('descriptionChart','description',8);typeChart();attention(m);renderPivot();quality(m);renderTable();
    const descriptions=C.countBy(filtered,'description').length;$('descriptionFootnote').textContent=descriptions>8?`8 de ${n(descriptions)} serviços. Consulte todos em Tabelas dinâmicas → Serviço.`:`${n(descriptions)} serviço${descriptions!==1?'s':''} na consulta.`;
    $('exportExcel').disabled=!m.records;$('exportCsv').disabled=!m.records;$('exportSummary').disabled=!m.records;
  }
  function applyPayload(next){payload=next;all=C.normalizeRows(payload.rows);projectCounts=new Map(C.countBy(all,'project'));populate();sourceMeta();resetFilters();}
  function openProject(project){
    const rows=C.sortedRows(all.filter(r=>r.project===project));$('dialogTitle').textContent=project;$('dialogMeta').textContent=`${n(rows.length)} programação${rows.length===1?'':'s'} · ${rangeText(rows)} · ${[...new Set(rows.map(r=>r.region))].join(', ')}`;
    const field=(label,value)=>`<div><span>${label}</span><p>${value}</p></div>`;
    $('dialogContent').innerHTML=rows.map((r,i)=>`<article class="history-item"><div class="history-title"><strong>${i+1}. ${dateLabel(r.date)}</strong>${statusBadge(r)}</div><div class="history-grid">${field('Descrição do serviço',esc(r.description))}${field('Contratada',esc(r.contractor))}${field('Tipo de intervenção',esc(r.type))}${field('PowerON',powerCell(r))}${field('Equipamento',esc(r.equipment))}${field('Horário de início',timeCell(r.start,r.dateMismatch))}${field('Horário de término',timeCell(r.end))}${payload.columns.filter(k=>!C.columns.includes(k)).map(k=>field(esc(k),esc(r.raw[k]))).join('')}</div>${r.powerText?'<p class="history-warning">O PowerON contém uma observação. O status de programação foi preservado conforme a planilha.</p>':''}${r.dateMismatch?'<p class="history-warning">A data do horário inicial difere da data de programação. Confira os campos na origem.</p>':''}</article>`).join('');
    $('projectDialog').showModal();
  }
  function download(name,content,type){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function exportCsv(){download('Programacao_Leste_Norte_Consulta.csv',C.makeCsv(filtered,payload.columns),'text/csv;charset=utf-8');notify(`${n(filtered.length)} registros exportados em CSV, com todas as colunas.`);}
  function exportExcel(){
    try{
      if(!window.XLSX)throw new Error('O recurso Excel não carregou. Você pode baixar o Excel original ou exportar a consulta em CSV.');
      const XLSX=window.XLSX,values=[payload.columns,...filtered.map(r=>payload.columns.map(k=>r.raw[k]??''))],sheet=XLSX.utils.aoa_to_sheet(values);
      sheet['!cols']=payload.columns.map(k=>({wch:k==='Contratada'?43:k==='Empresa Executante'?41:['Horario Inicio','Horario Fim'].includes(k)?22:k==='Status Programacao'?30:22}));
      filtered.forEach((r,i)=>payload.columns.forEach((k,j)=>{
        if(!['Data Programacao','Horario Inicio','Horario Fim'].includes(k))return;
        const v=r.raw[k];if(!C.dateValue(v))return;
        const s=String(v),ms=Date.parse(s.includes('T')?s+'Z':s+'T00:00:00Z');if(!Number.isFinite(ms))return;
        sheet[XLSX.utils.encode_cell({r:i+1,c:j})]={t:'n',v:(ms-Date.UTC(1899,11,30))/86400000,z:k==='Data Programacao'?'dd/mm/yyyy':'dd/mm/yyyy hh:mm'};
      }));
      sheet['!autofilter']={ref:sheet['!ref']};
      const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'Consulta');XLSX.writeFile(workbook,'Programacao_Leste_Norte_Consulta.xlsx');notify(`${n(filtered.length)} registros exportados em Excel, com todas as colunas.`);
    }catch(e){notify(e.message||'Não foi possível exportar a consulta em Excel.',true);}
  }
  async function importFile(file){
    if(!file)return;if(file.size>25*1024*1024){notify('Selecione uma planilha de até 25 MB.',true);return;}
    const button=$('importButton');button.disabled=true;button.innerHTML=icon('refresh')+'Importando…';
    try{
      let parsed,sheetName='Dados';
      if(/\.csv$/i.test(file.name))parsed=C.parseCsv(await file.text());
      else if(/\.xlsx?$/i.test(file.name)){
        if(!window.XLSX)throw new Error('O recurso Excel não carregou. Importe um CSV ou abra o site novamente.');
        const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});sheetName=wb.SheetNames.includes('Dados')?'Dados':wb.SheetNames[0];
        const matrix=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',blankrows:false});
        if(!matrix.length)throw new Error('A planilha está vazia.');
        const headers=matrix[0].map(C.clean);parsed={columns:headers,rows:matrix.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])))};
      }else throw new Error('Formato não reconhecido. Selecione um arquivo Excel (.xlsx ou .xls) ou CSV.');
      const mapped=C.mapImport(parsed);if(mapped.rows.length>50000)throw new Error('A base excede 50.000 registros. Divida a planilha em períodos menores.');
      const next={...mapped,filename:file.name,sheet:sheetName,importedAt:new Date().toISOString()};
      applyPayload(next);let saved=true;try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{saved=false;}
      notify(`${n(all.length)} registros importados. ${saved?'A base foi salva somente neste navegador.':'A base ficará disponível nesta sessão; não foi possível salvá-la no navegador.'}`);
    }catch(e){notify(e.message||'Não foi possível ler a planilha. A base atual foi preservada.',true);}
    finally{button.disabled=false;button.innerHTML=icon('upload')+'Importar base';$('fileInput').value='';}
  }
  function clock(){const now=new Date();$('clock').textContent=now.toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'});$('clockDate').textContent=now.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'America/Sao_Paulo'}).replace('.','')+' · São Paulo';}
  Object.entries(filterIDs).forEach(([key,id])=>$(id).addEventListener(['search','power'].includes(key)?'input':'change',()=>{page=1;render();}));
  $('clearFilters').addEventListener('click',resetFilters);
  $('activeFilters').addEventListener('click',event=>{const b=event.target.closest('[data-clear]');if(!b)return;const key=b.dataset.clear;if(filterIDs[key])$(filterIDs[key]).value='';else delete extraFilters[key];page=1;render();});
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.filter){const value=b.dataset.filter==='type'&&b.getAttribute('aria-pressed')==='true'?'':b.dataset.value;setFilter(b.dataset.filter,value);return;}
    if(b.dataset.attention){setFilter('attention',b.dataset.attention,true);return;}
    if(b.dataset.project){openProject(b.dataset.project);return;}
    if(b.dataset.chartDate){const d=b.dataset.chartDate;if(b.dataset.chartPeriod==='month'){$('fMonth').value=d;$('fFrom').value='';$('fTo').value='';}else{$('fFrom').value=d;$('fTo').value=d;$('fMonth').value='';}page=1;render();return;}
    if(b.dataset.sort){sortDir=sortKey===b.dataset.sort&&sortDir==='asc'?'desc':'asc';sortKey=b.dataset.sort;filtered=C.sortedRows(filtered,sortKey,sortDir);page=1;renderTable();return;}
    if(b.dataset.mode){mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(el=>{el.classList.toggle('selected',el.dataset.mode===mode);el.setAttribute('aria-pressed',el.dataset.mode===mode);});page=1;render();return;}
    if(b.dataset.period){period=b.dataset.period;document.querySelectorAll('[data-period]').forEach(el=>{el.classList.toggle('selected',el.dataset.period===period);el.setAttribute('aria-pressed',el.dataset.period===period);});scheduleChart();return;}
    if(b.dataset.pivot){pivot=b.dataset.pivot;document.querySelectorAll('[data-pivot]').forEach(el=>{const active=el.dataset.pivot===pivot;el.classList.toggle('selected',active);el.setAttribute('aria-selected',active);el.tabIndex=active?0:-1;});renderPivot();}
  });
  document.querySelector('.tab-row').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...document.querySelectorAll('[data-pivot]')];let i=tabs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();i=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[i].click();tabs[i].focus();});
  $('showOtherRegions').addEventListener('click',()=>setFilter('region','Outras regiões',true));
  $('pageSize').addEventListener('change',e=>{pageSize=e.target.value==='all'?'all':Number(e.target.value);page=1;renderTable();});
  $('prevPage').addEventListener('click',()=>{page--;renderTable();document.querySelector('.data-scroll').scrollTop=0;});
  $('nextPage').addEventListener('click',()=>{page++;renderTable();document.querySelector('.data-scroll').scrollTop=0;});
  $('closeDialog').addEventListener('click',()=>$('projectDialog').close());$('closeDialogBottom').addEventListener('click',()=>$('projectDialog').close());
  $('projectDialog').addEventListener('click',e=>{if(e.target===$('projectDialog')){const box=$('projectDialog').getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)$('projectDialog').close();}});
  $('exportCsv').addEventListener('click',exportCsv);$('exportExcel').addEventListener('click',exportExcel);
  $('exportSummary').addEventListener('click',()=>{const rows=pivotRows().map(([label,count])=>({'Agrupamento':pivot==='month'?monthLabel(label):label,'Registros':count,'Percentual':pct(count,filtered.length)}));download('Programacao_Leste_Norte_Resumo.csv',C.makeCsv(rows,['Agrupamento','Registros','Percentual']),'text/csv;charset=utf-8');notify('Resumo da consulta exportado em CSV.');});
  $('importButton').addEventListener('click',()=>$('fileInput').click());$('fileInput').addEventListener('change',e=>importFile(e.target.files[0]));
  $('restoreButton').addEventListener('click',()=>{try{localStorage.removeItem(storageKey);}catch{}applyPayload(original);notify('Base original restaurada: '+n(all.length)+' registros.');});
  function toggleExpanded(){const expanded=$('database').classList.toggle('expanded');$('fullscreen').setAttribute('aria-label',expanded?'Fechar tabela ampliada':'Ampliar a tabela');$('fullscreen').title=expanded?'Fechar tabela ampliada (Esc)':'Ampliar a tabela';$('fullscreen').innerHTML=expanded?'×':icon('expand');document.body.style.overflow=expanded?'hidden':'';}
  $('fullscreen').addEventListener('click',toggleExpanded);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('database').classList.contains('expanded')&&!$('projectDialog').open)toggleExpanded();});
  document.querySelectorAll('.main-nav a').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.main-nav a').forEach(el=>el.classList.toggle('active',el===link));}));
  try{const saved=localStorage.getItem(storageKey);if(saved){const data=JSON.parse(saved);if(data?.rows?.length&&Array.isArray(data.columns)){const checked=C.mapImport(data);payload={...data,...checked};}}}catch{payload=original;}
  applyPayload(payload);clock();setInterval(clock,1000);
})();
