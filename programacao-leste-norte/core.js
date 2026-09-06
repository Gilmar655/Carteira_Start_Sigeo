(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ProgramacaoCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const columns = ['Projeto','Empresa Executante','Data Programacao','Status Programacao','Tipo Intervencao','Numero PowerON','Equipamentos','Horario Inicio','Horario Fim','Contratada'];
  const clean = v => v == null ? '' : String(v).trim();
  const fold = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const escape = v => clean(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = v => String(v).padStart(2,'0');
  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = new Date(s+'T12:00:00Z');
    return Number.isFinite(+d) && d.toISOString().slice(0,10) === s;
  }
  function dateValue(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'number') {
      const d = new Date(Date.UTC(1899,11,30) + Math.round(v*86400000));
      return Number.isFinite(+d) ? d.toISOString().slice(0,10) : '';
    }
    const s = clean(v);
    let result = s.slice(0,10);
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (br) result = `${br[3]}-${pad(br[2])}-${pad(br[1])}`;
    return validDate(result) ? result : '';
  }
  function dateTimeValue(v, day) {
    if (v == null || v === '') return '';
    if (typeof v === 'number') {
      const base = v >= 1 ? Date.UTC(1899,11,30) : Date.parse((day || '1970-01-01')+'T00:00:00Z');
      const d = new Date(base + Math.round(v*86400000));
      return Number.isFinite(+d) ? d.toISOString().slice(0,19) : clean(v);
    }
    const s = clean(v);
    const h = s.match(/(?:T|\s|^)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    const d = dateValue(v) || day;
    if (h && Number(h[1])<24 && Number(h[2])<60) return `${d}T${pad(h[1])}:${h[2]}:${h[3]||'00'}`;
    return s;
  }
  function regionOf(project) {
    const code = clean(project).toUpperCase().match(/A[./]?([A-Z]{3})/);
    return ({LES:'Leste',NOR:'Norte',OES:'Oeste',ABC:'ABC',SUL:'Sul'})[code?.[1]] || 'Não identificada';
  }
  function categoryOf(status) {
    const s = fold(status);
    if (s.includes('parcial')) return 'partial';
    if (s.includes('executad') || s.includes('concluid')) return 'done';
    if (s.includes('cancel')) return 'canceled';
    if (s.includes('documenta')) return 'docs';
    if (s.includes('liberado') && s.includes('execu')) return 'released';
    if (s.includes('pend')) return 'pending';
    if (s.includes('rascunho')) return 'draft';
    return 'other';
  }
  function normalizeRows(input) {
    return input.filter(r=>Object.values(r).some(v=>v!=null && clean(v)!=='')).map((raw,index)=>{
      const row = {...raw};
      columns.forEach(k=>{ if (!(k in row)) row[k]=''; });
      const date = dateValue(row['Data Programacao']);
      row['Data Programacao'] = date || clean(row['Data Programacao']);
      row['Horario Inicio'] = dateTimeValue(row['Horario Inicio'],date);
      row['Horario Fim'] = dateTimeValue(row['Horario Fim'],date);
      columns.filter(k=>!['Data Programacao','Horario Inicio','Horario Fim'].includes(k)).forEach(k=>row[k]=clean(row[k]));
      const r = {index,raw:row, project:clean(row.Projeto),description:clean(row['Empresa Executante']),date,
        status:clean(row['Status Programacao']),type:clean(row['Tipo Intervencao']),power:clean(row['Numero PowerON']),
        equipment:clean(row.Equipamentos),start:clean(row['Horario Inicio']),end:clean(row['Horario Fim']),
        contractor:clean(row.Contratada),region:regionOf(row.Projeto)};
      r.category = categoryOf(r.status);
      r.powerText = !!r.power && !/^\d+(?:-\d+)?$/.test(r.power);
      r.dateMismatch = !!date && !!dateValue(r.start) && dateValue(r.start)!==date;
      r.search = fold(Object.values(row).join(' ')+' '+r.region);
      return r;
    });
  }
  function countBy(rows,key) {
    const m = new Map();
    rows.forEach(r=>{const k=typeof key==='function'?key(r):r[key];const name=clean(k)||'Não informado';m.set(name,(m.get(name)||0)+1);});
    return [...m].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'pt-BR'));
  }
  function latestRows(rows) {
    const m=new Map();
    rows.forEach(r=>{const key=r.project||`sem-projeto-${r.index}`;const prev=m.get(key);if(!prev || (r.date+' '+r.start)>=(prev.date+' '+prev.start))m.set(key,r);});
    return [...m.values()];
  }
  function filterRows(rows,f={}) {
    if (f.from && f.to && f.from>f.to) return [];
    const base=f.mode==='latest'?latestRows(rows):rows;
    const tokens=fold(f.search).split(/\s+/).filter(Boolean);
    return base.filter(r=>{
      if(f.from&&(!r.date||r.date<f.from))return false;
      if(f.to&&(!r.date||r.date>f.to))return false;
      if(f.month&&r.date.slice(0,7)!==f.month)return false;
      if(f.region==='Leste e Norte'&&!['Leste','Norte'].includes(r.region))return false;
      if(f.region==='Outras regiões'&&['Leste','Norte'].includes(r.region))return false;
      if(f.region&&!['Leste e Norte','Outras regiões'].includes(f.region)&&r.region!==f.region)return false;
      if(['status','type','description','contractor'].some(k=>f[k]&&r[k]!==f[k]))return false;
      if(f.power&&!fold(r.power).includes(fold(f.power)))return false;
      if(f.project&&r.project!==f.project)return false;
      if(tokens.some(t=>!r.search.includes(t)))return false;
      if(f.attention==='missingPower'&&r.power)return false;
      if(f.attention==='releasedMissing'&&(r.category!=='released'||r.power))return false;
      if(f.attention==='powerText'&&!r.powerText)return false;
      if(f.attention==='dateMismatch'&&!r.dateMismatch)return false;
      if(f.attention==='otherRegion'&&['Leste','Norte'].includes(r.region))return false;
      return true;
    });
  }
  function metrics(rows) {
    return {records:rows.length,projects:new Set(rows.map(r=>r.project).filter(Boolean)).size,
      released:rows.filter(r=>r.category==='released').length,pending:rows.filter(r=>r.category==='pending').length,
      docs:rows.filter(r=>r.category==='docs').length,repeated:countBy(rows.filter(r=>r.project),'project').filter(x=>x[1]>1).length,
      missingPower:rows.filter(r=>!r.power).length,powerText:rows.filter(r=>r.powerText).length,
      releasedMissing:rows.filter(r=>r.category==='released'&&!r.power).length,
      dateMismatch:rows.filter(r=>r.dateMismatch).length,otherRegion:rows.filter(r=>!['Leste','Norte'].includes(r.region)).length};
  }
  function sortedRows(rows,key='date',direction='asc') {
    const sign=direction==='desc'?-1:1;
    return [...rows].sort((a,b)=>{
      const av=key.startsWith('raw:')?a.raw[key.slice(4)]:a[key];
      const bv=key.startsWith('raw:')?b.raw[key.slice(4)]:b[key];
      return clean(av).localeCompare(clean(bv),'pt-BR',{numeric:true})*sign || a.start.localeCompare(b.start) || a.project.localeCompare(b.project) || a.index-b.index;
    });
  }
  function parseCsv(input) {
    const text=input.replace(/^\uFEFF/,'');
    const first=text.split(/\r?\n/)[0];
    const delim=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';
    let rows=[],row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(c===delim&&!quoted){row.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(quoted)throw new Error('O CSV contém aspas sem fechamento.');
    row.push(cell);if(row.some(x=>x!==''))rows.push(row);
    if(!rows.length)return {columns:[],rows:[]};
    const headers=rows.shift().map(clean);
    if(new Set(headers.map(fold)).size!==headers.length)throw new Error('A planilha contém cabeçalhos repetidos.');
    return {columns:headers,rows:rows.map(v=>Object.fromEntries(headers.map((h,i)=>[h,v[i]??''])))};
  }
  function mapImport(payload) {
    const aliases={'descricao do projeto':'Empresa Executante','descricao':'Empresa Executante','data programacao':'Data Programacao','status programacao':'Status Programacao','tipo intervencao':'Tipo Intervencao','numero poweron':'Numero PowerON','poweron':'Numero PowerON','horario inicio':'Horario Inicio','horario fim':'Horario Fim'};
    const canonical=new Map(columns.map(c=>[fold(c),c]));
    const mapping=payload.columns.map(c=>canonical.get(fold(c))||aliases[fold(c)]||clean(c));
    if(new Set(mapping).size!==mapping.length)throw new Error('Existem colunas repetidas após a identificação dos cabeçalhos.');
    const missing=columns.filter(c=>!mapping.includes(c));
    if(missing.length)throw new Error('Colunas ausentes: '+missing.join(', ')+'. Use a estrutura da planilha original.');
    const rows=payload.rows.map(r=>Object.fromEntries(payload.columns.map((c,i)=>[mapping[i],r[c]??''])));
    const normalized=normalizeRows(rows);
    if(!normalized.length)throw new Error('A planilha não contém registros preenchidos.');
    if(normalized.some(r=>!r.project||!r.date))throw new Error('Há registros sem projeto ou com data de programação inválida. Revise a planilha antes de importar.');
    return {columns:mapping,rows:normalized.map(r=>r.raw)};
  }
  function makeCsv(rows,headers) {
    const cell=v=>{let s=clean(v);if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    return '\uFEFF'+[headers.map(cell).join(';'),...rows.map(r=>headers.map(h=>cell(r.raw?r.raw[h]:r[h])).join(';'))].join('\r\n');
  }
  return {columns,clean,fold,escape,dateValue,dateTimeValue,validDate,regionOf,categoryOf,normalizeRows,countBy,latestRows,filterRows,metrics,sortedRows,parseCsv,mapImport,makeCsv};
});
