// ============================================================
//  beastboy.js — اسمبلی کامل مدل بیست بوی (نسخه‌ی Titans)
// ============================================================
import * as THREE from 'three';
import { getMaterials } from '../materials.js';
import { buildHead } from './head.js';
import { buildHair } from './hair.js';
import { buildTorso } from './torso.js';
import { buildHand } from './hands.js';
import { buildLegs } from './legs.js';
import { buildShoes } from './shoes.js';

export function buildBeastBoy(){
  const mats = getMaterials();
  const grp = new THREE.Group();
  grp.name = 'BeastBoy';

  const steps = [
    () => grp.add(buildLegs(mats)),
    () => grp.add(buildShoes(mats)),
    () => grp.add(buildTorso(mats)),
    () => grp.add(buildHand(1, mats)),
    () => grp.add(buildHand(-1, mats)),
    () => grp.add(buildHead(mats)),
    () => grp.add(buildHair(mats)),
  ];

  const build = (done) => {
    let i = 0;
    const next = () => {
      if (i >= steps.length){ done(grp); return; }
      steps[i++]();
      requestAnimationFrame(next);
    };
    next();
  };
  return { group: grp, build };
}

export function modelStats(root){
  let tris = 0, verts = 0, meshes = 0;
  root.traverse((o) => {
    if (o.isMesh && o.geometry){
      meshes++;
      const g = o.geometry;
      const count = o.isInstancedMesh ? o.count : 1;
      const t = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
      tris += t * count;
      verts += g.attributes.position.count * count;
    }
  });
  return { tris: Math.round(tris), verts: Math.round(verts), meshes };
}
