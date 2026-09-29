// ============================================================
//  torso.js — تیشرت، کاپشن بمبر سفید-زرشکی (با تمام جزئیات)،
//  آستین‌ها، آست‌ها، زیپ — کاراکتر رو به +Z
// ============================================================
import * as THREE from 'three';
import { loft, loftPatch, tube, M, mergeGeometries, noise3, makeSectionSampler } from '../helpers.js';
import { P } from './proportions.js';

const FRONT = Math.PI / 2;

// ---------- تیشرت سفید ----------
function buildShirt(mats){
  const lf = loft([
    { y: 1.000, rx: 0.148, rz: 0.118 },
    { y: 1.130, rx: 0.142, rz: 0.110 },
    { y: 1.260, rx: 0.150, rz: 0.117 },
    { y: 1.380, rx: 0.156, rz: 0.120 },
    { y: 1.450, rx: 0.148, rz: 0.110 },
    { y: 1.505, rx: 0.074, rz: 0.068 },
  ], { radial: 56, rings: 60, capEnd: true });
  const grp = new THREE.Group();
  grp.add(M(lf.geometry, mats.tshirt, { name: 'shirt' }));

  // یقه‌ی زرشکی تیشرت (ringer)
  const colPts = [];
  for (let i = 0; i <= 40; i++){
    const a = (i / 40) * Math.PI * 2;
    colPts.push(new THREE.Vector3(Math.cos(a) * 0.0725, 1.513, 0.008 + Math.sin(a) * 0.066));
  }
  grp.add(M(tube(colPts, 0.0095, { closed: true, segs: 64, radialSegs: 10 }), mats.maroon));
  return grp;
}

// ---------- یقه‌ی ایستاده کاپشن ----------
function buildCollar(mats, gapOfY, bodySamp){
  const sections = [
    { y: 1.498, rx: 0.116, rz: 0.096, cz: 0.004 },
    { y: 1.528, rx: 0.124, rz: 0.103, cz: 0.002 },
    { y: 1.553, rx: 0.130, rz: 0.108, cz: -0.002 },
  ];
  const lf = loft(sections, {
    radial: 56, rings: 18,
    thetaRange: (t) => {
      const y = 1.498 + t * (1.558 - 1.498);
      const g = gapOfY(y) * 0.92;
      return [FRONT + g / 2, FRONT - g / 2 + Math.PI * 2];
    },
  });
  const grp = new THREE.Group();
  const collar = M(lf.geometry, mats.maroon, { name: 'collar' });
  collar.material = mats.maroon;
  grp.add(collar);

  // لبه‌ی سفید بالای یقه
  const edgePts = [];
  const N = 48;
  for (let i = 0; i <= N; i++){
    const t = 1, thA = lf.thRange(1)[0], thB = lf.thRange(1)[1];
    const th = thA + (i / N) * (thB - thA);
    const { pos, nrm } = lf.sample(t, th);
    edgePts.push(new THREE.Vector3(pos.x + nrm.x * 0.0009, pos.y + 0.0003, pos.z + nrm.z * 0.0009));
  }
  grp.add(M(tube(edgePts, 0.0012, { segs: 64, radialSegs: 8 }), mats.jacketWhite, { castShadow: false }));

  // خط وسط یقه
  const midPts = [];
  for (let i = 0; i <= N; i++){
    const t = 0.55, thA = lf.thRange(t)[0], thB = lf.thRange(t)[1];
    const th = thA + (i / N) * (thB - thA);
    const { pos, nrm } = lf.sample(t, th);
    midPts.push(new THREE.Vector3(pos.x + nrm.x * 0.0012, pos.y, pos.z + nrm.z * 0.0012));
  }
  grp.add(M(tube(midPts, 0.0011, { segs: 48, radialSegs: 6 }), mats.maroonStitch, { castShadow: false }));
  return grp;
}

// ---------- دندانه‌های زیپ ----------
function buildZipTeeth(lf, mats){
  const teeth = [];
  const geo = new THREE.BoxGeometry(0.0028, 0.0050, 0.0022);
  const list = [];
  for (const side of [1, -1]){
    for (let t = 0.035; t <= 0.955; t += 0.0105){
      const [a, b] = lf.thRange(t);
      const th = side > 0 ? a + 0.002 : b - 0.002;
      const { pos, nrm } = lf.sample(t, th);
      list.push({ p: pos.clone().addScaledVector(nrm, 0.0028), n: nrm.clone(), t });
    }
  }
  const inst = new THREE.InstancedMesh(geo, mats.zipper, list.length);
  const dummy = new THREE.Object3D();
  const zAxis = new THREE.Vector3(0, 0, 1);
  list.forEach((it, i) => {
    dummy.position.copy(it.p);
    dummy.quaternion.setFromUnitVectors(zAxis, it.n);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  });
  inst.castShadow = false;
  return inst;
}

// ---------- دستگاه زیپ: نوار + زبانه ----------
function buildZipper(lf, mats){
  const grp = new THREE.Group();
  for (const side of [1, -1]){
    const tape = loftPatch(lf,
      0.03, 0.985,
      (t) => side > 0 ? lf.thRange(t)[0] - 0.036 : lf.thRange(t)[1] + 0.004,
      (t) => side > 0 ? lf.thRange(t)[0] - 0.004 : lf.thRange(t)[1] + 0.036,
      { offset: 0.0032, segU: 6, segV: 30 });
    grp.add(M(tape, mats.zipTape, { castShadow: false }));
  }
  grp.add(buildZipTeeth(lf, mats));

  // زبانه و دستگیره‌ی زیپ پایین سمت چپ
  const [a] = lf.thRange(0.045);
  const { pos, nrm } = lf.sample(0.045, a + 0.002);
  const bodyGeo = new THREE.BoxGeometry(0.0065, 0.0095, 0.0028);
  const slider = M(bodyGeo, mats.zipper, { castShadow: false });
  slider.position.copy(pos).addScaledVector(nrm, 0.004);
  slider.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
  const pullGeo = new THREE.TorusGeometry(0.0042, 0.0011, 8, 16);
  const pull = M(pullGeo, mats.zipper, { castShadow: false });
  pull.position.copy(slider.position).add(new THREE.Vector3(0, -0.0115, 0.0015));
  pull.rotation.x = 0.25;
  grp.add(slider, pull);
  return grp;
}

// ---------- شورون «//» روی پنل سینه ----------
function buildChevron(side, lf, mats, w){
  const grp = new THREE.Group();
  const y = 1.382;
  const t = tForY(lf, y);
  const [tA, tB] = lf.thRange(t);
  const edge = side > 0 ? tA : tB;
  const thMid = side > 0 ? edge + w * 0.55 : edge - w * 0.55;

  const geo = new THREE.BoxGeometry(0.013, 0.058, 0.0035);
  for (const dy of [0.015, -0.015]){
    const { pos, nrm } = lf.sample(tForY(lf, y + dy), thMid);
    const m = M(geo, mats.ribGray, { castShadow: false });
    m.position.copy(pos).addScaledVector(nrm, 0.0045);
    // جهت: نرمال سطح → جلو؛ چرخش حول آن
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
    m.quaternion.copy(q);
    m.rotateZ(side * 0.62);   // شکست مورب به سمت زیپ
    grp.add(m);
  }
  return grp;
}

// t مربوط به y (جستجوی دودویی)
function tForY(lf, y){
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++){
    const mid = (lo + hi) / 2;
    if (lf.samp(mid).y < y) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------- آستین ----------
function buildSleeve(side, mats){
  const sx = side;
  const sections = [
    { y: 0.952, rx: 0.0465, rz: 0.0465, cx: sx * 0.252, cz: 0.032 },
    { y: 1.050, rx: 0.0495, rz: 0.0495, cx: sx * 0.248, cz: 0.026 },
    { y: 1.195, rx: 0.0535, rz: 0.0530, cx: sx * 0.240, cz: 0.014 },
    { y: 1.320, rx: 0.0585, rz: 0.0575, cx: sx * 0.218, cz: 0.006 },
    { y: 1.420, rx: 0.0600, rz: 0.0585, cx: sx * 0.198, cz: 0.000 },
    { y: 1.468, rx: 0.0455, rz: 0.0440, cx: sx * 0.192, cz: 0.000 },
  ];
  const lf = loft(sections, {
    radial: 44, rings: 55, capEnd: true,
    wrinkle: (t, th) => 1 + 0.018 * noise3(Math.cos(th) * 2, t * 9, Math.sin(th) * 2) * (1 - t * 0.5),
  });
  const grp = new THREE.Group();
  grp.add(M(lf.geometry, mats.jacketWhite, { name: 'sleeve' }));

  // پنل زرشکی پشت آستین
  const panel = loftPatch(lf, 0.06, 0.90, 3 * Math.PI / 2 - 0.52, 3 * Math.PI / 2 + 0.52, { offset: 0.0028 });
  grp.add(M(panel, mats.maroon, { castShadow: false }));

  // دور دوخت پنل
  for (const th of [3 * Math.PI / 2 - 0.52, 3 * Math.PI / 2 + 0.52]){
    const pts = [];
    for (let j = 0; j <= 14; j++){
      const t = 0.06 + (j / 14) * 0.84;
      const { pos, nrm } = lf.sample(t, th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0032));
    }
    grp.add(M(tube(pts, 0.0012, { segs: 24, radialSegs: 6 }), mats.maroonStitch, { castShadow: false }));
  }

  // سرآستین ریب
  const cuffLf = loft([
    { y: 0.948, rx: 0.0485, rz: 0.0485, cx: sx * 0.2525, cz: 0.033 },
    { y: 1.014, rx: 0.0505, rz: 0.0505, cx: sx * 0.2500, cz: 0.029 },
  ], { radial: 44, rings: 10 });
  grp.add(M(cuffLf.geometry, mats.ribGray, { name: 'cuff' }));
  // دو نوار زرشکی سرآستین
  for (const tt of [0.30, 0.68]){
    const pts = [];
    for (let i = 0; i <= 28; i++){
      const th = (i / 28) * Math.PI * 2;
      const { pos, nrm } = cuffLf.sample(tt, th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0015));
    }
    grp.add(M(tube(pts, 0.0020, { closed: true, segs: 48, radialSegs: 6 }), mats.maroon, { castShadow: false }));
  }
  // لبه‌ی داخلی سیاه سرآستین (عمق)
  const rimPts = [];
  for (let i = 0; i <= 28; i++){
    const th = (i / 28) * Math.PI * 2;
    const s = cuffLf.samp(0);
    rimPts.push(new THREE.Vector3(s.cx + Math.cos(th) * s.rx * 0.94, 0.9495, s.cz + Math.sin(th) * s.rz * 0.94));
  }
  grp.add(M(tube(rimPts, 0.0035, { closed: true, segs: 48, radialSegs: 6 }), mats.mouthDark, { castShadow: false }));

  // برجستگی‌ مفصل دوخت دور سرآستین
  const seamPts = [];
  for (let i = 0; i <= 28; i++){
    const th = (i / 28) * Math.PI * 2;
    const { pos, nrm } = cuffLf.sample(1, th);
    seamPts.push(pos.clone().addScaledVector(nrm, 0.0012));
  }
  grp.add(M(tube(seamPts, 0.0011, { closed: true, segs: 48, radialSegs: 6 }), mats.maroonStitch, { castShadow: false }));

  // کف شانه (اتصال نرم آستین به بدنه)
  const cap = new THREE.SphereGeometry(0.050, 40, 28);
  cap.scale(1.02, 0.58, 0.88);
  cap.translate(sx * 0.196, 1.446, 0.002);
  grp.add(M(cap, mats.jacketWhite));

  return grp;
}

// ---------- بازوی پوستی (زیر آستین) ----------
function buildArm(side, mats){
  const sx = side;
  const lf = loft([
    { y: 0.928, rx: 0.0245, rz: 0.0245, cx: sx * 0.252, cz: 0.033 },
    { y: 1.05,  rx: 0.0335, rz: 0.0335, cx: sx * 0.246, cz: 0.024 },
    { y: 1.20,  rx: 0.0405, rz: 0.0400, cx: sx * 0.236, cz: 0.012 },
    { y: 1.33,  rx: 0.0460, rz: 0.0445, cx: sx * 0.212, cz: 0.004 },
    { y: 1.44,  rx: 0.0420, rz: 0.0400, cx: sx * 0.188, cz: 0.000 },
  ], { radial: 32, rings: 40 });
  return M(lf.geometry, mats.skin, { name: 'arm' });
}

// ---------- کاپشن ----------
export function buildTorso(mats){
  const grp = new THREE.Group();
  grp.name = 'torso';
  mats.jacketWhite.side = THREE.DoubleSide;
  mats.maroon.side = THREE.DoubleSide;

  grp.add(buildShirt(mats));

  // تابع دهانه‌ی جلو بر اساس ارتفاع
  const gapOfY = (y) => {
    const pts = [[1.03, 0.74], [1.20, 0.60], [1.38, 0.60], [1.505, 0.86]];
    for (let i = 0; i < pts.length - 1; i++){
      const [y0, g0] = pts[i], [y1, g1] = pts[i + 1];
      if (y <= y1){
        const f = THREE.MathUtils.smoothstep((y - y0) / (y1 - y0), 0, 1);
        return g0 + (g1 - g0) * f;
      }
    }
    return pts[pts.length - 1][1];
  };

  // بدنه‌ی اصلی کاپشن
  const bodySections = [
    { y: 1.110, rx: 0.185, rz: 0.150 },
    { y: 1.180, rx: 0.181, rz: 0.143 },
    { y: 1.280, rx: 0.193, rz: 0.152 },
    { y: 1.360, rx: 0.198, rz: 0.156 },
    { y: 1.430, rx: 0.190, rz: 0.148 },
    { y: 1.470, rx: 0.163, rz: 0.130 },
    { y: 1.502, rx: 0.120, rz: 0.100 },
  ];
  const bodyLfSamp = makeSectionSampler(bodySections);
  const bodyLf = loft(bodySections, {
    radial: 64, rings: 80,
    thetaRange: (t) => {
      const y = bodyLfSamp(t).y;
      const g = gapOfY(y);
      return [FRONT + g / 2, FRONT - g / 2 + Math.PI * 2];
    },
    wrinkle: (t, th) => 1 + 0.011 * noise3(Math.cos(th) * 2.4, t * 7.0, Math.sin(th) * 2.4),
  });
  const bodyMesh = M(bodyLf.geometry, mats.jacketWhite, { name: 'jacketBody' });
  grp.add(bodyMesh);

  // کمربند (دم‌پای) ریب
  const bandSections = [
    { y: 1.028, rx: 0.180, rz: 0.146 },
    { y: 1.072, rx: 0.183, rz: 0.149 },
    { y: 1.112, rx: 0.185, rz: 0.150 },
  ];
  const bandSamp = makeSectionSampler(bandSections);
  const bandLf = loft(bandSections, {
    radial: 64, rings: 22,
    thetaRange: (t) => {
      const y = bandSamp(t).y;
      const g = gapOfY(y);
      return [FRONT + g / 2, FRONT - g / 2 + Math.PI * 2];
    },
  });
  grp.add(M(bandLf.geometry, mats.ribGray, { name: 'hemBand' }));
  // دو نوار زرشکی روی کمربند
  for (const tt of [0.32, 0.66]){
    const pts = [];
    const [ha, hb] = bandLf.thRange(tt);
    for (let i = 0; i <= 44; i++){
      const th = ha + (i / 44) * (hb - ha);
      const { pos, nrm } = bandLf.sample(tt, th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0016));
    }
    grp.add(M(tube(pts, 0.0021, { segs: 64, radialSegs: 6 }), mats.maroon, { castShadow: false }));
  }
  // لبه‌ی زیرین کمربند
  {
    const pts = [];
    const [ha, hb] = bandLf.thRange(0);
    for (let i = 0; i <= 44; i++){
      const th = ha + (i / 44) * (hb - ha);
      const { pos, nrm } = bandLf.sample(0.0, th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0012).add(new THREE.Vector3(0, -0.001, 0)));
    }
    grp.add(M(tube(pts, 0.0016, { segs: 64, radialSegs: 6 }), mats.maroonStitch, { castShadow: false }));
  }

  // یقه
  grp.add(buildCollar(mats, gapOfY, bodyLfSamp));

  // پنل‌های زرشکی جلو (دو طرف)
  const panelW = (t) => 0.46 - 0.14 * t;
  for (const side of [1, -1]){
    const patch = loftPatch(bodyLf,
      0.005, 0.975,
      (t) => { const [a, b] = bodyLf.thRange(t); return side > 0 ? a + 0.004 : b - panelW(t) - 0.004; },
      (t) => { const [a, b] = bodyLf.thRange(t); return side > 0 ? a + 0.004 + panelW(t) : b - 0.004; },
      { offset: 0.0030, segU: 22, segV: 40 });
    grp.add(M(patch, mats.maroon, { castShadow: false, name: 'chestPanel' }));
    // شورون‌ها
    grp.add(buildChevron(side, bodyLf, mats, 0.40));
    // دوخت کناری پنل‌ها (خط چرت ظریف)
    for (const wOff of [0.004, null]){
      if (wOff === null) continue;
    }
  }

  // جیب‌های سینه (روی قسمت سفید، کنار پنل‌ها)
  for (const side of [1, -1]){
    const tPk = tForY(bodyLf, 1.295);
    const [tA, tB] = bodyLf.thRange(tPk);
    const base = side > 0 ? tA : tB;
    const thC = side > 0 ? base + 0.78 : base - 0.78;
    const flap = loftPatch(bodyLf,
      tForY(bodyLf, 1.263), tForY(bodyLf, 1.318),
      (t) => thC - side * 0.26, (t) => thC + side * 0.10,
      { offset: 0.0042, segU: 14, segV: 6 });
    grp.add(M(flap, mats.jacketWhite, { castShadow: false }));
    // لبه‌ی بالای جیب (خیاطی)
    const pts = [];
    for (let i = 0; i <= 12; i++){
      const th = (thC - side * 0.28) + i / 12 * (side * 0.40);
      const { pos, nrm } = bodyLf.sample(tForY(bodyLf, 1.320), th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0048));
    }
    grp.add(M(tube(pts, 0.0013, { segs: 16, radialSegs: 6 }), mats.zipTape, { castShadow: false }));
  }

  // پنل‌های زرشکی پشت (نیم‌طوق) — نزدیک‌تر به مرکز
  const BC = 3 * Math.PI / 2;
  for (const [th0, th1] of [[BC - 0.74, BC - 0.38], [BC + 0.38, BC + 0.74]]){
    const strip = loftPatch(bodyLf, 0.01, 0.80, th0, th1, { offset: 0.0030, segU: 20, segV: 36 });
    grp.add(M(strip, mats.maroon, { castShadow: false, name: 'backStrip' }));
  }
  // نوار افقی بالای پشت
  const bandTop = loftPatch(bodyLf, tForY(bodyLf, 1.398), tForY(bodyLf, 1.452), BC - 0.74, BC + 0.74,
    { offset: 0.0030, segU: 40, segV: 8 });
  grp.add(M(bandTop, mats.maroon, { castShadow: false }));

  // دوخت‌های پشت: خط میانی + دو خط کناری
  for (const th of [BC, BC - 0.33, BC + 0.33]){
    const pts = [];
    for (let j = 0; j <= 20; j++){
      const t = 0.06 + (j / 20) * 0.62;
      const { pos, nrm } = bodyLf.sample(t, th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0026));
    }
    grp.add(M(tube(pts, 0.0012, { segs: 36, radialSegs: 6 }), mats.zipTape, { castShadow: false }));
  }
  // دوخت دو طرف بدنه
  for (const th of [0, Math.PI]){
    const pts = [];
    for (let j = 0; j <= 20; j++){
      const t = 0.04 + (j / 20) * 0.85;
      const { pos, nrm } = bodyLf.sample(t, th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0024));
    }
    grp.add(M(tube(pts, 0.0011, { segs: 36, radialSegs: 6 }), mats.zipTape, { castShadow: false }));
  }
  // دوخت روی شانه
  for (const side of [1, -1]){
    const pts = [];
    const t = tForY(bodyLf, 1.462);
    const thC = side > 0 ? 0.62 : Math.PI - 0.62;
    for (let i = 0; i <= 16; i++){
      const th = thC + (i / 16) * 0.66;
      const s = bodyLf.sample(t, th);
      pts.push(s.pos.clone().addScaledVector(s.nrm, 0.0042));
    }
    grp.add(M(tube(pts, 0.0011, { segs: 24, radialSegs: 6 }), mats.zipTape, { castShadow: false }));
  }

  // زیپ
  grp.add(buildZipper(bodyLf, mats));

  // آستین‌ها و بازوها
  grp.add(buildSleeve(1, mats));
  grp.add(buildSleeve(-1, mats));
  grp.add(buildArm(1, mats));
  grp.add(buildArm(-1, mats));

  return grp;
}
