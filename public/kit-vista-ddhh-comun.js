/* Recursos públicos en memoria; los datos de empresa solo pasan por KitDatos. */
(function () {
  'use strict';
  const K=KitEstudios, el=App.el, cache=new Map();
  async function config(ruta) {
    if (!cache.has(ruta)) cache.set(ruta,fetch(ruta).then(r=>{if(!r.ok)throw Error('No se pudo cargar la configuración.');return r.json();}).catch(e=>{cache.delete(ruta);throw e;}));
    return JSON.parse(JSON.stringify(await cache.get(ruta)));
  }
  const ruta=(modulo,p,sub)=>'#/'+modulo+'/'+encodeURIComponent(p.empresa)+'/'+sub;
  function vacio(c,p,modulo,texto='Esta empresa aún no tiene datos para esta vista.') {
    c.append(el('p',texto,'en-preparacion'));
    if(p.puedeEditar){const a=el('a','Ir a Alimentación','boton secundario');a.href=ruta(modulo,p,'alimentacion');c.append(a);}
  }
  function error(c,e) {const n=el('p',e.message||'No se pudo completar la operación.','kit-error');n.setAttribute('role','alert');c.append(n);if(e.sesionCerrada)App.actualizarVista();}
  async function nombre(p) {const es=await App.datos.empresas();return es.find(e=>e.id===p.empresa)?.nombre||'La empresa';}
  const boton=(texto,fn)=>{const b=el('button',texto,'boton secundario');b.type='button';b.onclick=fn;return b;};
  async function cargar(p,colecciones) {return Object.fromEntries(await Promise.all(colecciones.map(async c=>[c,await App.datos.listar(p.empresa,c)])));}
  async function alimentacion(c,datos,p,modulo) {
    if(!p.puedeEditar){c.append(el('p','Solo el responsable puede modificar estos datos.'));return;}
    let activo=true,revision=0;
    const vigente=()=>activo&&p.vigente();
    const nombres=K.colecciones[modulo], esquemas=await Promise.all(nombres.map(n=>config('config/esquemas/'+n+'.json')));
    const cat=await config('config/kit-ddhh-catalogo.json');
    const mat=modulo==='materialidad'?await config('config/kit-materialidad-catalogo.json'):null;
    const etiquetas=new Map([...cat.ejes,...cat.indicadores.map(i=>({...i,nombre:i.pregunta})),...cat.dimensiones.grandes.map(g=>({...g,nombre:g.titulo})),...cat.ejes.flatMap(e=>e.componentes),...(mat?.grupos||[]),...(mat?.evaluadores_financieros||[])].map(x=>[x.id,x.nombre]));
    if(!vigente())return;
    const tabs=el('nav',null,'ke-tabs'), cuerpo=el('section'), estado=el('div');tabs.setAttribute('aria-label','Colecciones');
    c.append(tabs,estado,cuerpo,el('p','Carga por Excel (próximamente)','nota'));
    nombres.forEach((n,i)=>tabs.append(boton(esquemas[i].titulo,()=>abrir(n))));
    c.append(boton('Historial de cambios',async()=>{
      const v=++revision;estado.replaceChildren();cuerpo.replaceChildren(el('p','Cargando historial…'));
      try{const h=await Promise.all(nombres.map(coleccion=>App.datos.historial(p.empresa,{coleccion,limite:50})));
        if(!vigente()||v!==revision)return;
        cuerpo.replaceChildren(el('h2','Historial de cambios'));
        h.flat().sort((a,b)=>(b.n||0)-(a.n||0)).slice(0,50).forEach(r=>cuerpo.append(el('p',[esquemas[nombres.indexOf(r.coleccion)]?.titulo,r.registro_id,({INSERT:'Creación',UPDATE:'Edición',DELETE:'Borrado'})[r.accion]||r.accion,r.fecha?new Intl.DateTimeFormat('es-CO',{dateStyle:'short',timeStyle:'short'}).format(new Date(r.fecha)):''].filter(Boolean).join(' · '))));
        if(!h.flat().length)cuerpo.append(el('p','No hay cambios registrados.'));
      }catch(e){if(vigente()&&v===revision)error(cuerpo,e);}
    }));
    async function abrir(coleccion) {
      const version=++revision;estado.replaceChildren();cuerpo.replaceChildren(el('p','Cargando registros…'));
      const actual=()=>vigente()&&version===revision, base=esquemas[nombres.indexOf(coleccion)];
      try {
        const referencias={}, listas=await cargar(p,[coleccion,...new Set(Object.values(base.campos).filter(r=>r.tipo==='referencia').map(r=>r.coleccion))]);
        if(!actual())return;
        for(const [k,rs] of Object.entries(listas))referencias[k]=new Set(rs.map(r=>r.id));
        const registros=listas[coleccion];
        function tabla() {
          cuerpo.replaceChildren(el('h2',base.titulo),boton('Agregar',()=>formulario()));
          if(!registros.length)cuerpo.append(el('p','Aún no hay registros. Usa Agregar para comenzar.','nota'));
          const tabla=el('table'),head=el('thead'),tr=el('tr');['Registro','Acciones'].forEach(t=>tr.append(el('th',t)));head.append(tr);tabla.append(head);
          const tb=el('tbody');registros.forEach(r=>{const fila=el('tr'),acciones=el('td');fila.append(el('th',r.nombre||r.titulo||r.id));acciones.append(boton('Editar',()=>formulario(r)),boton('Borrar',()=>borrar(r)));fila.append(acciones);tb.append(fila);});tabla.append(tb);
          const scroll=el('div',null,'ke-tabla');scroll.append(tabla);cuerpo.append(scroll);
        }
        async function borrar(r) {
          if(!actual())return;estado.replaceChildren();
          try {
            const dependientes=nombres.filter((n,i)=>Object.values(esquemas[i].campos).some(f=>f.tipo==='referencia'&&f.coleccion===coleccion));
            const deps=await cargar(p,dependientes);if(!actual())return;
            if(dependientes.some(n=>deps[n].some(x=>Object.entries(esquemas[nombres.indexOf(n)].campos).some(([k,f])=>f.coleccion===coleccion&&x[k]===r.id)))){estado.append(el('p','Este registro tiene referencias. Retira primero los registros vinculados.','kit-error'));return;}
            const caja=el('section',null,'tarjeta ke-confirmacion');caja.append(el('p','¿Borrar '+(r.nombre||r.titulo||r.id)+'? Esta acción queda en el historial.'));
            const confirmar=boton('Confirmar borrado',async()=>{if(!actual()||confirmar.disabled)return;confirmar.disabled=true;try{await App.datos.borrar(p.empresa,coleccion,r.id);if(actual())await abrir(coleccion);}catch(e){if(actual()){error(caja,e);confirmar.disabled=false;}}});
            caja.append(confirmar,boton('Cancelar',()=>caja.remove()));estado.append(caja);confirmar.focus();
          }catch(e){if(actual())error(estado,e);}
        }
        function formulario(existente) {
          if(!actual())return;estado.replaceChildren();
          const entrada=existente?{...existente}:{id:'r-'+crypto.randomUUID(),...(base.campos.origen?{origen:'cargada'}:{})};
          let s=K.esquema(base,coleccion,cat,entrada), controles=new Map();
          const form=el('form',null,'ke-form'),previa=el('section',null,'ke-previa');form.noValidate=true;
          cuerpo.replaceChildren(el('h2',(existente?'Editar · ':'Agregar · ')+base.titulo),form,previa);
          function opciones(regla) {return regla.tipo==='referencia'?(listas[regla.coleccion]||[]).map(r=>[r.id,r.nombre||r.titulo||r.id]):(regla.valores||[]).map(v=>[v,etiquetas.get(v)||v]);}
          function crearCampo(k,regla,padre=form) {
            const label=el('label',regla.etiqueta||k),input=el(regla.tipo==='texto-largo'?'textarea':['lista','referencia'].includes(regla.tipo)?'select':'input'),err=el('span','','kit-error');
            input.name=k;input.id='ke-'+k;input.required=!!regla.obligatorio;input.multiple=!!regla.multiple;
            if(input.tagName==='SELECT') {if(!regla.multiple){const o=el('option','Selecciona');o.value='';input.append(o);}opciones(regla).forEach(([valor,texto])=>{const o=el('option',texto);o.value=valor;o.selected=regla.multiple&&entrada[k]?.includes(valor);input.append(o);});}
            else {input.type=regla.tipo==='fecha'?'date':'text';if(regla.tipo==='decimal'){input.inputMode='decimal';input.setAttribute('role','spinbutton');input.setAttribute('aria-valuemin',regla.min);input.setAttribute('aria-valuemax',regla.max);
              input.onkeydown=e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const n=Number(input.value.replace(',','.'))||0;input.value=String(e.key==='Home'?regla.min:e.key==='End'?regla.max:Math.max(regla.min,Math.min(regla.max,n+(e.key==='ArrowUp'?.1:-.1)))).replace('.',',');input.oninput();};}}
            if(!regla.multiple)input.value=entrada[k]??'';
            if(k==='id'&&existente)input.disabled=true;
            err.id=input.id+'-error';input.setAttribute('aria-describedby',err.id);label.append(input,err);padre.append(label);controles.set(k,{input,err});
            input.oninput=()=>{previa.replaceChildren();};input.onchange=()=>{
              previa.replaceChildren();
              if(['indicador','componente'].includes(k)) {entrada[k]=input.value;const nueva=K.esquema(base,coleccion,cat,entrada);const cal=controles.get('calificacion');entrada.calificacion=cal.input.value;cal.input.parentNode.remove();s=nueva;crearCampo('calificacion',s.campos.calificacion);}
            };
          }
          // Reutiliza la organización del formulario legado: nombre, fecha y puntajes agrupados por dimensión.
          const grupos=new Map();
          Object.entries(s.campos).forEach(([k,r])=>{const eje=coleccion==='ddhh-evaluaciones'&&cat.ejes.find(e=>e.id===k);let padre=form;
            if(eje){if(!grupos.has(eje.grafico)){const f=el('fieldset');f.append(el('legend',cat.estandares.find(x=>x.id===eje.estandar).nombre));grupos.set(eje.grafico,f);form.append(f);}padre=grupos.get(eje.grafico);}crearCampo(k,r,padre);});
          if(coleccion==='ddhh-evaluaciones'&&!existente&&registros.length)form.append(boton('Prellenar con la evaluación actual',()=>{const ultima=[...registros].sort((a,b)=>b.fecha.localeCompare(a.fecha))[0];cat.ejes.forEach(e=>{controles.get(e.id).input.value=ultima[e.id]??'';});previa.replaceChildren();}));
          const revisar=el('button','Vista previa','boton');revisar.type='submit';form.append(revisar,boton('Cancelar',tabla));
          form.onsubmit=e=>{
            e.preventDefault();if(!actual())return;previa.replaceChildren();const raw={...entrada};
            controles.forEach(({input},k)=>{raw[k]=s.campos[k].multiple?Array.from(input.options).filter(o=>o.selected).map(o=>o.value):input.value;});
            const resultado=K.validar(raw,s,referencias);
            if(!existente&&registros.some(r=>r.id===raw.id))resultado.errores.push({campo:'id',mensaje:'Ya existe este registro. Usa Editar.'});
            const claves={'ddhh-indicadores':['evaluacion','indicador'],'ddhh-componentes':['evaluacion','componente'],'ddhh-dimensiones':['evaluacion','dimension'],'materialidad-impacto':['tema','grupo'],'materialidad-financiera':['tema','evaluador'],'materialidad-participacion':['grupo']}[coleccion];
            if(claves&&registros.some(r=>r.id!==existente?.id&&claves.every(k=>r[k]===raw[k])))resultado.errores.push({campo:claves.at(-1),mensaje:'Ya existe una calificación o registro para esta combinación. Usa Editar.'});
            controles.forEach(({input,err},k)=>{err.textContent=resultado.errores.filter(x=>x.campo===k).map(x=>x.mensaje).join(' ');input.setAttribute('aria-invalid',String(!!err.textContent));});
            if(resultado.errores.length){controles.get(resultado.errores[0].campo)?.input.focus();return;}
            const registro=JSON.parse(JSON.stringify(resultado.registro));previa.append(el('h3','Revisa los datos antes de guardar'));
            Object.entries(s.campos).forEach(([k,r])=>previa.append(el('p',(r.etiqueta||k)+': '+(typeof registro[k]==='number'?new Intl.NumberFormat('es-CO').format(registro[k]):Array.isArray(registro[k])?registro[k].join(', '):registro[k]||'—'))));
            const confirmar=boton('Confirmar guardado',async()=>{if(!actual()||confirmar.disabled)return;confirmar.disabled=true;try{await App.datos.guardar(p.empresa,coleccion,registro.id,registro);if(actual())await abrir(coleccion);}catch(e){if(actual()){error(previa,e);confirmar.disabled=false;}}});previa.append(confirmar);confirmar.focus();
          };
        }
        tabla();
      }catch(e){if(actual()){cuerpo.replaceChildren();error(cuerpo,e);cuerpo.append(boton('Reintentar',()=>abrir(coleccion)));}}
    }
    await abrir(nombres[0]);return()=>{activo=false;revision++;};
  }
  window.KitEstudiosUI={config,ruta,vacio,error,nombre,cargar,boton,alimentacion};
  ['ddhh','materialidad'].forEach(m=>App.registrarVista(m+'/alimentacion',{async render(c,d,p){try{return await alimentacion(c,d,p,m);}catch(e){if(p.vigente())error(c,e);}}}));
}());
