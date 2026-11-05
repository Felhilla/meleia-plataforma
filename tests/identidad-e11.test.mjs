import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const leer = ruta => readFileSync(new URL('../' + ruta, import.meta.url), 'utf8');
const css = leer('public/estilos.css');
const bloques = [...css.matchAll(/:root(?:\[data-tema="oscuro"\])?\s*\{([^}]+)\}/g)];
const propios = bloques.slice(0, 2).map(m => Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(x => [x[1], x[2]])));
const temas = [propios[0], {...propios[0], ...propios[1]}];
function luminancia(hex) {
  const c = hex.slice(1).match(/../g).map(x => parseInt(x,16)/255).map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
const contraste = (a,b) => { const l = [luminancia(a),luminancia(b)].sort((x,y)=>y-x); return (l[0]+.05)/(l[1]+.05); };
test('E11 conserva diez tokens en ambos temas y calcula AA para texto, señal y criticidad', () => {
  for (const t of temas) {
    for (const nombre of ['principal','secundario','acento','fondo','suave','borde','texto','alta','media','baja']) assert.ok(t[nombre], nombre);
    for (const [a,b] of [['texto','fondo'],['texto','superficie'],['principal','fondo'],['sobre-principal','principal'], ...['alta','media','baja'].map(c=>[c,c+'-fondo']), ...['fondo','superficie','suave','alta-fondo','media-fondo','baja-fondo'].flatMap(f=>[['texto',f],['texto-suave',f]])]) {
      assert.ok(contraste(t[a],t[b]) >= 4.5, `${a}/${b}: ${contraste(t[a],t[b])}`);
    }
    for (const c of ['linea','principal','alta','media','baja']) assert.ok(contraste(t[c],t.superficie) >= 3, `SVG: ${c}`);
  }
});
test('E11 y E40: Fraunces e IBM Plex Sans, solo marca Meleia y variantes de logo por tema', () => {
  const html = leer('public/index.html');
  assert.match(html,/family=Fraunces/); assert.match(html,/family=IBM\+Plex\+Sans/); assert.doesNotMatch(html,/Montserrat|Lato|logo-gh/);
  for (const marca of ['meleia']) for (const variante of ['color','blanco']) {
    const nombre = `logo-${marca}-${variante}.png`;
    const png = readFileSync(new URL('../public/img/'+nombre,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG'); assert.ok(png.length<100000);
    assert.match(html,new RegExp(`class="logo-${variante}" src="img/${nombre}"`));
  }
  assert.match(css,/:root\[data-tema="oscuro"\] \.logo-color \{\s*display:\s*none(?:\s*!important)?;/);
  assert.match(css,/:root\[data-tema="oscuro"\] \.logo-blanco \{\s*display:\s*block(?:\s*!important)?;/);
  assert.match(css,/:root:not\(\[data-tema="claro"\]\) \.logo-blanco/);
});
test('E11 no conserva selectores ni parámetros de paleta en public', () => {
  function revisar(dir) {
    for (const nombre of readdirSync(dir)) {
      const ruta = new URL(nombre,dir);
      if (statSync(ruta).isDirectory()) revisar(new URL(nombre+'/',dir));
      else if (/\.(css|js|html|json|svg)$/.test(nombre)) assert.doesNotMatch(readFileSync(ruta,'utf8'),/data-paleta|\?paleta|dataset\.paleta|get\(['"]paleta/);
    }
  }
  revisar(new URL('../public/',import.meta.url));
});
function iniciar({oscuro=false, guardado=null, bloqueado=false, search=''}={}) {
  const boton={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const document={documentElement:{dataset:{}},getElementById:()=>boton,addEventListener(){}};
  let cambio, escritura;
  const media={matches:oscuro,addEventListener(_,fn){cambio=fn;}};
  const contexto={document,location:{search},localStorage:{getItem(){if(bloqueado) throw Error(); return guardado;},setItem(k,v){if(bloqueado) throw Error(); escritura=[k,v];}},matchMedia:()=>media,addEventListener(){}};
  contexto.window=contexto; vm.runInNewContext(leer('public/app.js'),contexto);
  return {document,boton,media,cambiarSistema(v){media.matches=v;cambio();},escritura:()=>escritura};
}
test('E11 claro predeterminado, sistema oscuro, elección persistente prioritaria y consulta antigua inocua', () => {
  assert.equal(iniciar().document.documentElement.dataset.tema,'claro');
  assert.equal(iniciar({oscuro:true}).document.documentElement.dataset.tema,'oscuro');
  assert.equal(iniciar({oscuro:true,guardado:'claro'}).document.documentElement.dataset.tema,'claro');
  assert.equal(iniciar({guardado:'oscuro'}).document.documentElement.dataset.tema,'oscuro');
  assert.equal(iniciar({search:'?paleta=b'}).document.documentElement.dataset.tema,'claro');
  const r=iniciar(); r.cambiarSistema(true); assert.equal(r.document.documentElement.dataset.tema,'oscuro');
  r.boton.onclick(); assert.equal(r.document.documentElement.dataset.tema,'claro');
  assert.deepEqual(r.escritura(),['gh-meleia-tema','claro']);
  r.cambiarSistema(true); assert.equal(r.document.documentElement.dataset.tema,'claro');
  assert.equal(r.boton.attrs['aria-label'],'Activar tema oscuro');
  assert.equal(r.boton.attrs['aria-pressed'],'false');
  const b=iniciar({bloqueado:true}); assert.doesNotThrow(()=>b.boton.onclick()); assert.equal(b.document.documentElement.dataset.tema,'oscuro');
});
test('arañas legibles a 1440 px: etiquetas >=13 px y diámetro >=340 px con la columna central de 614 px', () => {
  // A 1440 px la columna de la araña mide 614 px (rejilla .8fr · 2.4fr · .8fr en estilos-estandares.css).
  const fuente=leer('public/vista-estandares.js');
  const contexto={window:{},App:{el(){},registrarVista(){}},Intl};
  vm.runInNewContext(fuente.replace(/\}\(\)\);\s*$/,'globalThis.g={ubicarEtiqueta}; }());'),contexto);
  assert.match(leer('public/estilos-estandares.css'),/minmax\(460px, 2\.4fr\)/);
  const dims=JSON.parse(leer('public/data/dimensiones.json')), estandares=JSON.parse(leer('public/data/estandares.json'));
  const lineas=(t,l)=>t.split(/\s+/).reduce((r,p)=>{if(!r.length||r.at(-1).length+p.length+1>l)r.push(p);else r[r.length-1]+=' '+p;return r;},[]);
  for(const tipo of ['etapas-ocde','temas-ddhh']) {
    const ejes=estandares.ejes.filter(e=>e.grafico===tipo);
    const cajas=ejes.map((e,i)=>contexto.g.ubicarEtiqueta(i,ejes.length,lineas(dims.ejes[e.id].corto,13)).caja);
    const ancho=Math.max(300,...cajas.map(c=>c.x+c.ancho))-Math.min(-300,...cajas.map(c=>c.x))+24;
    const escala=614/ancho;
    assert.ok(24*escala>=13,`etiquetas de ${tipo}: ${(24*escala).toFixed(1)} px`);
    assert.ok(600*escala>=340,`diámetro de ${tipo}: ${(600*escala).toFixed(0)} px`);
  }
});
