// ============================================================
//  head.js — سر، صورت مجسمه‌شده، چشم/پلک/ابرو/بینی/لب/گوش/گردن
//  فضای محلی: مبدأ مرکز سر (P.head)
// ============================================================
import * as THREE from 'three';
import { deform, mergeGeometries, tube, M, gauss, loft } from '../helpers.js';
import { P } from './proportions.js';

const H = P.head;

// ---------- زمینه‌ی سر: کره‌ی اصلاح‌شده با میدان‌های گاوسی ----------
function buildSkull(mats){
  const g = new THREE.SphereGeometry(1, 160, 120);
  deform(g, (v) => {
    // مقیاس کلی
    v.x *= H.rx; v.y *= H.ry; v.z *= H.rz;
    const { x, y, z } = v;

    const front = Math.max(0, z / H.rz);            // 0..1 جلو
    const faceZone = gauss(Math.abs(x), 0.075);

    // ۱) صاف‌کردن ملایم صفحه‌ی صورت
    if (z > 0) v.z *= 1 - 0.055 * gauss(z, 0.045) * gauss(y - 0.005, 0.085) * faceZone;

    // ۲) شیب پیشانی به عقب
    if (y > 0.045 && z > 0) v.z -= (y - 0.045) * 0.22 * front;

    // ۳) برجستگی استخوان ابرو
    v.z += 0.0050 * gauss(Math.abs(x) - 0.033, 0.017) * gauss(y - 0.053, 0.011) * front;

    // ۴) حفره‌ی چشم (فرورفتگی ملایم)
    v.z -= 0.0058 * gauss(x - 0.037, 0.016) * gauss(y - 0.024, 0.013) * gauss(z - 0.088, 0.020);
    v.z -= 0.0058 * gauss(x + 0.037, 0.016) * gauss(y - 0.024, 0.013) * gauss(z - 0.088, 0.020);

    // ۵) گونه‌ها (سیب گونه‌ای) — خیلی ظریف
    const cb = 0.0022 * gauss(Math.abs(x) - 0.052, 0.016) * gauss(y + 0.014, 0.020) * gauss(z - 0.058, 0.030);
    v.x += Math.sign(x) * cb * 0.8; v.z += cb * 0.6;
    // باریکی میان‌صورت و پهلوهای گونه (لاغری)
    v.x *= 1 - 0.035 * gauss(y + 0.015, 0.035) * front;
    v.x *= 1 - 0.055 * gauss(y + 0.018, 0.042) * gauss(z - 0.040, 0.050);

    // ۶) تپه‌ی لب
    v.z += 0.0030 * gauss(x, 0.028) * gauss(y + 0.052, 0.016) * front;

    // ۷) چانه
    v.z += 0.0075 * gauss(x, 0.020) * gauss(y + 0.094, 0.015) * front;
    v.x *= 1 - 0.05 * gauss(y + 0.098, 0.022) * front;

    // ۸) باریک‌شدن فک به سمت پایین — بیشتر برای فرم صورت کشیده‌تر
    if (y < -0.01){
      const f = Math.min((-0.01 - y) / 0.075, 1);
      v.x *= 1 - 0.165 * f * (1 - gauss(y + 0.10, 0.02) * 0.55);
    }

    // ۹) زاویه‌ی فک (کمی مردانه)
    v.x += Math.sign(x) * 0.0030 * gauss(Math.abs(x) - 0.068, 0.014) * gauss(y + 0.062, 0.018);

    // ۱۰) فرورفتگی شقیقه
    v.x -= Math.sign(x) * 0.0030 * gauss(Math.abs(x) - 0.083, 0.014) * gauss(y - 0.035, 0.025) * gauss(z - 0.03, 0.05);

    // ۱۱) پشت سر کمی صاف
    if (z < 0) v.z *= 0.985;
  });
  const mesh = M(g, mats.skin, { name: 'skull' });
  return mesh;
}

// ---------- چشم ----------
function buildEye(side, mats){
  const grp = new THREE.Group();
  const ex = side * 0.0368, ey = 0.0245, ez = 0.0775;

  // کره‌ی چشم (سفیدی ساده)
  const eyeGeo = new THREE.SphereGeometry(0.0143, 48, 36);
  eyeGeo.scale(1, 1, 0.92);
  const eye = M(eyeGeo, mats.eyeWhite);
  eye.position.set(ex, ey, ez);
  eye.rotation.y = side * -0.06;
  grp.add(eye);

  // عنبیه: دیسک فیزیکی روی قطب جلوی کره
  const iris = M(new THREE.CircleGeometry(0.0059, 28), mats.eyeIris, { castShadow: false, name: 'iris' });
  iris.position.set(ex + side * -0.0004, ey + 0.0005, ez + 0.01305);
  iris.rotation.y = side * -0.06;
  grp.add(iris);

  // پلک بالا: گروه چرخشی — کلاهک + خط مژه + چین پلک همگی فرزند
  const uLid = new THREE.Group();
  uLid.position.set(ex, ey + 0.0006, ez + 0.0006);
  uLid.rotation.set(-0.17, side * -0.10, 0);
  const R = 0.0154, thL = Math.PI * 0.56;
  const capGeo = new THREE.SphereGeometry(R, 44, 30, 0, Math.PI * 2, 0, thL);
  capGeo.scale(1.02, 0.99, 1.03);
  uLid.add(M(capGeo, mats.skin, { name: 'uplid' }));
  // خط مژه روی لبه‌ی کلاهک (نیم‌دایره‌ی جلویی)
  {
    const pts = [];
    const rR = R * Math.sin(thL), rY = R * Math.cos(thL);
    for (let i = 0; i <= 14; i++){
      const a = Math.PI * (0.10 + 0.80 * i / 14);
      pts.push(new THREE.Vector3(Math.cos(a) * rR * 1.01, rY, Math.sin(a) * rR * 1.03));
    }
    uLid.add(M(tube(pts, 0.0005, { segs: 24, radialSegs: 6 }), mats.brow, { castShadow: false }));
    // چین پلک — کمی بالاتر روی سطح کلاهک
    const thF = thL - 0.17, rF = R * Math.sin(thF), rYF = R * Math.cos(thF);
    const fp = [];
    for (let i = 0; i <= 12; i++){
      const a = Math.PI * (0.14 + 0.72 * i / 12);
      fp.push(new THREE.Vector3(Math.cos(a) * rF * 1.005, rYF, Math.sin(a) * rF * 1.015));
    }
    uLid.add(M(tube(fp, 0.0004, { segs: 20, radialSegs: 6 }), mats.skinDark, { castShadow: false }));
  }
  grp.add(uLid);

  // پلک پایین
  const lLid = new THREE.Group();
  lLid.position.set(ex, ey - 0.0003, ez + 0.0004);
  lLid.rotation.set(0.10, side * -0.07, 0);
  const loGeo = new THREE.SphereGeometry(R * 1.005, 44, 30, 0, Math.PI * 2, Math.PI * 0.60, Math.PI * 0.40);
  loGeo.scale(1.01, 1.0, 1.02);
  lLid.add(M(loGeo, mats.skin, { name: 'lolid' }));
  grp.add(lLid);

  return grp;
}

// ---------- ابرو ----------
function buildBrow(side, mats){
  // رشته‌ای از کره‌های هم‌پوشان با تیپ مخروطی — فرم مستقیم، کمی پایین به سمت بینی
  const pts = [
    [0.0115, 0.0438, 0.0905, 0.0032],
    [0.021,  0.0458, 0.0940, 0.0036],
    [0.031,  0.0472, 0.0952, 0.0036],
    [0.041,  0.0480, 0.0946, 0.0032],
    [0.050,  0.0474, 0.0910, 0.0026],
    [0.057,  0.0456, 0.0865, 0.0019],
    [0.062,  0.0430, 0.0810, 0.0012],
  ];
  const geos = pts.map(([x, y, z, r]) => {
    const s = new THREE.SphereGeometry(r, 12, 10);
    s.scale(1.5, 0.85, 0.75);
    s.translate(side * x, y, z);
    return s;
  });
  const g = mergeGeometries(geos, false);
  const mesh = M(g, mats.brow, { name: 'brow' });
  return mesh;
}

// ---------- بینی ----------
function buildNose(mats){
  const parts = [];
  const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => {
    const s = new THREE.SphereGeometry(r, 24, 18);
    s.scale(sx, sy, sz); s.translate(x, y, z);
    return s;
  };
  // پل بینی
  const bridge = new THREE.CapsuleGeometry(0.0062, 0.030, 8, 20);
  bridge.scale(0.92, 1, 1.05);
  bridge.rotateX(0.22);
  bridge.translate(0, 0.012, 0.0945);
  parts.push(bridge);
  // نوک
  parts.push(sph(0.0068, 0, -0.0085, 0.1018, 1, 0.92, 1));
  // بال‌های بینی
  parts.push(sph(0.0072, -0.0092, -0.0165, 0.0960, 1.35, 0.72, 0.95));
  parts.push(sph(0.0072,  0.0092, -0.0165, 0.0960, 1.35, 0.72, 0.95));
  // ستون میانی زیر نوک
  parts.push(sph(0.0040, 0, -0.0215, 0.0970, 1, 0.70, 1));
  // اتصال به بالای لب
  parts.push(sph(0.0048, 0, -0.0250, 0.0935, 0.9, 1.1, 0.9));

  const g = mergeGeometries(parts, false);
  const mesh = M(g, mats.skin, { name: 'nose' });

  // سوراخ‌های بینی (دو نقطه‌ی تیره‌ی ظریف)
  const holes = [];
  for (const sx of [-1, 1]){
    const h = new THREE.SphereGeometry(0.0026, 10, 8);
    h.scale(1.15, 0.7, 1.3);
    h.translate(sx * 0.0063, -0.0220, 0.0985);
    holes.push(h);
  }
  const holeMesh = M(mergeGeometries(holes, false), mats.mouthDark);

  const grp = new THREE.Group();
  grp.add(mesh, holeMesh);
  return grp;
}

// ---------- دهان ----------
function buildMouth(mats){
  const grp = new THREE.Group();

  // خط لب — لبخند ملایم
  const seamPts = [
    new THREE.Vector3(-0.0225, -0.0490, 0.0905),
    new THREE.Vector3(-0.0110, -0.0518, 0.0960),
    new THREE.Vector3( 0.0000, -0.0528, 0.0971),
    new THREE.Vector3( 0.0110, -0.0518, 0.0960),
    new THREE.Vector3( 0.0225, -0.0490, 0.0905),
  ];
  const seam = M(tube(seamPts, 0.00085, { segs: 24, radialSegs: 6 }), mats.mouthDark);
  grp.add(seam);

  // لب بالا — دو برجستگی (کمان کوپیدن)
  const lipMat = mats.skinDark;
  const up = [];
  for (const sx of [-1, 1]){
    const s = new THREE.SphereGeometry(0.0056, 16, 12);
    s.scale(1.9, 0.62, 0.72);
    s.translate(sx * 0.0068, -0.0485, 0.0950);
    up.push(s);
  }
  // بریدگی وسط لب بالا
  const mid = new THREE.SphereGeometry(0.0038, 12, 10);
  mid.scale(1.4, 0.42, 0.6); mid.translate(0, -0.0500, 0.0962);
  up.push(mid);
  grp.add(M(mergeGeometries(up, false), lipMat));

  // لب پایین — پرتر
  const lo = new THREE.SphereGeometry(0.0080, 20, 14);
  lo.scale(2.35, 0.62, 0.55);
  lo.translate(0, -0.0578, 0.0938);
  const loMesh = M(lo, mats.skin);
  grp.add(loMesh);

  // چین خنده‌ی ظریف دو سمت دهان
  for (const sx of [-1, 1]){
    const pts = [
      new THREE.Vector3(sx * 0.0140, -0.0345, 0.0915),
      new THREE.Vector3(sx * 0.0215, -0.0415, 0.0885),
      new THREE.Vector3(sx * 0.0245, -0.0480, 0.0865),
    ];
    grp.add(M(tube(pts, 0.0006, { segs: 12, radialSegs: 6 }), mats.skinDark));
  }
  // شیار پایین لب/چانه
  const chinPts = [
    new THREE.Vector3(-0.008, -0.0685, 0.0910),
    new THREE.Vector3( 0.000, -0.0700, 0.0924),
    new THREE.Vector3( 0.008, -0.0685, 0.0910),
  ];
  grp.add(M(tube(chinPts, 0.00055, { segs: 12, radialSegs: 6 }), mats.skinDark));

  return grp;
}

// ---------- گوش (انستانی — نسخه‌ی لایو‌اکشن) ----------
function buildEar(side, mats){
  const parts = [];
  // صدف گوش — نسبتاً تخت و چسبیده به سر
  const bowl = new THREE.SphereGeometry(0.0155, 20, 16);
  bowl.scale(0.50, 1.0, 0.74);
  parts.push(bowl);
  // حلقه‌ی هلیکس
  const helix = new THREE.TorusGeometry(0.0128, 0.0040, 10, 24, Math.PI * 1.55);
  helix.rotateZ(Math.PI * 0.72);
  helix.scale(0.72, 1.15, 0.72);
  helix.translate(0.0018, 0.0030, 0);
  parts.push(helix);
  // لاله
  const lobe = new THREE.SphereGeometry(0.0062, 12, 10);
  lobe.scale(0.72, 0.9, 0.75); lobe.translate(0.0008, -0.0135, 0.0005);
  parts.push(lobe);
  // تراگوس
  const tragus = new THREE.SphereGeometry(0.0038, 10, 8);
  tragus.translate(0.0048, -0.0020, 0.0108);
  parts.push(tragus);
  // ضدهلیکس
  const anti = new THREE.TorusGeometry(0.0075, 0.0024, 8, 16, Math.PI * 0.9);
  anti.rotateZ(Math.PI * 0.5);
  anti.scale(0.8, 1, 0.55);
  anti.translate(0.0012, 0.0005, 0.004);
  parts.push(anti);

  const g = mergeGeometries(parts, false);
  const mesh = M(g, mats.skin, { name: 'ear' });
  const grp = new THREE.Group();
  grp.add(mesh);
  // سایه‌ی مجرای گوش
  const canal = new THREE.SphereGeometry(0.0028, 8, 8);
  canal.translate(0.0042, -0.0045, 0.0083);
  grp.add(M(canal, mats.mouthDark));

  grp.position.set(side * 0.0916, -0.004, 0.002);
  grp.rotation.y = side * -0.34;   // چسبیده به جمجمه
  grp.rotation.z = side * -0.10;
  grp.scale.setScalar(1.06);
  if (side < 0) grp.scale.x *= -1;
  return grp;
}
// توجه: scale منفی نرمال‌ها را می‌چرخاند؛ برای گوش با متریال DoubleSide حل می‌شود.

// ---------- گردن ----------
function buildNeck(mats){
  const lf = loft([
    { y: -0.185, rx: 0.070, rz: 0.062, cz: 0.002 },
    { y: -0.120, rx: 0.060, rz: 0.056, cz: 0.004 },
    { y: -0.070, rx: 0.052, rz: 0.050, cz: 0.008 },
  ], { radial: 40, rings: 20, capStart: true });
  return M(lf.geometry, mats.skin);
}

// ---------- چربی/عضله‌ی زیر چانه (اتصال نرم سر و گردن) ----------
function buildJawBlend(mats){
  const s = new THREE.SphereGeometry(0.052, 32, 24);
  s.scale(1.15, 0.62, 0.9);
  s.translate(0, -0.085, 0.020);
  return M(s, mats.skin);
}

export function buildHead(mats){
  const grp = new THREE.Group();
  mats.skin.side = THREE.DoubleSide; // برای گوش آینه‌ای

  grp.add(buildSkull(mats));
  grp.add(buildEye(1, mats));
  grp.add(buildEye(-1, mats));
  grp.add(buildBrow(1, mats));
  grp.add(buildBrow(-1, mats));
  grp.add(buildNose(mats));
  grp.add(buildMouth(mats));
  grp.add(buildEar(1, mats));
  grp.add(buildEar(-1, mats));
  grp.add(buildNeck(mats));
  grp.add(buildJawBlend(mats));

  grp.position.set(H.cx, H.cy, H.cz);
  grp.name = 'head';
  return grp;
}
