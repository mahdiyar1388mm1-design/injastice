// ============================================================
//  hair.js — موهای سبز تیره‌ی ژولیده‌ی بیست بوی
//  کلاهک زیرین + صدها دسته‌ی موی خمیده (InstancedMesh)
// ============================================================
import * as THREE from 'three';
import { deform, rand, randRange, setSeed, gauss, M } from '../helpers.js';
import { P } from './proportions.js';

const H = P.head;

// سطح سر (بیضی)
function surfPoint(d, scale = 1){
  return new THREE.Vector3(d.x * H.rx * scale, d.y * H.ry * scale, d.z * H.rz * scale);
}
function surfNormal(d){
  const n = new THREE.Vector3(d.x / (H.rx * H.rx), d.y / (H.ry * H.ry), d.z / (H.rz * H.rz));
  return n.normalize();
}

// آستانه‌ی خط مو (u = y واحد کره)
function hairThreshold(d){
  const fw = Math.max(0, d.z), bw = Math.max(0, -d.z);
  let th;
  if (fw > 0) th = 0.02 + (0.47 - 0.02) * fw;      // جلو: پیشانی بالاتر
  else        th = 0.02 + (-0.50 - 0.02) * bw;     // پشت: تا پس‌گردن
  // پیک ملایم وسط پیشانی
  if (fw > 0.55) th -= 0.05 * gauss(d.x, 0.22);
  // شقیقه‌ها عقب‌تر
  if (Math.abs(d.x) > 0.55 && fw > 0.15) th += 0.16;
  return th;
}

// ---------- کلاهک زیرین (پوست سر دیده نشود) ----------
function buildUndercap(mats){
  const g = new THREE.SphereGeometry(1, 96, 72);
  deform(g, (v) => {
    const d = v.clone().normalize();
    const th = hairThreshold(d);
    if (d.y > th - 0.06){
      // ناحیه‌ی مو: کمی بیرون + نویز ظریف
      const n = Math.sin(d.x * 37.3 + d.y * 21.7) * Math.sin(d.y * 29.1 + d.z * 41.3) * 0.5;
      const puff = 1.022 + 0.017 * n + 0.012 * gauss(d.y - 0.55, 0.30);
      v.copy(surfPoint(d, puff));
    } else {
      // زیر خط مو: داخل سر پنهان
      v.copy(surfPoint(d, 0.955));
    }
  });
  return M(g, mats.hair, { name: 'haircap' });
}

// ---------- هندسه‌ی یک دسته مو (مخروط خمیده‌ی ناهموار) ----------
function tuftGeometry(){
  const g = new THREE.CylinderGeometry(0.0009, 0.0085, 0.075, 6, 7, false);
  g.translate(0, 0.0375, 0);
  deform(g, (v) => {
    const t = v.y / 0.075;                 // 0..1 از ریشه تا نوک
    // خمیدگی به عقب
    v.z += 0.030 * t * t;
    // ناهمواری
    v.x *= 1 + 0.22 * Math.sin(t * 9.4);
    v.z *= 1 + 0.15 * Math.cos(t * 7.1);
    // پهن‌شدن ملایم ریشه
    if (t < 0.25){ v.x *= 1.35; v.z *= 1.35; }
  });
  return g;
}

// ---------- پخش‌کردن دسته‌ها ----------
export function buildHair(mats){
  setSeed(20240930);
  const grp = new THREE.Group();
  grp.add(buildUndercap(mats));

  const tuft = tuftGeometry();
  const COUNT = 780;
  const mesh = new THREE.InstancedMesh(tuft, new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.60, metalness: 0.04,
  }), COUNT);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.name = 'hairTufts';

  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
  const col = new THREE.Color(), pos = new THREE.Vector3(), dir = new THREE.Vector3();

  const cDark = new THREE.Color(0x22331d);
  const cMid  = new THREE.Color(0x2f4a26);
  const cLite = new THREE.Color(0x46662f);

  const X = new THREE.Vector3(1, 0, 0);
  const Z = new THREE.Vector3(0, 0, 1);

  let placed = 0, guard = 0;
  while (placed < COUNT && guard < 30000){
    guard++;
    const vx = rand() * 2 - 1, vy = rand() * 2 - 1, vz = rand() * 2 - 1;
    const L2 = vx * vx + vy * vy + vz * vz;
    if (L2 > 1 || L2 < 1e-4) continue;
    dir.set(vx, vy, vz).normalize();

    const th = hairThreshold(dir);
    if (dir.y < th + (rand() - 0.40) * 0.10) continue;
    // وسط صورت ممنوع
    if (Math.abs(dir.x) < 0.40 && dir.z > 0.70 && dir.y < 0.60) continue;
    // سوراخ گوش: اطراف گوش مو نباشد
    if (Math.abs(dir.z) < 0.38){
      const earD = Math.hypot(Math.abs(dir.x) - 0.98, dir.y + 0.04, dir.z - 0.02);
      if (earD < 0.24) continue;
    }

    const n = surfNormal(dir);
    pos.copy(surfPoint(dir, 1.0)).addScaledVector(n, 0.0012);

    const topness  = THREE.MathUtils.smoothstep(dir.y, 0.45, 0.85);
    const fringen  = THREE.MathUtils.smoothstep(dir.z, 0.35, 0.75) * (1 - topness) * THREE.MathUtils.smoothstep(dir.y, 0.18, 0.45);
    const sideness = THREE.MathUtils.smoothstep(Math.abs(dir.x), 0.55, 0.92) * (1 - topness);
    const backness = THREE.MathUtils.smoothstep(-dir.z, 0.3, 0.8) * (1 - topness);

    // جهت‌دهی پایه: عمود بر سطح
    q1.setFromUnitVectors(up, n);

    // بالای سر: ژولیده ولی کوتاه، کمی هر طرف
    {
      const axis = new THREE.Vector3(randRange(-1, 1), 0, randRange(-1, 1));
      if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0);
      axis.normalize();
      q2.setFromAxisAngle(axis, topness * randRange(0.10, 0.42));
      q1.premultiply(q2);
      // جلو مایل به پیشانی برای قسمت جلوی تاج
      if (dir.z > 0.2){
        q3.setFromAxisAngle(X, dir.z * topness * randRange(0.15, 0.4));
        q1.premultiply(q3);
      }
    }
    // ریش‌ریش: به سمت جلو، کمتر به پایین
    if (fringen > 0.01){
      q2.setFromAxisAngle(X, randRange(0.35, 0.70) * fringen);
      q1.premultiply(q2);
      // جارویی ملایم به یک سو
      q3.setFromAxisAngle(Z, randRange(-0.15, 0.35) * fringen);
      q1.premultiply(q3);
    }
    // پهلوها: به پایین
    if (sideness > 0.01){
      q2.setFromAxisAngle(Z, -Math.sign(dir.x) * randRange(0.85, 1.30) * sideness);
      q1.premultiply(q2);
    }
    // پشت: به پایین و عقب
    if (backness > 0.01){
      q2.setFromAxisAngle(X, -randRange(0.45, 0.95) * backness);
      q1.premultiply(q2);
    }
    // چرخش ظریف دور خود
    q2.setFromAxisAngle(up, randRange(-0.5, 0.5));
    q1.multiply(q2);

    // طول ناحیه‌ای (کوتاه و تکسچردار)
    let len = randRange(0.55, 1.05);
    len = THREE.MathUtils.lerp(len, randRange(0.80, 1.20), topness);   // تاج کمی بلندتر
    len = THREE.MathUtils.lerp(len, randRange(0.22, 0.38), fringen);  // ریش‌ریش خیلی کوتاه
    len = THREE.MathUtils.lerp(len, randRange(0.26, 0.44), sideness); // پهلو کوتاه
    len = THREE.MathUtils.lerp(len, randRange(0.55, 0.90), backness); // پشت متوسط

    dummy.position.copy(pos);
    dummy.quaternion.copy(q1);
    const w = randRange(0.85, 1.45);
    dummy.scale.set(w, len, w);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);

    const mixv = rand();
    col.copy(mixv < 0.5 ? cDark : cMid).lerp(cLite, topness * 0.55 * rand() + (mixv < 0.12 ? 0.45 : 0));
    mesh.setColorAt(placed, col);

    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  grp.add(mesh);

  // دسته‌های پیش‌گیسو (پیشانی) — چند دسته‌ی ظریف‌تر
  const sideburnGeo = tuftGeometry();
  const sideburns = new THREE.InstancedMesh(sideburnGeo, mesh.material, 60);
  sideburns.castShadow = true;
  let sb = 0;
  for (const sx of [-1, 1]){
    for (let i = 0; i < 10; i++){
      const d = new THREE.Vector3(sx * randRange(0.80, 0.96), randRange(0.06, 0.30), randRange(0.22, 0.42)).normalize();
      const n = surfNormal(d);
      pos.copy(surfPoint(d, 1.0)).addScaledVector(n, 0.002);
      q1.setFromUnitVectors(up, n);
      q2.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -sx * randRange(0.9, 1.3));
      q1.premultiply(q2);
      dummy.position.copy(pos); dummy.quaternion.copy(q1);
      dummy.scale.set(0.55, randRange(0.40, 0.70), 0.55);
      dummy.updateMatrix();
      sideburns.setMatrixAt(sb, dummy.matrix);
      col.copy(cDark).lerp(cMid, rand());
      sideburns.setColorAt(sb, col);
      sb++;
    }
  }
  sideburns.count = sb;
  sideburns.instanceMatrix.needsUpdate = true;
  if (sideburns.instanceColor) sideburns.instanceColor.needsUpdate = true;
  grp.add(sideburns);

  grp.position.set(H.cx, H.cy, H.cz);
  grp.name = 'hair';
  return grp;
}
