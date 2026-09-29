// ============================================================
//  legs.js — لگن و پاهای جین تیره با جیب، دوخت، چروک
// ============================================================
import * as THREE from 'three';
import { loft, tube, M, noise3, gauss } from '../helpers.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function legLoft(sx, mats){
  // چروک‌های ریز + حلقه‌های انباشته روی مچ
  const wrinkle = (t, th) => {
    let w = 1 + 0.016 * noise3(Math.cos(th) * 3, t * 14, Math.sin(th) * 3);
    const y = 0.10 + t * 0.925;
    // انباشت روی مچ (بالای کفش)
    if (y < 0.24){
      w += 0.030 * gauss(y - 0.125, 0.012)
         + 0.026 * gauss(y - 0.155, 0.012)
         + 0.022 * gauss(y - 0.190, 0.014);
    }
    // چروک پشت زانو
    const backness = Math.max(0, -Math.sin(th));
    w += 0.012 * gauss(y - 0.52, 0.045) * backness;
    return w;
  };
  const lf = loft([
    { y: 0.098, rx: 0.0565, rz: 0.0635, cx: sx * 0.100, cz: 0.006 },
    { y: 0.180, rx: 0.0580, rz: 0.0660, cx: sx * 0.100, cz: 0.004 },
    { y: 0.300, rx: 0.0665, rz: 0.0760, cx: sx * 0.099, cz: 0.002 },
    { y: 0.430, rx: 0.0655, rz: 0.0750, cx: sx * 0.098, cz: 0.004 },
    { y: 0.540, rx: 0.0660, rz: 0.0760, cx: sx * 0.098, cz: 0.008 },
    { y: 0.720, rx: 0.0775, rz: 0.0870, cx: sx * 0.096, cz: 0.004 },
    { y: 0.860, rx: 0.0845, rz: 0.0950, cx: sx * 0.094, cz: 0.002 },
    { y: 1.020, rx: 0.0885, rz: 0.0980, cx: sx * 0.093, cz: 0.000 },
  ], { radial: 52, rings: 90, wrinkle });
  return lf;
}

// ---------- نوار دوخت در امتداد یک خط θ روی سطح ----------
function seamLine(lf, th, t0, t1, r, mat, opts = {}){
  const pts = [];
  const N = 24;
  for (let j = 0; j <= N; j++){
    const t = t0 + (j / N) * (t1 - t0);
    const { pos, nrm } = lf.sample(t, th);
    pts.push(pos.clone().addScaledVector(nrm, 0.0016));
  }
  return M(tube(pts, r, { segs: 40, radialSegs: 5 }), mat, { castShadow: false });
}

function ringStitch(lf, t, r, mat, thA = 0, thB = Math.PI * 2){
  const pts = [];
  for (let i = 0; i <= 40; i++){
    const th = thA + (i / 40) * (thB - thA);
    const { pos, nrm } = lf.sample(t, th);
    pts.push(pos.clone().addScaledVector(nrm, 0.0016));
  }
  return M(tube(pts, r, { closed: thB - thA >= Math.PI * 2 - 0.01, segs: 56, radialSegs: 5 }), mat, { castShadow: false });
}

export function buildLegs(mats){
  const grp = new THREE.Group();
  grp.name = 'legs';

  // ---------- لگن ----------
  const pelvisLf = loft([
    { y: 0.975, rx: 0.150, rz: 0.124 },
    { y: 1.040, rx: 0.1485, rz: 0.120 },
    { y: 1.095, rx: 0.1455, rz: 0.116 },
  ], { radial: 56, rings: 30, capEnd: true,
    wrinkle: (t, th) => 1 + 0.012 * noise3(Math.cos(th) * 2, t * 5, Math.sin(th) * 2) });
  grp.add(M(pelvisLf.geometry, mats.denim, { name: 'pelvis' }));

  // کمربند
  const beltLf = loft([
    { y: 1.082, rx: 0.1475, rz: 0.1175 },
    { y: 1.112, rx: 0.1470, rz: 0.1165 },
  ], { radial: 56, rings: 6 });
  grp.add(M(beltLf.geometry, mats.denim, { name: 'waistband' }));
  // دوخت‌های کمربند
  grp.add(ringStitch(beltLf, 0.10, 0.0011, mats.denimStitch));
  grp.add(ringStitch(beltLf, 0.90, 0.0011, mats.denimStitch));
  // بندک‌های کمربند
  for (const th of [0.55, 2.4, 3.14, 3.9, 5.75]){
    const { pos, nrm } = beltLf.sample(0.5, th);
    const loop = new RoundedBoxGeometry(0.011, 0.036, 0.005, 2, 0.002);
    const m = M(loop, mats.denim);
    m.position.copy(pos).addScaledVector(nrm, 0.004);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
    grp.add(m);
  }
  // دکمه
  const btn = new THREE.CylinderGeometry(0.0042, 0.0042, 0.0025, 16);
  btn.rotateX(Math.PI / 2);
  const btnS = beltLf.sample(0.62, Math.PI / 2);
  const btnM = M(btn, mats.zipper, { castShadow: false });
  btnM.position.copy(btnS.pos).addScaledVector(btnS.nrm, 0.002);
  grp.add(btnM);
  // دوخت J زیپ (fly) — فقط یک منحنی ظریف سمت راست
  {
    const pts = [];
    for (let j = 0; j <= 14; j++){
      const f = j / 14;
      const y = 1.076 - f * 0.052;
      const th = Math.PI / 2 + 0.03 + Math.sin(f * 0.9) * 0.14;
      const { pos, nrm } = pelvisLf.sample(Math.min(Math.max((y - 0.975) / 0.12, 0), 1), th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0016));
    }
    grp.add(M(tube(pts, 0.0010, { segs: 20, radialSegs: 5 }), mats.denimStitch, { castShadow: false }));
  }

  // ---------- پاها ----------
  for (const sx of [1, -1]){
    const lf = legLoft(sx, mats);
    grp.add(M(lf.geometry, mats.denim, { name: sx > 0 ? 'legL' : 'legR' }));

    // دوخت کنار پا (سمت بیرون)
    const outerTh = sx > 0 ? 0 : Math.PI;
    grp.add(seamLine(lf, outerTh, 0.02, 0.98, 0.0011, mats.denimStitch));
    // دوخت داخل پا
    const innerTh = sx > 0 ? Math.PI : 0;
    grp.add(seamLine(lf, innerTh, 0.05, 0.97, 0.0009, mats.denimStitch));

    // دو خط دوخت زانو (پچ‌دوزی)
    grp.add(ringStitch(lf, tOf(lf, 0.545), 0.0012, mats.denimStitch));
    grp.add(ringStitch(lf, tOf(lf, 0.505), 0.0012, mats.denimStitch));

    // دوخت لبه‌ی پایین
    grp.add(ringStitch(lf, tOf(lf, 0.118), 0.0011, mats.denimStitch));
  }

  // جیب پشتی راست و چپ (روی لگن)
  for (const sx of [1, -1]){
    const pocket = new RoundedBoxGeometry(0.056, 0.060, 0.008, 3, 0.008);
    const pm = M(pocket, mats.denim, { castShadow: false });
    pm.position.set(sx * 0.057, 1.000, -0.118);
    pm.rotation.x = 0.18;
    pm.rotation.y = sx * 0.30;
    grp.add(pm);
    // دوخت U جیب پشت
    const u = [];
    const center = new THREE.Vector3(sx * 0.057, 1.000, -0.115);
    for (let i = 0; i <= 20; i++){
      const a = Math.PI * (i / 20);
      u.push(new THREE.Vector3(
        Math.cos(a) * 0.022,
        -Math.sin(a) * 0.022 - 0.002,
        -0.1135 + 0.113 // نسبت به مرکز
      ));
    }
    const rot = new THREE.Matrix4().makeRotationY(sx * 0.30).multiply(new THREE.Matrix4().makeRotationX(0.18));
    const u2 = u.map(p => p.applyMatrix4(rot).add(center));
    grp.add(M(tube(u2, 0.0011, { segs: 24, radialSegs: 5 }), mats.denimStitch, { castShadow: false }));
  }

  // جیب رو دسته‌ای جلو (دهانه‌ها)
  for (const sx of [1, -1]){
    const pts = [];
    for (let j = 0; j <= 14; j++){
      const f = j / 14;
      const y = 1.088 - f * 0.052;
      const th = Math.PI / 2 + sx * (0.62 - f * 0.28);
      const { pos, nrm } = pelvisLf.sample(Math.min(Math.max((y - 0.975) / 0.12, 0), 1), th);
      pts.push(pos.clone().addScaledVector(nrm, 0.0018));
    }
    grp.add(M(tube(pts, 0.0013, { segs: 20, radialSegs: 5 }), mats.denimStitch, { castShadow: false }));
  }

  // جیب فلپ پشت ران چپ (طبق مرجع)
  {
    const flap = new RoundedBoxGeometry(0.052, 0.062, 0.012, 3, 0.006);
    const fm = M(flap, mats.denim, { castShadow: false });
    fm.position.set(-0.085, 0.738, -0.0942);
    fm.rotation.y = -0.30;
    grp.add(fm);
    const lid = new RoundedBoxGeometry(0.054, 0.020, 0.013, 3, 0.006);
    const lm = M(lid, mats.denim, { castShadow: false });
    lm.position.set(-0.0858, 0.771, -0.0960);
    lm.rotation.y = -0.30;
    grp.add(lm);
    // دکمه‌ی فلپ
    const b = new THREE.SphereGeometry(0.0038, 10, 8);
    b.translate(-0.0862, 0.7685, -0.0915);
    grp.add(M(b, mats.zipper, { castShadow: false }));
  }

  // سایه‌ی ناحیه‌ی فاق (عمق)
  const crotch = new THREE.SphereGeometry(0.036, 20, 14);
  crotch.scale(0.9, 0.8, 0.95);
  crotch.translate(0, 1.015, 0.015);
  grp.add(M(crotch, mats.denim));

  return grp;
}

function tOf(lf, y){
  // loft پا از 0.098 تا 1.020
  return Math.min(Math.max((y - 0.098) / (1.020 - 0.098), 0), 1);
}
