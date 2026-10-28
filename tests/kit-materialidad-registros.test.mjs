import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,readdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import M from '../public/kit-vista-materialidad-motor.js';
const muestra=new URL('fixtures/materialidad-publicada-muestra.json',import.meta.url);
const script=new URL('../scripts/kit-materialidad-registros.mjs',import.meta.url);
// fileURLToPath conserva rutas del repositorio con espacios.
import {fileURLToPath} from 'node:url';
const correr=(archivo,salida)=>spawnSync(process.execPath,[fileURLToPath(script),archivo,salida],{encoding:'utf8'});
test('E22: el script genera tres colecciones válidas con datos inventados',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'e22-'));try{
  const resultado=correr(fileURLToPath(muestra),dir);assert.equal(resultado.status,0,resultado.stderr);assert.equal((await readdir(dir)).length,3);
  for(const c of M.colecciones){const rs=JSON.parse(await readFile(join(dir,c+'.json'),'utf8')),s=JSON.parse(await readFile(new URL('../public/config/esquemas/'+c+'.json',import.meta.url),'utf8'));for(const r of rs)assert.equal(M.validar(r,s).ok,true,c);}
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('E22: un valor fuera de escala falla antes de escribir o sobrescribir',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'e22-'));try{
  const dato=JSON.parse(await readFile(muestra,'utf8'));dato.aspectos[0].financiera=6;const archivo=join(dir,'entrada.json'),salida=join(dir,'salida');await writeFile(archivo,JSON.stringify(dato));
  const resultado=correr(archivo,salida);assert.equal(resultado.status,1);assert.match(resultado.stderr,/materialidad-aspectos.*0 a 5/);await assert.rejects(readdir(salida),/ENOENT/);assert.deepEqual(await readdir(dir),['entrada.json']);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('E30: el script conserva notas, agrega pendientes y rechaza vínculos inválidos antes de escribir',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'e30-'));
 try{
  const dato=JSON.parse(await readFile(muestra,'utf8')),archivo=join(dir,'entrada.json'),salida=join(dir,'salida');
  dato.meta.notas='Método inventado';dato.meta.pendientes=['Revisar supuesto inventado'];
  await writeFile(archivo,JSON.stringify(dato));assert.equal(correr(archivo,salida).status,0);
  const resumen=JSON.parse(await readFile(join(salida,'materialidad-resumen.json'),'utf8'))[0];
  assert.equal(resumen.notas,'Método inventado\nRevisar supuesto inventado');
  dato.aspectos[0].tema_id='';await writeFile(archivo,JSON.stringify(dato));
  const resultado=correr(archivo,join(dir,'invalido'));assert.equal(resultado.status,1);assert.match(resultado.stderr,/tema_id/);
  await assert.rejects(readdir(join(dir,'invalido')),/ENOENT/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
