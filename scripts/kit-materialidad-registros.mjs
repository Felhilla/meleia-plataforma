/* Preparación local de resultados publicados. Valida todo antes de escribir. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import M from '../public/kit-vista-materialidad-motor.js';
const leer=async p=>JSON.parse(await readFile(p,'utf8'));
export async function preparar(archivo){
  const entrada=await leer(archivo);
  if(!entrada.meta||typeof entrada.meta!=='object'||!Array.isArray(entrada.meta.pendientes)||!entrada.meta.pendientes.every(x=>typeof x==='string'))throw Error('meta: se requiere un resumen y una lista de pendientes de texto.');
  const {pendientes,...meta}=entrada.meta;
  const listas={'materialidad-resumen':[{...meta,id:'resumen',notas:pendientes.join('\n')}]};
  for(const [clave,c] of [['temas','materialidad-temas'],['impacto_top','materialidad-impacto-top'],['financiera_top','materialidad-financiera-top'],['convergencia','materialidad-convergencia']]){
    if(!Array.isArray(entrada[clave]))throw Error(clave+': se requiere una lista.');
    listas[c]=entrada[clave].map(r=>{
      if(!r||typeof r!=='object'||Array.isArray(r))throw Error(c+': registro inválido.');
      const copia={...r};
      if(clave==='convergencia')for(const k of ['grupos_interes','rentabilidad','gasto']){
        if(typeof r[k]!=='boolean')throw Error(c+'/'+r.id+': '+k+' debe ser sí/no (booleano).');
        copia[k]=r[k]?'Sí':'No';
      }
      return copia;
    });
  }
  for(const [c,rs] of Object.entries(listas)){
    const s=await leer(new URL('../public/config/esquemas/'+c+'.json',import.meta.url)),ids=new Set(),puestos=new Set();
    for(let i=0;i<rs.length;i++){
      const r=rs[i],v=M.validar(r,s);
      const extras=Object.keys(r).filter(k=>!s.campos[k]);
      if(extras.length)throw Error(c+'/'+r.id+': campos desconocidos: '+extras.join(', '));
      if(ids.has(r.id))throw Error(c+': código duplicado '+r.id);ids.add(r.id);
      const puesto=r.puesto??r.orden,clave=(r.variable||'')+'/'+puesto;
      if(puesto!==undefined){if(puestos.has(clave))throw Error(c+': puesto u orden duplicado '+puesto);puestos.add(clave);}
      if(!v.ok)throw Error(c+'/'+r.id+': '+v.errores.map(e=>e.mensaje).join('; '));
      rs[i]=v.registro;
    }
  }
  return listas;
}
export async function escribir(archivo,destino){
  const listas=await preparar(archivo);
  await mkdir(destino,{recursive:true});
  for(const [c,rs] of Object.entries(listas))await writeFile(resolve(destino,c+'.json'),JSON.stringify(rs,null,2)+'\n');
  return listas;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==4)throw Error('Uso: node scripts/kit-materialidad-registros.mjs <archivo> <carpeta de salida>');
    const listas=await escribir(process.argv[2],process.argv[3]);
    console.log(Object.entries(listas).map(([c,rs])=>c+': '+rs.length+' registros válidos').join('\n'));
  }catch(e){console.error('No se preparó la carga: '+e.message);process.exitCode=1;}
}
