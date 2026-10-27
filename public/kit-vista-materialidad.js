/* Capítulo 05: tres lecturas de los mismos temas y una ficha compartida. */
(function () {
  'use strict';
  const el = App.el, M = KitMaterialidad;

  const numero = v => new Intl.NumberFormat('es-CO', {maximumFractionDigits: 2}).format(v);
  const nota = 'Temas y calificaciones ilustrativos: muestran cómo funciona el método (GRI 3 · SASB Gas Utilities & Distributors)';
  const enlace = (texto, href) => {const a = el('a', texto); a.href = href; return a;};
  function svg(tag, attrs = {}, texto) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (texto !== undefined) n.textContent = texto;
    return n;
  }
  const NIVELES_SEM = [];
  const semColor = v => (NIVELES_SEM.find(n => typeof v === 'number' && n.valor === Math.min(5, Math.floor(v))) || {}).color || 'gris';
  function circulo(v, grande) { return el('span', typeof v === 'number' ? numero(v) : '—', 'mat-circulo sem-' + semColor(v) + (grande ? ' grande' : '')); }
  function cabeza(antetitulo, titulo, contexto) {
    const c = el('div', null, 'seccion-cabeza mat-cabeza'), t = el('div');
    t.append(el('p', antetitulo, 'antetitulo'), el('h2', titulo)); c.append(t, el('p', contexto)); return c;
  }
  function barra(nombre, valor, umbral) {
    const b = el('div', null, 'mat-barra'), pista = el('div', null, 'mat-pista');
    b.append(typeof nombre === 'string' ? el('span', nombre) : nombre, el('span', numero(valor), 'mat-valor'));
    const relleno = el('span', null, 'mat-relleno'), marca = el('span', null, 'mat-marca');
    relleno.style.width = valor / 5 * 100 + '%'; marca.style.left = umbral / 5 * 100 + '%';
    relleno.className = 'mat-relleno sem-relleno-' + semColor(valor);
    pista.setAttribute('role', 'img'); pista.setAttribute('aria-label', `Puntaje ${numero(valor)} de 5; umbral ${numero(umbral)}`);
    pista.append(relleno, marca); b.append(pista); return b;
  }
  const lecturas = {
    impacto: ['Materialidad de impacto', '¿Qué temas afectan más a las personas y al entorno?', 'Probabilidad', 'Severidad', ['Prioridad de impacto', 'Severo pero poco probable', 'Probable pero menos severo', 'Impacto bajo']],
    financiera: ['Materialidad financiera', '¿Qué temas pueden afectar más el desempeño y el valor de la empresa?', 'Impacto en el gasto operativo', 'Impacto en la rentabilidad', ['Prioridad financiera', 'Afecta ingresos', 'Afecta costos', 'Efecto financiero bajo']],
    doble: ['Doble materialidad', '¿Qué temas son materiales en al menos una de las dos dimensiones?', 'Importancia del impacto', 'Materialidad financiera']
  };
  function render(contenedor, datos, params = {}, sub = 'doble') {
    const raiz = el('div', null, 'materialidad'); contenedor.append(raiz);
    NIVELES_SEM.splice(0,NIVELES_SEM.length,...(datos.caso?.metodologia?.calificacion?.materialidad?.niveles || []));
    const cfg = datos.materialidadConfig, data = datos.materialidad;
    const notaActual=data.temas.some(t=>t.origen==='ilustrativo')?nota:'Calificaciones registradas para esta empresa. Los umbrales se calculan sobre los temas evaluados.';
    let filas;
    try {filas = M.clasificar(data.temas, cfg);} catch (e) {
      KitEstudiosUI.vacio(raiz,params,'materialidad','Revisa las calificaciones: '+e.message);return;
    }
    const temas = data.temas, limites = M.umbrales(temas, cfg), lectura = lecturas[sub];
    const mi = M.mapaImpacto(temas, cfg), mf = M.mapaFinanciero(temas, cfg);
    const puntos = sub === 'impacto' ? mi : sub === 'financiera' ? mf : filas.map(f => ({...f, x: f.impacto, y: f.financiera}));
    const cortes = sub === 'doble' ? {x: limites.impacto, y: limites.financiera} : puntos.umbrales;
    const etiquetas = lectura[4] || ['doble', 'financiera', 'impacto', 'no-material'].map(id => cfg.cuadrantes.find(c => c.id === id).etiqueta);
    const tema = id => temas.find(t => t.id === id), fila = id => filas.find(f => f.id === id);
    const material = id => puntos.find(p => p.id === id).material;
    const cuadrante = p => etiquetas[p.x > cortes.x ? (p.y > cortes.y ? 0 : 2) : (p.y > cortes.y ? 1 : 3)];
    const ruta = () => KitEstudiosUI.ruta('materialidad',params,sub);
    const linkTema = id => enlace(id.slice(-2) + ' · ' + tema(id).nombre, ruta(id));
    const cruzar = t => ({ejes:datos.estandares.ejes.filter(e=>(t.ejes||[]).includes(e.id))});
    function sasb(t, destino) {
      if (t.sasb) destino.append(el('p', 'Referencia SASB: ' + (typeof t.sasb === 'string' ? t.sasb : Object.values(t.sasb).join(' · '))));
    }
    const cantidad = puntos.filter(p => p.material).length;
    const hallazgo = sub === 'doble' ? `${cantidad} de ${temas.length} temas son materiales en al menos una dimensión` : `${cantidad} de ${temas.length} temas superan el umbral ${sub === 'impacto' ? 'de impacto' : 'financiero'}`;
    const mapa = el('section', null, 'seccion mat-mapa');
    mapa.append(cabeza(lectura[0], hallazgo, lectura[1]));
    const tarjeta = el('div', null, 'tarjeta mat-grafico'); tarjeta.append(el('h3', 'Mapa de cuadrantes'));
    const grafico = svg('svg', {viewBox: '0 0 1080 700', class: 'mat-svg', role: 'group', 'aria-label': `Mapa de cuadrantes: ${lectura[2]} y ${lectura[3]}, escala de 0 a 5`});
    const x = v => 90 + v / 5 * 900, y = v => 540 - v / 5 * 420, ux = x(cortes.x), uy = y(cortes.y);
    [[90,120,ux-90,uy-120,1],[ux,120,990-ux,uy-120,0],[90,uy,ux-90,540-uy,3],[ux,uy,990-ux,540-uy,2]].forEach(([a,b,w,h,i]) => {
      grafico.append(svg('rect', {x:a,y:b,width:w,height:h,class:'mat-cuadrante mat-cuadrante-' + i}));
    });
    for (let i = 0; i <= 5; i++) grafico.append(svg('text', {x:x(i),y:565,'text-anchor':'middle'}, numero(i)), svg('text', {x:74,y:y(i)+5,'text-anchor':'end'}, numero(i)));
    grafico.append(svg('line',{x1:ux,x2:ux,y1:120,y2:540,class:'mat-umbral'}),svg('line',{x1:90,x2:990,y1:uy,y2:uy,class:'mat-umbral'}));
    grafico.append(svg('text',{x:90,y:28}, `Umbral X: ${numero(cortes.x)} · Umbral Y: ${numero(cortes.y)}`));
    // Etiquetas fuera del área de puntos: nunca ocultan una observación.
    [[1,90,90,'start'],[0,990,90,'end'],[3,90,606,'start'],[2,990,606,'end']].forEach(([i,a,b,anchor]) => grafico.append(svg('text',{x:a,y:b,'text-anchor':anchor,class:'mat-etiqueta'},etiquetas[i])));
    grafico.append(svg('text',{x:540,y:663,'text-anchor':'middle'},lectura[2]), svg('text',{transform:'translate(25 330) rotate(-90)','text-anchor':'middle'},lectura[3]));
    // Trabajar a un tercio de escala convierte la separación mínima de 14 en 42 px.
    M.posicionesMatriz(puntos.map(p => ({...p,impacto:p.x,financiera:p.y})),360,200,30).forEach(p => {
      const px = p.x*3, py = p.y*3+30;
      if (p.x !== p.realX || p.y !== p.realY) grafico.append(svg('line',{x1:p.realX*3,y1:p.realY*3+30,x2:px,y2:py,class:'mat-conector'}));
      const g = svg('g',{id:'mat-punto-'+p.id,role:'button',tabindex:0,class:'mat-punto' + (p.material ? ' mat-material' : ''),'aria-label': `${p.id.slice(-2)} · ${tema(p.id).nombre}; ${lectura[2]}: ${numero(p.impacto)}; ${lectura[3]}: ${numero(p.financiera)}; ${p.material ? 'material' : 'no material'}`});
      g.append(svg('circle',{cx:px,cy:py,r:18}),svg('text',{x:px,y:py+5,'text-anchor':'middle'},p.id.slice(-2)));
      g.onclick = () => {if(params.vigente())params.abrir(p.id);}; g.onkeydown = e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); g.onclick();}}; grafico.append(g);
    });
    tarjeta.append(grafico, el('p', 'Cómo leerlo: el relleno identifica los temas materiales; el contorno, los no materiales. Seleccione un número para abrir su ficha. Las líneas discontinuas marcan los umbrales. Los puntos próximos se separan y se conectan a su posición real.', 'mat-lectura'));
    tarjeta.append(el('p', sub === 'doble' ? 'Un tema es material si supera al menos uno de los umbrales; la igualdad no lo supera.' : 'Los cuadrantes usan las medias de ambas variables. El relleno depende del total de la dimensión, no del cuadrante. La igualdad no supera el umbral.', 'mat-lectura'));
    mapa.append(tarjeta); raiz.append(mapa);

    // La matriz y los resultados se retiraron: las fichas de cada tema ya presentan esa información.
    raiz.append(el('p',notaActual,'nota'));
    if(!params.id || !tema(params.id)) return;
    const t=tema(params.id), f=fila(t.id), pi=mi.find(p=>p.id===t.id), pf=mf.find(p=>p.id===t.id);
    const fondo=el('div',null,'fondo-dialogo centrado mat-fondo'),dialogo=el('section',null,'panel materialidad mat-ficha');
    dialogo.setAttribute('role','dialog');dialogo.setAttribute('aria-modal','true');dialogo.setAttribute('aria-labelledby','mat-titulo');
    const cerrar=el('button','Cerrar ×','cerrar mat-cerrar');cerrar.type='button';
    // Fila 1: tema material | dimensión ESG
    const f1=el('div',null,'mat-f1'), tit=el('div',null,'mat-f1-titulo'), titulo=el('h2',t.nombre); titulo.id='mat-titulo';
    tit.append(el('p',lectura[0]+' · Tema '+t.id.slice(-2),'antetitulo'),titulo,el('p',cuadrante(puntos.find(p=>p.id===t.id)),'mat-f1-cuadrante'));
    const esg=el('div',null,'mat-f1-esg'); esg.append(el('span','Dimensión ESG','mat-rotulo'),el('strong',t.dimension_esg.charAt(0).toUpperCase()+t.dimension_esg.slice(1)));
    f1.append(tit,esg);
    // Fila 2: variables de esta subpestaña con su calificación | riesgos DDHH y estándares relacionados
    const variables = sub==='impacto' ? [['Severidad',pi.y,'Promedio de escala, alcance e irremediabilidad'],['Probabilidad',pi.x,'Qué tan probable es que el impacto ocurra']]
      : sub==='financiera' ? [['Rentabilidad',pf.y,'Efecto en ingresos y márgenes'],['Gasto operativo',pf.x,'Efecto en costos de operación']]
      : [['Materialidad de impacto',f.impacto,'Umbral '+numero(limites.impacto)],['Materialidad financiera',f.financiera,'Umbral '+numero(limites.financiera)]];
    const f2=el('div',null,'mat-f2'), izq=el('div',null,'mat-vars');
    variables.forEach(([nombre,valor,ayuda])=>{const fila=el('div',null,'mat-var'),txt=el('div');txt.append(el('strong',nombre),el('span',ayuda,'mat-sub'));const cal=el('div',null,'mat-var-calif');cal.append(circulo(valor,true));fila.append(txt,cal);izq.append(fila);});
    const der=el('div',null,'mat-rel'), cruce=cruzar(t);
    const estandares=[...new Set([...cruce.ejes.flatMap(e=>datos.dimensiones?.ejes?.[e.id]?.estandares||[]),...(t.sasb?[typeof t.sasb==='string'?t.sasb:Object.values(t.sasb).join(' · ')]:[]),cfg.marco||'GRI 3: Temas Materiales 2021'])];
    const bE=el('section',null,'mat-rel-bloque'); bE.append(el('h3','Estándares relacionados'));
    const ulE=el('ul',null,'mat-vinetas'); estandares.forEach(x=>ulE.append(el('li',x))); bE.append(ulE);
    cruce.ejes.forEach(e=>{const a=enlace(e.nombre,KitEstudiosUI.ruta('ddhh',params,'estandares'));bE.append(a);});
    der.append(bE); f2.append(izq,der);
    // Fila 3: dos cajas que despliegan su subficha
    const tituloCal = sub==='financiera' ? 'Calificación de las áreas miembro del comité' : sub==='doble' ? 'Calificación de los grupos de interés y de las áreas miembro del comité' : 'Calificación de los grupos de interés';
    const zona=el('div',null,'mat-subficha'); zona.hidden=true;
    // Tabla de calificación: primera columna = quién califica; demás columnas = calificaciones en círculo de semáforo.
    const tablaCal=(titulos,filasT)=>{const tb=el('table',null,'mat-tabla-sub mat-tabla-cal'),th=el('thead'),tr=el('tr');titulos.forEach(x=>{const c=el('th',x);c.scope='col';tr.append(c);});th.append(tr);tb.append(th);const body=el('tbody');filasT.forEach(([n,...vs])=>{const r=el('tr'),h=el('th',n);h.scope='row';r.append(h);vs.forEach(v=>{const td=el('td',null,'mat-tabla-c');td.append(circulo(v));r.append(td);});body.append(r);});tb.append(body);return tb;};
    const pg=M.porGrupo(t,cfg);
    const filasGrupos=data.grupos.filter(g=>t.evaluacion_impacto[g.id]).map(g=>{const ev=t.evaluacion_impacto[g.id],sev=M.severidad(ev,cfg);return [g.nombre,sev,ev.probabilidad,pg[g.id]];});
    const evals=data.evaluadores_financieros.filter(e=>t.evaluacion_financiera[e.id]).map(e=>{const x=t.evaluacion_financiera[e.id];return [e.nombre,x.rentabilidad,x.gasto_operativo,(x.rentabilidad+x.gasto_operativo)/2];});
    const subfichas={
      calificacion:()=>{const s=el('section');s.append(el('h3',tituloCal,'mat-sub-titulo'));
        if(sub!=='financiera') s.append(tablaCal(['Grupo de interés','Calificación severidad','Calificación probabilidad','Calificación promedio'],filasGrupos));
        if(sub!=='impacto') s.append(tablaCal(['Áreas miembro del comité','Calificación rentabilidad','Calificación gasto operativo','Calificación promedio'],evals));
        s.append(el('p',sub==='impacto'?'Severidad: promedio de escala, alcance e irremediabilidad que asignó cada grupo. Promedio: importancia del impacto (promedio de severidad y probabilidad).':sub==='financiera'?'Promedio: efecto financiero que asignó cada área (promedio de rentabilidad y gasto operativo).':'Impacto según los grupos de interés y efecto financiero según el comité.','nota mat-sub-nota'));return s;},
    };
    const f3=el('div',null,'mat-f3');
    const botones=[['calificacion',tituloCal,(sub==='financiera'?evals.length+' áreas del comité':sub==='doble'?filasGrupos.length+' grupos · '+evals.length+' áreas del comité':filasGrupos.length+' grupos de interés')]].map(([clave,texto,meta])=>{
      const b=el('button',null,'mat-boton-sub');b.type='button';b.setAttribute('aria-expanded','false');b.dataset.sub=clave;
      const ver=el('span','Ver','mat-ver');b.verRotulo=ver;b.append(el('strong',texto),el('span',meta,'mat-sub'),ver);
      b.onclick=()=>{const abierto=b.getAttribute('aria-expanded')==='true';botones.forEach(o=>{o.setAttribute('aria-expanded','false');o.verRotulo.textContent='Ver';});
        if(abierto){zona.hidden=true;zona.replaceChildren();return;}
        b.setAttribute('aria-expanded','true');b.verRotulo.textContent='Ocultar';zona.replaceChildren(subfichas[clave]());zona.hidden=false;};
      f3.append(b);return b;});
    dialogo.append(cerrar,f1,f2,f3,zona);
    fondo.addEventListener('click',e=>{if(e.target===fondo)cerrar.onclick();});
    const anterior=document.activeElement,regiones=[...document.querySelectorAll('body > header, body > main, body > footer, body > .saltar')],inertes=regiones.map(n=>n.inert);
    regiones.forEach(n=>{n.inert=true;});fondo.append(dialogo);document.body.append(fondo);document.body.classList.add('dialogo-abierto');cerrar.focus();
    let limpio=false;
    function limpiar() {if(limpio)return;limpio=true;document.removeEventListener('keydown',teclado);regiones.forEach((n,i)=>{n.inert=inertes[i];});fondo.remove();document.body.classList.remove('dialogo-abierto');(document.getElementById('mat-punto-'+t.id)||anterior)?.focus();}
    cerrar.onclick=()=>{limpiar();params.cerrar();};
    function teclado(e) {if(e.key==='Escape'){e.preventDefault();cerrar.onclick();}if(e.key==='Tab'){const focos=[...dialogo.querySelectorAll('button, a[href]')],primero=focos[0],ultimo=focos.at(-1);if(e.shiftKey&&document.activeElement===primero){e.preventDefault();ultimo.focus();}else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primero.focus();}}}
    document.addEventListener('keydown',teclado);return limpiar;
  }
  const U=KitEstudiosUI,K=KitEstudios;
  async function montar(c,_,p,sub) {
    let activo=true,limpieza;
    const vigente=()=>activo&&p.vigente();
    try {
      const [cfg,cat,nombre,listas]=await Promise.all([U.config('config/kit-materialidad-catalogo.json'),U.config('config/kit-ddhh-catalogo.json'),U.nombre(p),U.cargar(p,['materialidad-temas','materialidad-impacto','materialidad-financiera'])]);
      if(!vigente())return;
      const materialidad=K.materialidad(cfg,K.reemplazar(listas,nombre));
      if(!materialidad.temas.length){U.vacio(c,p,'materialidad');return;}
      const completos=materialidad.temas.every(t=>Object.keys(t.evaluacion_impacto).length&&Object.keys(t.evaluacion_financiera).length);
      if(!completos){U.vacio(c,p,'materialidad','Faltan calificaciones de impacto o financieras. Completa los temas antes de calcular los umbrales.');return;}
      const datos={materialidad,materialidadConfig:cfg,estandares:cat,dimensiones:cat.dimensiones,caso:{metodologia:{calificacion:cat.calificacion}}};
      function dibujar(id) {
        if(!vigente())return;limpieza?.();c.replaceChildren();
        limpieza=render(c,datos,{...p,id,abrir:dibujar,cerrar:()=>{dibujar();document.getElementById('mat-punto-'+id)?.focus();},vigente},sub);
      }
      dibujar();
    }catch(e){if(vigente())U.error(c,e);}
    return()=>{activo=false;limpieza?.();};
  }
  ['doble','impacto','financiera'].forEach(sub=>App.registrarVista('materialidad/'+sub,{render:(c,d,p)=>montar(c,d,p,sub)}));
}());
