// ============================================================
//  shoes.js — کتانی‌های تیره: رویه، زیره، بند، زبانه، توکپ
//  فضای محلی: ساق در x=0، پا رو به +Z، زمین y=0
// ============================================================
import * as THREE from 'three';
import { loftZ, tube, M, deform, mergeGeometries, gauss } from '../helpers.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function shoeStitchMat(){
  return new THREE.MeshStandardMaterial({ color: 0x6e7278, roughness: 0.9 });
}

function buildUpper(mats){
  const sections = [
    { z: -0.078, rx: 0.0330, ry: 0.038, cy: 0.046, cx: 0 },
    { z: -0.058, rx: 0.0395, ry: 0.049, cy: 0.042, cx: 0 },
    { z: -0.025, rx: 0.0428, ry: 0.062, cy: 0.039, cx: 0 },
    { z:  0.012, rx: 0.0438, ry: 0.053, cy: 0.037, cx: 0 },
    { z:  0.058, rx: 0.0445, ry: 0.045, cy: 0.035, cx: 0 },
    { z:  0.108, rx: 0.0455, ry: 0.038, cy: 0.033, cx: 0 },
    { z:  0.158, rx: 0.0430, ry: 0.030, cy: 0.031, cx: 0 },
    { z:  0.192, rx: 0.0320, ry: 0.021, cy: 0.028, cx: 0 },
  ];
  const g = loftZ(sections, { radial: 40, rings: 80, capStart: true, capEnd: true });
  // فرورفتگی ناحیه‌ی قلاب (جایی که پا داخل می‌شود) + خط بند
  deform(g, (v) => {
    const laceZone = gauss(v.z - 0.005, 0.048) * gauss(v.x, 0.026);
    const topness = THREE.MathUtils.smoothstep(v.y, 0.055, 0.10);
    v.y -= 0.022 * laceZone * topness;
    // پف ملایم رویه دو طرف
    v.x *= 1 + 0.03 * gauss(v.z - 0.02, 0.06) * topness;
  });
  return g;
}

// ---------- خط‌کشی زیره ----------
function soleOutline(){
  const s = new THREE.Shape();
  // نقش پنجه: از پاشنه تا نوک (z طول، x عرض) — در صفحه X/Y شکل، بعد می‌چرخانیم
  s.moveTo(-0.034, -0.062);
  s.bezierCurveTo(-0.044, -0.066, -0.046, -0.030, -0.045, -0.005);
  s.bezierCurveTo(-0.044, 0.030, -0.050, 0.080, -0.048, 0.115);
  s.bezierCurveTo(-0.046, 0.160, -0.034, 0.185, -0.010, 0.190);
  s.bezierCurveTo( 0.014, 0.193,  0.036, 0.170,  0.042, 0.130);
  s.bezierCurveTo( 0.046, 0.090,  0.043, 0.040,  0.042,  0.005);
  s.bezierCurveTo( 0.041, -0.030,  0.042, -0.062,  0.030, -0.068);
  s.bezierCurveTo( 0.015, -0.074, -0.015, -0.072, -0.034, -0.062);
  return s;
}

function buildShoe(sx, mats){
  const grp = new THREE.Group();
  const stitch = shoeStitchMat();

  // رویه
  grp.add(M(buildUpper(mats), mats.shoe, { name: 'upper' }));

  // توکپ (قسمت جلویی کمی تیره‌تر + دوخت مرزی)
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2d3036, roughness: 0.88 });
  const capSections = [
    { z:  0.100, rx: 0.0468, ry: 0.0395, cy: 0.0328, cx: 0 },
    { z:  0.145, rx: 0.0448, ry: 0.0320, cy: 0.0310, cx: 0 },
    { z:  0.192, rx: 0.0330, ry: 0.0220, cy: 0.0280, cx: 0 },
  ];
  const cap = loftZ(capSections, { radial: 40, rings: 30, capEnd: true });
  grp.add(M(cap, capMat, { name: 'toecap', castShadow: false }));
  // دوخت مرز توکپ (نیم‌دایره‌ای دور قسمت جلو)
  {
    const pts = [];
    for (let i = 0; i <= 20; i++){
      const a = Math.PI * (i / 20);  // از یک طرف به طرف دیگر از بالا
      const x = Math.cos(a) * 0.0465;
      const y = 0.0335 + Math.sin(a) * 0.0315;
      pts.push(new THREE.Vector3(x, y, 0.102));
    }
    grp.add(M(tube(pts, 0.0009, { segs: 24, radialSegs: 5 }), stitch, { castShadow: false }));
  }

  // زیره
  const soleGeo = new THREE.ExtrudeGeometry(soleOutline(), {
    depth: 0.024, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.004, bevelSegments: 3, curveSegments: 32,
  });
  soleGeo.rotateX(-Math.PI / 2);
  soleGeo.translate(0, 0.028, 0);
  const sole = M(soleGeo, mats.sole, { name: 'sole' });
  grp.add(sole);
  // خط دوخت میان‌زیره (دور تا دور)
  {
    const pts = [];
    const shp = soleOutline().getPoints(60);
    for (const p of shp) pts.push(new THREE.Vector3(p.x, 0.0335, -p.y));
    grp.add(M(tube(pts, 0.0009, { closed: true, segs: 90, radialSegs: 5 }), stitch, { castShadow: false }));
  }

  // زبانه
  const tongue = new RoundedBoxGeometry(0.040, 0.014, 0.070, 3, 0.006);
  const tg = M(tongue, mats.shoe, { name: 'tongue', castShadow: false });
  tg.position.set(0, 0.075, 0.012);
  tg.rotation.x = -0.30;
  grp.add(tg);

  // بندها — ۵ ردیف ضربدری + گره
  {
    const rows = [-0.012, 0.002, 0.016, 0.030, 0.044];
    const laceGeos = [];
    rows.forEach((z, i) => {
      const spread = 0.0195, yTop = 0.088 - i * 0.0035;
      const p1 = new THREE.Vector3(-spread, yTop - 0.004, z + 0.006);
      const p2 = new THREE.Vector3(spread, yTop, z - 0.002);
      const mid = new THREE.Vector3(0, yTop + 0.006, z + 0.002);
      laceGeos.push(tube([p1, mid, p2], 0.0016, { segs: 12, radialSegs: 6 }));
      const p3 = new THREE.Vector3(spread, yTop - 0.004, z + 0.006);
      const p4 = new THREE.Vector3(-spread, yTop, z - 0.002);
      laceGeos.push(tube([p3, mid.clone().add(new THREE.Vector3(0, 0.0022, 0.0018)), p4], 0.0016, { segs: 12, radialSegs: 6 }));
    });
    // گره و دو حلقه
    const knot = new THREE.SphereGeometry(0.0035, 8, 8);
    knot.translate(0, 0.0835, 0.050);
    laceGeos.push(knot);
    for (const b of [-1, 1]){
      const loop = new THREE.TorusGeometry(0.0062, 0.0015, 6, 12);
      loop.rotateY(Math.PI / 2 + b * 0.5);
      loop.translate(b * 0.0075, 0.0820, 0.050);
      laceGeos.push(loop);
    }
    // دو نوک آویز
    laceGeos.push(tube([
      new THREE.Vector3(0.003, 0.082, 0.051),
      new THREE.Vector3(0.012, 0.068, 0.058),
      new THREE.Vector3(0.017, 0.055, 0.055),
    ], 0.0015, { segs: 10, radialSegs: 6 }));
    laceGeos.push(tube([
      new THREE.Vector3(-0.003, 0.082, 0.051),
      new THREE.Vector3(-0.010, 0.070, 0.062),
      new THREE.Vector3(-0.014, 0.058, 0.060),
    ], 0.0015, { segs: 10, radialSegs: 6 }));
    grp.add(M(mergeGeometries(laceGeos.map(g2 => g2.toNonIndexed()), false), mats.lace, { name: 'laces', castShadow: false }));
  }
  // سوراخ‌های بند
  {
    const holes = [];
    for (const z of [-0.012, 0.002, 0.016, 0.030, 0.044]){
      for (const b of [-1, 1]){
        const h = new THREE.CylinderGeometry(0.0030, 0.0030, 0.0022, 10);
        h.rotateX(Math.PI / 2); h.rotateZ(b * 0.4);
        h.translate(b * 0.0205, 0.086 - Math.abs(z) * 0.10, z + 0.002);
        holes.push(h);
      }
    }
    grp.add(M(mergeGeometries(holes.map(g2 => g2.toNonIndexed()), false), mats.eyelet, { castShadow: false }));
  }

  // یقه‌ی نرم دور مچ (داخل دهانه)
  {
    const collarGeo = new THREE.TorusGeometry(0.0305, 0.0082, 10, 24);
    collarGeo.rotateX(Math.PI / 2);
    collarGeo.scale(1, 1, 1.35);
    const cg = M(collarGeo, capMat, { name: 'ankleCollar', castShadow: false });
    cg.position.set(0, 0.093, -0.022);
    grp.add(cg);
    // عمق تاریک داخل کفش
    const void_ = new THREE.CircleGeometry(0.026, 20);
    void_.rotateX(-Math.PI / 2);
    void_.scale(1, 1, 1.45);
    const vm = M(void_, mats.mouthDark, { castShadow: false, receiveShadow: false });
    vm.position.set(0, 0.088, -0.020);
    grp.add(vm);
  }

  // دو دوخت طولی کناره‌ی رویه
  for (const b of [-1, 1]){
    const pts = [];
    for (let i = 0; i <= 16; i++){
      const f = i / 16;
      const z = -0.055 + f * 0.145;
      const y = 0.045 + Math.sin(f * Math.PI) * 0.028;
      pts.push(new THREE.Vector3(b * (0.0425 + 0.003 * Math.sin(f * 3)), y, z));
    }
    grp.add(M(tube(pts, 0.0008, { segs: 20, radialSegs: 5 }), stitch, { castShadow: false }));
  }

  // زبانه‌ی عقب
  {
    const tab = new THREE.TorusGeometry(0.006, 0.0022, 6, 12, Math.PI);
    tab.rotateZ(Math.PI);
    tab.translate(0, 0.098, -0.072);
    grp.add(M(tab, mats.lace, { castShadow: false }));
  }

  // جایگذاری در جهان
  grp.position.set(sx * 0.100, 0, 0.008);
  grp.rotation.y = sx * 0.055;
  grp.name = sx > 0 ? 'shoeL' : 'shoeR';
  return grp;
}

export function buildShoes(mats){
  const grp = new THREE.Group();
  grp.name = 'shoes';
  grp.add(buildShoe(1, mats));
  grp.add(buildShoe(-1, mats));
  return grp;
}
