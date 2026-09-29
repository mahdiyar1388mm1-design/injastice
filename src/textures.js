// ============================================================
//  textures.js — بافت‌های procedural با Canvas
// ============================================================
import * as THREE from 'three';

function makeCanvas(size){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}
function toTex(canvas, repeat = 1, srgb = false){
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// ---------- بافت بافتنی ریز (کاپشن/تیشرت) ----------
export function fabricBump(){
  const c = makeCanvas(256), g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2){
    for (let x = 0; x < 256; x += 2){
      const v = 118 + Math.sin(x * 1.7) * 14 + Math.sin(y * 1.3) * 14 + (Math.random() - 0.5) * 26;
      g.fillStyle = `rgb(${v|0},${v|0},${v|0})`;
      g.fillRect(x, y, 2, 2);
    }
  }
  return toTex(c, 6);
}

// ---------- بافت جین (تاویل مورب) ----------
export function denimMap(){
  const c = makeCanvas(256), g = c.getContext('2d');
  g.fillStyle = '#23262e'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++){
    for (let x = 0; x < 256; x += 2){
      const tw = ((x + y) % 4) < 2 ? 8 : -6;
      const n = (Math.random() - 0.5) * 14;
      const base = 34 + tw + n;
      g.fillStyle = `rgb(${base|0},${(base+3)|0},${(base+9)|0})`;
      g.fillRect(x, y, 2, 1);
    }
  }
  // رگه‌های روشن عمودی جین
  g.globalAlpha = 0.10;
  for (let i = 0; i < 60; i++){
    const x = Math.random() * 256;
    g.fillStyle = '#4a5060';
    g.fillRect(x, 0, 1, 256);
  }
  g.globalAlpha = 1;
  return toTex(c, 3, true);
}
export function denimBump(){
  const c = makeCanvas(256), g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++){
    for (let x = 0; x < 256; x += 2){
      const v = 128 + (((x + y) % 4) < 2 ? 24 : -18) + (Math.random() - 0.5) * 22;
      g.fillStyle = `rgb(${v|0},${v|0},${v|0})`;
      g.fillRect(x, y, 2, 1);
    }
  }
  return toTex(c, 3);
}

// ---------- بافت ربان (سرآستین/یقه/دم‌پا) ----------
export function ribBump(){
  const c = makeCanvas(128), g = c.getContext('2d');
  for (let x = 0; x < 128; x++){
    const v = 128 + Math.sin(x * Math.PI / 2) * 70;
    g.fillStyle = `rgb(${v|0},${v|0},${v|0})`;
    g.fillRect(x, 0, 1, 128);
  }
  return toTex(c, 10);
}

// ---------- بافت پوست (منفذ ریز) ----------
export function skinBump(){
  const c = makeCanvas(256), g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++){
    const v = 118 + Math.random() * 26;
    g.fillStyle = `rgb(${v|0},${v|0},${v|0})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
  }
  return toTex(c, 2);
}

// ---------- بافت کفی کفش ----------
export function soleMap(){
  const c = makeCanvas(128), g = c.getContext('2d');
  g.fillStyle = '#232427'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#2c2e33';
  for (let y = 0; y < 128; y += 8) g.fillRect(0, y, 128, 3);
  return toTex(c, 2, true);
}

// ---------- عنبیه چشم (برای دیسک تخت CircleGeometry) ----------
export function irisMap(){
  const c = makeCanvas(256), g = c.getContext('2d');
  const R = 128;
  // عنبیه قهوه‌ای تیره (مثل رایان پاتر)
  const ig = g.createRadialGradient(128, 128, R * 0.18, 128, 128, R);
  ig.addColorStop(0, '#2a1a0d');
  ig.addColorStop(0.45, '#43290f');
  ig.addColorStop(0.75, '#5f3f1c');
  ig.addColorStop(0.94, '#2c1b0c');
  ig.addColorStop(1, '#170d05');
  g.fillStyle = ig; g.fillRect(0, 0, 256, 256);
  // رگه‌های عنبیه
  g.lineWidth = 1.2;
  for (let i = 0; i < 110; i++){
    const a = Math.random() * Math.PI * 2;
    const r0 = R * (0.36 + Math.random() * 0.12), r1 = R * (0.75 + Math.random() * 0.2);
    g.strokeStyle = Math.random() < 0.5 ? '#7a5626' : '#2a1a0d';
    g.globalAlpha = 0.55;
    g.beginPath();
    g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0);
    g.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
    g.stroke();
  }
  g.globalAlpha = 1;
  // مردمک
  g.fillStyle = '#060302';
  g.beginPath(); g.arc(128, 128, R * 0.38, 0, Math.PI * 2); g.fill();
  // بازتاب نور
  g.fillStyle = '#ffffff';
  g.globalAlpha = 0.9;
  g.beginPath(); g.arc(128 - R * 0.30, 128 - R * 0.34, R * 0.10, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 0.35;
  g.beginPath(); g.arc(128 + R * 0.26, 128 + R * 0.30, R * 0.07, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
