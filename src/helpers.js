// ============================================================
//  helpers.js — جعبه‌ابزار هندسه‌سازی procedural
//  Loft: ساخت سطوح نرم بدن/لباس از مقطع‌های متوالی
// ============================================================
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export { mergeGeometries, mergeVertices };

let _seed = 987654321;
export function setSeed(s){ _seed = s >>> 0; }
export function rand(){
  _seed = (_seed * 1664525 + 1013904223) >>> 0;
  return _seed / 4294967296;
}
export function randRange(a, b){ return a + (b - a) * rand(); }

function catmull(p0, p1, p2, p3, t){
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t +
    (2*p0 - 5*p1 + 4*p2 - p3) * t2 +
    (-p0 + 3*p1 - 3*p2 + p3) * t3);
}

export function makeSectionSampler(sections){
  const n = sections.length;
  const pad = (i) => sections[Math.min(Math.max(i, 0), n - 1)];
  return function sample(t){
    t = Math.min(Math.max(t, 0), 1);
    const f = t * (n - 1);
    const i = Math.min(Math.floor(f), n - 2);
    const lt = f - i;
    const s0 = pad(i - 1), s1 = pad(i), s2 = pad(i + 1), s3 = pad(i + 2);
    const g = (k) => catmull(s0[k] ?? 0, s1[k] ?? 0, s2[k] ?? 0, s3[k] ?? 0, lt);
    return { y: g('y'), rx: g('rx'), rz: g('rz'), cx: g('cx'), cz: g('cz') };
  };
}

/**
 * Loft — مش از مقطع‌های بیضی نرم
 * opts:
 *   radial, rings
 *   thetaStart/thetaLength  → قوس ثابت   یا
 *   thetaRange(t) → [th0, th1]           → قوس متغیر با ارتفاع (دهانه‌ی کاپشن)
 *   capStart / capEnd
 *   wrinkle(t,th) → ضریب شعاعی ظریف (چروک)
 */
export function loft(sections, opts = {}){
  const radial  = opts.radial ?? 48;
  const samp    = makeSectionSampler(sections);
  const rings   = opts.rings ?? Math.max(12, (sections.length - 1) * 10);
  const wrinkle = opts.wrinkle || null;

  const thRange = (t) => {
    if (opts.thetaRange) return opts.thetaRange(t);
    return [opts.thetaStart ?? 0, (opts.thetaStart ?? 0) + (opts.thetaLength ?? Math.PI * 2)];
  };

  function pointAt(t, u){
    const s = samp(t);
    const [a, b] = thRange(t);
    const th = a + u * (b - a);
    const c = Math.cos(th), si = Math.sin(th);
    let r = 1;
    if (wrinkle) r *= wrinkle(t, th);
    return new THREE.Vector3(s.cx + s.rx * c * r, s.y, s.cz + s.rz * si * r);
  }
  function thetaAt(t, u){
    const [a, b] = thRange(t);
    return a + u * (b - a);
  }
  function nrmAt(t, u){
    const e = 0.004;
    const p  = pointAt(t, u);
    const pt = pointAt(Math.min(t + e, 1), u).sub(pointAt(Math.max(t - e, 0), u));
    const pq = pointAt(t, Math.min(u + e, 1)).sub(pointAt(t, Math.max(u - e, 0)));
    const n  = new THREE.Vector3().crossVectors(pt, pq).normalize();
    const s = samp(t);
    const out = new THREE.Vector3(p.x - s.cx, 0, p.z - s.cz);
    if (out.lengthSq() > 1e-8 && n.dot(out) < 0) n.negate();
    return n;
  }

  const verts = [], norms = [], uvs = [], idx = [];
  for (let j = 0; j <= rings; j++){
    const t = j / rings;
    for (let i = 0; i <= radial; i++){
      const u = i / radial;
      const p = pointAt(t, u);
      verts.push(p.x, p.y, p.z);
      const nn = nrmAt(t, u);
      norms.push(nn.x, nn.y, nn.z);
      uvs.push(u, t);
    }
  }
  const row = radial + 1;
  for (let j = 0; j < rings; j++){
    for (let i = 0; i < radial; i++){
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.setAttribute('normal',   new THREE.Float32BufferAttribute(norms, 3));
  geometry.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(idx);

  if (opts.capStart || opts.capEnd){
    const parts = [geometry];
    if (opts.capStart) parts.push(capAt(0));
    if (opts.capEnd)   parts.push(capAt(1));
    const merged = mergeGeometries(parts, false);
    if (merged) geometry = merged;
  }
  function capAt(t){
    const s = samp(t), fan = [], fi = [], fuv = [];
    fan.push(s.cx, s.y, s.cz); fuv.push(0.5, 0.5);
    for (let i = 0; i <= radial; i++){
      const p = pointAt(t, i / radial);
      fan.push(p.x, p.y, p.z);
      fuv.push(Math.cos(i / radial * Math.PI * 2) * 0.5 + 0.5, Math.sin(i / radial * Math.PI * 2) * 0.5 + 0.5);
    }
    for (let i = 1; i <= radial; i++) fi.push(0, i + 1, i);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(fan, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2));
    g.setIndex(fi); g.computeVertexNormals();
    return g;
  }

  return {
    geometry,
    sample(t, th){ // th به رادیان
      const [a, b] = thRange(t);
      const u = (th - a) / (b - a);
      return { pos: pointAt(t, u), nrm: nrmAt(t, u), theta: th };
    },
    pointAt, nrmAt, thRange, samp
  };
}

/**
 * loftPatch — وصله‌ای همان‌سطح با یک loft (پنل، جیب، زانویه…)
 * th0/th1 می‌توانند عدد یا تابع t باشند.
 */
export function loftPatch(lf, t0, t1, th0, th1, opts = {}){
  const segU = opts.segU ?? 20, segV = opts.segV ?? 12;
  const offset = opts.offset ?? 0.0022;
  const verts = [], norms = [], uvs = [], idx = [];
  for (let j = 0; j <= segV; j++){
    const t = t0 + (j / segV) * (t1 - t0);
    const a = (typeof th0 === 'function') ? th0(t) : th0;
    const b = (typeof th1 === 'function') ? th1(t) : th1;
    for (let i = 0; i <= segU; i++){
      const th = a + (i / segU) * (b - a);
      const { pos, nrm } = lf.sample(t, th);
      verts.push(pos.x + nrm.x * offset, pos.y + nrm.y * offset, pos.z + nrm.z * offset);
      norms.push(nrm.x, nrm.y, nrm.z);
      uvs.push(i / segU, j / segV);
    }
  }
  const row = segU + 1;
  for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++){
    const a2 = j * row + i, b2 = a2 + 1, c = a2 + row, d = c + 1;
    idx.push(a2, c, b2, b2, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(norms, 3));
  g.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  return g;
}

/**
 * loftZ — loft در امتداد محور Z (کفش، پا)
 * sections: [{z, rx(نیم‌عرض), ry(ارتفاع), cy?, cx?}]
 */
export function loftZ(sections, opts = {}){
  const radial = opts.radial ?? 36;
  const n = sections.length;
  const pad = (i) => sections[Math.min(Math.max(i, 0), n - 1)];
  const samp = (t) => {
    t = Math.min(Math.max(t, 0), 1);
    const f = t * (n - 1);
    const i = Math.min(Math.floor(f), n - 2);
    const lt = f - i;
    const s0 = pad(i-1), s1 = pad(i), s2 = pad(i+1), s3 = pad(i+2);
    const g = (k) => catmull(s0[k] ?? 0, s1[k] ?? 0, s2[k] ?? 0, s3[k] ?? 0, lt);
    return { z: g('z'), rx: g('rx'), ry: g('ry'), cy: g('cy'), cx: g('cx') };
  };
  const rings = opts.rings ?? (n - 1) * 8;
  // قوس: از زیر (π) دور تا زیر — θ از 0..2π ولی ارتفاع از cy
  const verts = [], uvs = [], idx = [];
  for (let j = 0; j <= rings; j++){
    const t = j / rings, s = samp(t);
    for (let i = 0; i <= radial; i++){
      const th = (i / radial) * Math.PI * 2;
      const x = s.cx + s.rx * Math.cos(th);
      const y = s.cy + s.ry * Math.sin(th);
      verts.push(x, y, s.z);
      uvs.push(i / radial, t);
    }
  }
  const row = radial + 1;
  for (let j = 0; j < rings; j++) for (let i = 0; i < radial; i++){
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const parts = [];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  parts.push(g);
  if (opts.capStart || opts.capEnd){
    for (const tt of [opts.capStart ? 0 : -1, opts.capEnd ? 1 : -1]){
      if (tt < 0) continue;
      const s = samp(tt), fan = [s.cx, s.cy, s.z], fi = [], fuv = [0.5, 0.5];
      for (let i = 0; i <= radial; i++){
        const th = (i / radial) * Math.PI * 2;
        fan.push(s.cx + s.rx * Math.cos(th), s.cy + s.ry * Math.sin(th), s.z);
        fuv.push(Math.cos(th) * 0.5 + 0.5, Math.sin(th) * 0.5 + 0.5);
      }
      for (let i = 1; i <= radial; i++) fi.push(0, tt === 0 ? i + 1 : i, tt === 0 ? i : i + 1);
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(fan, 3));
      cg.setAttribute('uv', new THREE.Float32BufferAttribute(fuv, 2));
      cg.setIndex(fi); cg.computeVertexNormals();
      parts.push(cg);
    }
  }
  return parts.length > 1 ? mergeGeometries(parts, false) : g;
}

export function tube(points, radius, opts = {}){
  const curve = new THREE.CatmullRomCurve3(points, opts.closed ?? false, 'catmullrom', opts.tension ?? 0.5);
  return new THREE.TubeGeometry(curve, opts.segs ?? Math.max(16, points.length * 6),
    radius, opts.radialSegs ?? 8, opts.closed ?? false);
}

export function M(geometry, material, opts = {}){
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = opts.castShadow ?? true;
  m.receiveShadow = opts.receiveShadow ?? true;
  if (opts.name) m.name = opts.name;
  return m;
}

export function deform(geometry, fn){
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++){
    v.fromBufferAttribute(pos, i);
    fn(v, i);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function noise3(x, y, z){
  return Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) *
         Math.sin(x * 4.123 + y * 9.456 + z * 17.13) * 0.5;
}

export function gauss(d, s){ return Math.exp(-(d * d) / (2 * s * s)); }

export function capsule(r, len, mat, opts = {}){
  const g = new THREE.CapsuleGeometry(r, len, opts.capSegs ?? 8, opts.radialSegs ?? 16);
  return M(g, mat, opts);
}
