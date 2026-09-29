// ============================================================
//  hands.js — دست‌های باز و رها‌شده با انگشت‌های مجزا و ناخن
//  sx: +1 دست چپ کاراکتر (+X) / -1 دست راست
//  فضای محلی: مچ در مبدأ، انگشتان رو به -Y، کف دست رو به +Z
// ============================================================
import * as THREE from 'three';
import { mergeGeometries, deform, M, tube } from '../helpers.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function fingerGeo(len, r, curl, spread, knuckleX){
  // کپسول اصلی
  const g = new THREE.CapsuleGeometry(r, len - r * 2, 8, 14);
  g.translate(0, -(len / 2 + r * 0.4), 0);
  // خمیدگی تدریجی به سمت کف دست (+Z)
  deform(g, (v) => {
    const t = Math.min(-v.y / len, 1);
    v.z += curl * t * t * len;
    v.y += curl * 0.25 * t * t * len;
  });
  // نوک انگشت کمی باریک‌تر (با deform شعاعی)
  deform(g, (v) => {
    const t = Math.min(-v.y / len, 1);
    const taper = 1 - 0.22 * Math.max(0, (t - 0.55) / 0.45);
    v.x *= taper; v.z *= taper;
  });
  // بازشدن ملایم انگشتان
  const rot = new THREE.Matrix4().makeRotationZ(spread);
  g.applyMatrix4(rot);
  g.translate(knuckleX, 0, 0.002);
  return g;
}

export function buildHand(sx, mats){
  const skinParts = [], nailParts = [];

  // کف دست اصلی
  const palm = new RoundedBoxGeometry(0.058, 0.066, 0.022, 4, 0.010);
  palm.translate(0, -0.039, 0);
  skinParts.push(palm);
  // پاشنه‌ی کف دست
  const heel = new THREE.SphereGeometry(0.0285, 20, 16);
  heel.scale(0.98, 0.85, 0.42);
  heel.translate(0, -0.009, -0.002);
  skinParts.push(heel);
  // ردیف بندها
  const knuckRow = new THREE.SphereGeometry(0.0305, 20, 16);
  knuckRow.scale(1.02, 0.48, 0.42);
  knuckRow.translate(0, -0.069, 0);
  skinParts.push(knuckRow);

  // مچ
  const wrist = new THREE.SphereGeometry(0.0235, 20, 16);
  wrist.scale(1, 0.9, 0.85);
  wrist.translate(0, 0.004, 0);
  skinParts.push(wrist);

  // انگشتان: [x شروع, طول, شعاع, خم, بازشدگی]
  const fingers = [
    { x: -0.0205, len: 0.0495, r: 0.00475, curl: 0.54, spread: -0.045 }, // کوچک
    { x: -0.0070, len: 0.0630, r: 0.00520, curl: 0.48, spread: -0.015 }, // حلقه
    { x:  0.0068, len: 0.0680, r: 0.00530, curl: 0.44, spread:  0.005 }, // میانی
    { x:  0.0200, len: 0.0615, r: 0.00500, curl: 0.50, spread:  0.030 }, // اشاره
  ];
  for (const f of fingers){
    const fx = f.x * sx;
    const fg = fingerGeo(f.len, f.r, f.curl, f.spread * sx, fx);
    fg.translate(0, -0.069, 0);
    skinParts.push(fg);

    // ناخن: روی نوک هر انگشت (سمت پشت دست، -Z)
    const tipY = -0.069 - (f.len + f.r * 0.4) + f.curl * 0.25 * f.len;
    const tipZ = 0.002 + f.curl * f.len;
    const spreadShift = Math.sin(f.spread * sx) * (f.len * 0.9);
    const nail = new THREE.SphereGeometry(f.r * 0.92, 12, 10);
    nail.scale(0.85, 0.9, 0.38);
    nail.translate(fx + -spreadShift, tipY + 0.002, tipZ - f.r * 0.72);
    nailParts.push(nail);
  }

  // شست: دو تکه با زاویه
  const thumbBaseX = sx * 0.027;
  const t1 = new THREE.CapsuleGeometry(0.0060, 0.021, 8, 14);
  deform(t1, (v) => { const t = Math.min(-v.y / 0.027, 1); v.z += 0.20 * t * t * 0.027; });
  t1.rotateZ(sx * 0.85); t1.rotateX(-0.22);
  t1.translate(thumbBaseX, -0.028, 0.0055);
  skinParts.push(t1);
  const t2 = new THREE.SphereGeometry(0.0055, 14, 12);
  t2.scale(1, 1.18, 0.95);
  t2.rotateZ(sx * 0.55);
  t2.translate(sx * 0.0385, -0.0415, 0.0075);
  skinParts.push(t2);
  const tn = new THREE.SphereGeometry(0.0049, 10, 8);
  tn.scale(0.9, 1.0, 0.38);
  tn.translate(sx * 0.0438, -0.0485, 0.0045);
  nailParts.push(tn);

  // برجستگی‌های ظریف قلم‌بندها
  for (const kx of [-0.020, -0.0065, 0.007, 0.020]){
    const k = new THREE.SphereGeometry(0.0058, 10, 8);
    k.scale(1, 0.7, 0.5);
    k.translate(kx * sx, -0.0685, 0.0088);
    skinParts.push(k);
  }

  const skinGeo = mergeGeometries(skinParts.map(g2 => g2.index ? g2.toNonIndexed() : g2), false);
  const nailGeo = mergeGeometries(nailParts, false);

  const grp = new THREE.Group();
  grp.add(M(skinGeo, mats.skin, { name: 'hand' }));
  grp.add(M(nailGeo, mats.skinDark, { name: 'nails', castShadow: false }));

  // چین‌های کف دست (خطوط ظریف)
  const creaseMat = mats.skinDark;
  const c1 = tube([
    new THREE.Vector3(sx * 0.018, -0.027, 0.0105),
    new THREE.Vector3(0, -0.038, 0.0115),
    new THREE.Vector3(-sx * 0.016, -0.046, 0.0105),
  ], 0.0006, { segs: 16, radialSegs: 5 });
  grp.add(M(c1, creaseMat, { castShadow: false }));

  // جهت‌دهی نهایی در جهان
  grp.rotation.z = sx * 0.005;
  grp.rotation.y = sx * -0.05;
  grp.rotation.x = -0.03;
  grp.position.set(sx * 0.2525, 0.926, 0.034);
  grp.name = sx > 0 ? 'handL' : 'handR';
  return grp;
}
