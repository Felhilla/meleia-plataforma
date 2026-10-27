import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile,mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import K from '../public/kit-vista-ddhh-modelo.js';
const raiz=new URL('../',import.meta.url);
const script=(await readdir(new URL('scripts/',raiz))).find(n=>n.startsWith('kit-')&&n.endsWith('-registros.mjs'));
const {preparar,escribir}=await import(new URL('scripts/'+script,raiz));
const leer=async p=>JSON.parse(await readFile(new URL(p,raiz),'utf8'));
test('E21: todos los registros de carga validan, mantienen evidencia y no guardan el nombre',async()=>{
 const listas=await preparar(),cat=await leer('public/config/kit-ddhh-catalogo.json');
 const refs=Object.fromEntries(Object.entries(listas).map(([c,rs])=>[c,new Set(rs.map(r=>r.id))]));
 assert.equal(Object.values(listas).flat().length,382);assert.equal(listas['ddhh-indicadores'].length,159);
 for(const [c,rs] of Object.entries(listas)){const base=await leer('public/config/esquemas/'+c+'.json');for(const r of rs)assert.equal(K.validar(r,K.esquema(base,c,cat,r),refs).ok,true,c+'/'+r.id);}
 const nombre=(await leer('public/config/empresa-config.json')).nombre_corto;
 assert.ok(!JSON.stringify(listas).toLowerCase().includes(nombre.toLowerCase()));assert.match(JSON.stringify(listas),/\{empresa\}/);
 assert.ok(listas['ddhh-indicadores'].some(r=>r.calificacion===null));
 assert.ok(!JSON.stringify(listas['materialidad-temas']).includes('riesgo-'));
 const destino=await mkdtemp(join(tmpdir(),'e21-carga-'));try{await escribir(destino);assert.equal((await readdir(destino)).length,9);for(const [c,rs] of Object.entries(listas))assert.deepEqual(JSON.parse(await readFile(join(destino,c+'.json'),'utf8')),rs);}finally{await rm(destino,{recursive:true,force:true});}
});
test('E21: carga falla antes de escribir si un puntaje está fuera de escala',async()=>{
 const base=await mkdtemp(join(tmpdir(),'e21-invalido-'));try{
  await cp(new URL('public/config/',raiz),join(base,'public/config'),{recursive:true});await cp(new URL('public/data/',raiz),join(base,'public/data'),{recursive:true});
  const ruta=join(base,'public/data/evaluaciones.json'),ev=JSON.parse(await readFile(ruta,'utf8'));ev[0].puntajes['etapa-ocde-1']=8;await writeFile(ruta,JSON.stringify(ev));
  await assert.rejects(()=>escribir(join(base,'salida'),base),/ddhh-evaluaciones.*0 a 5/);await assert.rejects(()=>readdir(join(base,'salida')),/ENOENT/);
 }finally{await rm(base,{recursive:true,force:true});}
});
// El encargo exige conservar el legado: sus nombres preexistentes quedan fijados
// por huella, no mediante una exclusión general de carpetas o archivos nuevos.
const legado=JSON.parse(await readFile(new URL('fixtures/e21-legado-huellas.json',import.meta.url),'utf8'));
test('E21: ningún archivo nuevo incorpora nombres del caso; legado inalterado y usos existentes del identificador',async()=>{
 const nombre=(await leer('public/config/empresa-config.json')).nombre_corto.toLowerCase();
 const caso=(await leer('public/config/kit-modulos.json')).modulos.find(m=>m.id==='ddhh').casos[0].toLowerCase();
 async function visitar(dir){for(const item of await readdir(new URL(dir,raiz),{withFileTypes:true})){const p=dir+'/'+item.name;if(item.isDirectory()){await visitar(p);continue;}const bytes=await readFile(new URL(p,raiz)),t=bytes.toString('utf8').toLowerCase();
   if(!t.includes(nombre)&&!t.includes(caso))continue;
   const conocido=legado[p];assert.ok(conocido,'Nombre de caso no permitido en '+p);
   if(conocido.sha256)assert.equal(createHash('sha256').update(bytes).digest('hex'),conocido.sha256,p);
   else {assert.equal(t.split(caso).length-1,conocido.identificadores,p);assert.ok(!t.includes(nombre));}
 }}
 for(const dir of ['public','docs','tests','scripts'])await visitar(dir);
});
test('E21: catálogo sin hallazgos, puntajes ni documentos de empresa',async()=>{
 const cat=await leer('public/config/kit-ddhh-catalogo.json');
 const revisar=o=>{if(!o||typeof o!=='object')return;for(const [k,v]of Object.entries(o)){assert.ok(!['hallazgos','brechas','calificacion','documentos','incorporado','fila_fuente'].includes(k),'Campo propio de empresa: '+k);revisar(v);}};
 // Las leyendas de calificación son metodología, no mediciones.
 const {calificacion,...catalogo}=cat;assert.ok(calificacion.brechas.niveles.length);revisar(catalogo);
});
