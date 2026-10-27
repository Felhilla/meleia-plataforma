import {readFileSync} from 'node:fs';
import vm from 'node:vm';
export const read=p=>readFileSync(new URL('../../public/'+p,import.meta.url),'utf8');
export const json=p=>JSON.parse(read(p));
export class Nodo {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.dataset={};this.style={setProperty(){}};this.className='';this.value='';this._text='';this.inert=false;this.classList={add:(s)=>{this.className+=' '+s;},remove:(s)=>{this.className=this.className.replace(s,'');}};this.listeners={};}
 set textContent(v){this._text=String(v);this.replaceChildren();}
 get textContent(){return this._text+this.children.map(n=>n.textContent).join(' ');}
 append(...ns){ns.forEach(n=>{if(typeof n==='string')n=this.doc.createTextNode(n);n.parentNode=this;this.children.push(n);});}
 replaceChildren(...ns){this.children.forEach(n=>n.parentNode=null);this.children=[];this.append(...ns);}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=v;if(k==='id')this.id=v;}
 getAttribute(k){return this.attrs[k];}
 removeAttribute(k){delete this.attrs[k];}
 addEventListener(k,f){this.listeners[k]=f;}
 removeEventListener(k){delete this.listeners[k];}
 get isConnected(){return this===this.doc.body||!!this.parentNode?.isConnected;}
 get options(){return this.children;}
 todos(){return this.children.flatMap(n=>[n,...n.todos()]);}
 focus(){this.doc.activeElement=this;}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 querySelectorAll(s){return this.todos().filter(n=>s.split(',').some(x=>{x=x.trim();if(x.startsWith('.'))return n.className?.split(' ').includes(x.slice(1));if(x.startsWith('#'))return n.id===x.slice(1);if(x.startsWith('[')){const [,k,v]=x.match(/\[([^=]+)="?([^"\]]+)"?\]/)||[];return n.attrs[k]===v;}return n.tagName===x.split('[')[0].toUpperCase();}));}
 querySelector(s){return this.querySelectorAll(s)[0];}
}
export function registros() {
 const cat=json('config/kit-ddhh-catalogo.json'),cfg=json('config/kit-materialidad-catalogo.json');
 const ev={id:'ev-1',nombre:'Revisión {empresa}',fecha:'2026-02-01',origen:'cargada',...Object.fromEntries(cat.ejes.map(e=>[e.id,3]))};
 const i=cat.indicadores[0];
 return {'ddhh-evaluaciones':[ev], 'ddhh-indicadores':[{id:'indicador-1',evaluacion:'ev-1',indicador:i.id,calificacion:2,descripcion:'{empresa} revisa sus procesos <script>prueba</script>',brecha:'Verificar la mejora'}], 'ddhh-componentes':[], 'ddhh-dimensiones':[{id:'dim-1',evaluacion:'ev-1',dimension:cat.dimensiones.grandes[0].id,hallazgos:'{empresa} tiene un procedimiento',brechas:'Falta seguimiento'}], 'ddhh-resultados':[{id:'r-1',tipo:'titular',titulo:'Resultados de {empresa}',orden:0},{id:'r-2',tipo:'mensaje',tema:'Estándares',titulo:'Mejora continua',texto:'{empresa} debe dar seguimiento',orden:1}],
 'materialidad-temas':[{id:'tema-01',nombre:'Continuidad de {empresa}',dimension_esg:'social',descripcion:'Tema inventado',ejes:[cat.ejes[0].id],origen:'cargada'}],
 'materialidad-impacto':cfg.grupos.map((g,i)=>({id:'i-'+i,tema:'tema-01',grupo:g.id,escala:3,alcance:4,irremediabilidad:2,probabilidad:4})),
 'materialidad-financiera':cfg.evaluadores_financieros.map((g,i)=>({id:'f-'+i,tema:'tema-01',evaluador:g.id,rentabilidad:3,gasto_operativo:4})), 'materialidad-participacion':[]};
}
export async function montar(vista='ddhh/resultados',editar=true,extra={},opciones={}) {
 const document={eventos:{},createElement(t){return new Nodo(t,this);},createElementNS(_,t){return this.createElement(t);},createTextNode(t){const n=new Nodo('#text',this);n.textContent=t;return n;},addEventListener(k,f){this.eventos[k]=f;},removeEventListener(k){delete this.eventos[k];},querySelectorAll(){return [contenedor];},getElementById(id){return this.body.todos().find(n=>n.id===id);}};
 document.body=new Nodo('body',document);const contenedor=new Nodo('main',document);document.body.append(contenedor);
 const consultas=[],guardados=[],borrados=[],historial=[],vistas={},rs={...registros(),...extra};let vigente=true;
 const datos={empresas:async()=>[{id:'empresa-1',nombre:'Empresa Aurora'}],listar:async(e,c)=>{consultas.push([e,c]);return opciones.listar?opciones.listar(e,c,rs):structuredClone(rs[c]||[]);},guardar:async(...args)=>{guardados.push(args);if(opciones.errorGuardar)throw Error('No se pudo guardar');const a=rs[args[1]],i=a.findIndex(r=>r.id===args[2]);if(i<0)a.push(args[3]);else a[i]=args[3];return args[3];},borrar:async(...args)=>{borrados.push(args);rs[args[1]]=rs[args[1]].filter(r=>r.id!==args[2]);},historial:async(...args)=>{historial.push(args);return []}};
 const root={document,Intl,URLSearchParams,crypto:{randomUUID:()=> 'nuevo'},fetch:async p=>{if(!p.startsWith('config/'))throw Error('Lectura no permitida: '+p);return {ok:true,json:async()=>opciones.config?.(p)||json(p)};},App:{datos,el:(t,txt,clase)=>{const n=document.createElement(t);if(txt!=null)n.textContent=txt;n.className=clase||'';return n;},registrarVista:(k,v)=>vistas[k]=v,actualizarVista(){}}};root.window=root;
 const context=vm.createContext(root);
 for(const f of ['kit-validacion.js','kit-vista-ddhh-modelo.js','kit-vista-ddhh-motor.js','kit-vista-ddhh-comun.js','kit-vista-ddhh.js','kit-vista-materialidad-motor.js','kit-vista-materialidad.js'])vm.runInContext(read(f),context);
 const params={empresa:'empresa-1',rol:editar?'responsable':'demostrador',puedeEditar:editar,vigente:()=>vigente};
 const promise=vistas[vista].render(contenedor,datos,params);if(opciones.cancelar)vigente=false;
 const limpiar=await promise;
 return {root,document,contenedor,consultas,guardados,borrados,historial,rs,limpiar,salir(){vigente=false;limpiar?.();}};
}
export const boton=(n,t)=>n.todos().find(x=>x.tagName==='BUTTON'&&x.textContent===t);
export const campo=(n,k)=>n.todos().find(x=>x.name===k);
export const form=n=>n.todos().find(x=>x.tagName==='FORM');
export const submit=()=>({preventDefault(){}});
export const panel=m=>m.document.body.todos().find(n=>n.attrs.role==='dialog');
