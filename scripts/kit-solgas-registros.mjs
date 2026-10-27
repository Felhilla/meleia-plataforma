/* Preparación local: no abre conexiones ni escribe en la base. */
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, basename} from 'node:path';
import K from '../public/kit-vista-ddhh-modelo.js';
const raiz=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const leer=async(r,base=raiz)=>JSON.parse(await readFile(resolve(base,'public',r),'utf8'));
export async function preparar(base=raiz) {
  const [caso,dimensiones,estandares,evaluaciones,materialidad,empresa,cat]=await Promise.all(['data/caso.json','data/dimensiones.json','data/estandares.json','data/evaluaciones.json','data/materialidad.json','config/empresa-config.json','config/kit-ddhh-catalogo.json'].map(r=>leer(r,base)));
  const listas=Object.fromEntries(Object.values(K.colecciones).flat().map(c=>[c,[]]));
  const limpiar=x=>{
    // Los correos ficticios del Demo A no se muestran en el caso real: «Al correo electrónico de cumplimiento de {empresa}».
    if(typeof x==='string')x=x.replace(/\s*[\w.+-]+@[\w-]+\.example\b/gi,' de cumplimiento de {empresa}');
    if(typeof x==='string')return [empresa.nombre,empresa.nombre_corto].sort((a,b)=>b.length-a.length).reduce((s,n)=>s.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'{empresa}'),x);
    if(Array.isArray(x))return x.map(limpiar);
    if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,limpiar(v)]));return x;
  };
  listas['ddhh-evaluaciones']=evaluaciones.map(e=>({id:e.id,nombre:e.nombre,fecha:e.fecha+'-01',origen:e.origen,...e.puntajes}));
  for(const eje of estandares.ejes) {
    const evaluacion=eje.hallazgos.evaluacion;let n=0;
    for(const g of eje.hallazgos.grupos||[{indicadores:eje.hallazgos.indicadores}])for(const i of g.indicadores){
      const indicador=eje.id+'-i'+(++n);
      listas['ddhh-indicadores'].push({id:evaluacion+'--'+indicador,evaluacion,indicador,calificacion:i.calificacion,incorporado:i.incorporado,descripcion:i.descripcion||'',documentos:i.documentos||'',brecha:i.brecha||'',nota:i.nota||'',origen:i.origen,fila_fuente:i.fila_fuente});
    }
    (eje.criterios||[]).forEach((c,i)=>{const componente=eje.id+'-c'+(i+1);listas['ddhh-componentes'].push({id:evaluacion+'--'+componente,evaluacion,componente,calificacion:c.calificacion});});
  }
  const fuente=evaluaciones.find(e=>e.origen==='fuente');
  if(!fuente)throw Error('No se encontró la evaluación fuente para los hallazgos de las dimensiones.');
  for(const d of [...dimensiones.grandes,...Object.entries(dimensiones.ejes).map(([id,d])=>({id,...d}))])listas['ddhh-dimensiones'].push({id:fuente.id+'--'+d.id,evaluacion:fuente.id,dimension:d.id,hallazgos:d.hallazgos.join('\n'),brechas:d.brechas.join('\n')});
  listas['ddhh-resultados']=[{id:'titular',tipo:'titular',titulo:caso.resultados.titular,orden:0},...caso.resultados.mensajes.map((m,i)=>({id:'mensaje-'+(i+1),tipo:'mensaje',tema:m.tema,titulo:m.titulo,texto:m.texto,orden:i+1}))];
  for(const t of materialidad.temas){
    listas['materialidad-temas'].push({id:t.id,nombre:t.nombre,dimension_esg:t.dimension_esg,descripcion:t.descripcion,ejes:t.ejes,sasb:typeof t.sasb==='string'?t.sasb:t.sasb?Object.values(t.sasb).join(' · '):'',origen:t.origen||materialidad.origen});
    for(const [grupo,e] of Object.entries(t.evaluacion_impacto))listas['materialidad-impacto'].push({id:t.id+'--'+grupo,tema:t.id,grupo,...Object.fromEntries(['escala','alcance','irremediabilidad','probabilidad'].map(k=>[k,e[k]]))});
    for(const [evaluador,e] of Object.entries(t.evaluacion_financiera))listas['materialidad-financiera'].push({id:t.id+'--'+evaluador,tema:t.id,evaluador,rentabilidad:e.rentabilidad,gasto_operativo:e.gasto_operativo});
  }
  listas['materialidad-participacion']=materialidad.grupos.map(g=>({id:g.id,grupo:g.id,mecanismo:g.mecanismo,participantes:g.participantes,descripcion:g.descripcion,origen:g.origen}));
  const resultado=limpiar(listas);
  const referencias=Object.fromEntries(Object.entries(resultado).map(([c,rs])=>[c,new Set(rs.map(r=>r.id))]));
  for(const [c,registros] of Object.entries(resultado)) {
    const esquema=c==='materialidad-temas'?JSON.parse(await readFile(resolve(raiz,'tests/fixtures/materialidad-temas-e21.json'),'utf8')):await leer('config/esquemas/'+c+'.json',base), ids=new Set();
    for(let i=0;i<registros.length;i++) {
      const r=registros[i];if(ids.has(r.id))throw Error(c+': código duplicado '+r.id);ids.add(r.id);
      const v=K.validar(r,K.esquema(esquema,c,cat,r),referencias);
      if(!v.ok)throw Error(c+', registro '+r.id+': '+v.errores.map(e=>e.mensaje).join('; '));
      registros[i]=v.registro;
    }
  }
  return resultado;
}
export async function escribir(destino=resolve(raiz,'privado','carga-'+basename(fileURLToPath(import.meta.url)).split('-')[1]),base=raiz) {
  const listas=await preparar(base); // Validar todo antes de crear o sobrescribir archivos.
  await mkdir(destino,{recursive:true});
  for(const [c,rs] of Object.entries(listas))await writeFile(resolve(destino,c+'.json'),JSON.stringify(rs,null,2)+'\n','utf8');
  return listas;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {const listas=await escribir();console.log(Object.entries(listas).map(([c,rs])=>c+': '+rs.length+' registros válidos').join('\n'));}
  catch(e){console.error('No se preparó la carga: '+e.message);process.exitCode=1;}
}
