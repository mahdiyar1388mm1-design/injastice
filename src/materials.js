// ============================================================
//  materials.js — متریال‌های مشترک مدل (رنگ‌های نسخه‌ی Titans)
// ============================================================
import * as THREE from 'three';
import { fabricBump, denimMap, denimBump, ribBump, skinBump, soleMap, irisMap } from './textures.js';

let _mats = null;

export function getMaterials(){
  if (_mats) return _mats;

  const fabric = fabricBump();
  const rib    = ribBump();
  const skinB  = skinBump();

  const mats = {
    // پوست سبز
    skin: new THREE.MeshPhysicalMaterial({
      color: 0x7ca04f, roughness: 0.55, metalness: 0.0,
      clearcoat: 0.08, clearcoatRoughness: 0.6,
      sheen: 0.15, sheenColor: 0xa8cf80, sheenRoughness: 0.7,
      bumpMap: skinB, bumpScale: 0.15,
    }),
    // لب‌ها و نواحی تیره‌تر پوست
    skinDark: new THREE.MeshStandardMaterial({
      color: 0x6b9046, roughness: 0.6,
      bumpMap: skinB, bumpScale: 0.1,
    }),
    // داخل دهان/سوراخ بینی
    mouthDark: new THREE.MeshStandardMaterial({ color: 0x2e2416, roughness: 0.9 }),

    // مو: سبز تیره
    hair: new THREE.MeshStandardMaterial({ color: 0x2b4023, roughness: 0.62, metalness: 0.05 }),
    hairTip: new THREE.MeshStandardMaterial({ color: 0x3a5730, roughness: 0.58 }),

    // کاپشن سفید
    jacketWhite: new THREE.MeshStandardMaterial({
      color: 0xe9e6df, roughness: 0.88, metalness: 0.0,
      bumpMap: fabric, bumpScale: 0.35,
    }),
    // پنل‌های زرشکی
    maroon: new THREE.MeshStandardMaterial({
      color: 0x822341, roughness: 0.85,
      bumpMap: fabric, bumpScale: 0.3,
    }),
    // ربان خاکستری (سرآستین، دم‌پا، شورون)
    ribGray: new THREE.MeshStandardMaterial({
      color: 0xcfcac2, roughness: 0.9, bumpMap: rib, bumpScale: 0.5,
    }),
    // زیپ نقره‌ای
    zipper: new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.35, metalness: 0.9 }),
    zipTape: new THREE.MeshStandardMaterial({ color: 0x8d8a83, roughness: 0.9 }),

    // تیشرت سفید
    tshirt: new THREE.MeshStandardMaterial({
      color: 0xf1efe9, roughness: 0.92, bumpMap: fabric, bumpScale: 0.25,
    }),

    // جین تیره
    denim: new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.94, map: denimMap(),
      bumpMap: denimBump(), bumpScale: 0.4,
    }),
    denimStitch: new THREE.MeshStandardMaterial({ color: 0x54575e, roughness: 0.9 }),

    // کفش
    shoe: new THREE.MeshStandardMaterial({ color: 0x373a41, roughness: 0.85, bumpMap: fabric, bumpScale: 0.2 }),
    sole: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: soleMap() }),
    lace: new THREE.MeshStandardMaterial({ color: 0x83868c, roughness: 0.9 }),
    eyelet: new THREE.MeshStandardMaterial({ color: 0x5a5d64, roughness: 0.4, metalness: 0.8 }),

    // چشم — سفیدی
    eyeWhite: new THREE.MeshPhysicalMaterial({
      color: 0xf3efe8, roughness: 0.14, clearcoat: 1.0, clearcoatRoughness: 0.06,
    }),
    // عنبیه (دیسک فیزیکی)
    eyeIris: new THREE.MeshPhysicalMaterial({
      map: irisMap(), roughness: 0.25, clearcoat: 1.0, clearcoatRoughness: 0.05,
    }),
    // ابرو
    brow: new THREE.MeshStandardMaterial({ color: 0x24351f, roughness: 0.7 }),

    // دوخت زرشکی تیره
    maroonStitch: new THREE.MeshStandardMaterial({ color: 0x5c1830, roughness: 0.9 }),
  };

  _mats = mats;
  return mats;
}

// لیست همه‌ی متریال‌ها (برای وایرفریم)
export function allMaterials(){
  return Object.values(getMaterials());
}
