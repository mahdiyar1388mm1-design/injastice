// ============================================================
//  main.js — صحنه، نور، دوربین، UI، خروجی GLB
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildBeastBoy, modelStats } from './model/beastboy.js';
import { allMaterials } from './materials.js';

// ---------- رندرر ----------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x191c21);

// پس‌زمینه‌ی گرادیان نرم
{
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#23272e');
  gr.addColorStop(0.55, '#1a1d22');
  gr.addColorStop(1, '#101216');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}

// محیط PBR نرم
{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.50;
}

// ---------- دوربین و کنترل ----------
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 60);
camera.position.set(1.55, 1.55, 2.75);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.02, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 0.35;
controls.maxDistance = 7;
controls.maxPolarAngle = 1.72;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.1;

// ---------- نورها ----------
const hemi = new THREE.HemisphereLight(0xe8eeff, 0x39402f, 0.55);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff1dd, 2.8);
key.position.set(2.4, 3.4, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = key.shadow.camera.bottom = -1.4;
key.shadow.camera.right = key.shadow.camera.top = 1.4;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 9;
key.shadow.bias = -0.00018;
key.shadow.normalBias = 0.0008;
key.shadow.radius = 4;
scene.add(key);

const rim = new THREE.DirectionalLight(0xcfe0ff, 1.5);
rim.position.set(-2.6, 2.4, -2.4);
scene.add(rim);

const fill = new THREE.DirectionalLight(0xffffff, 0.55);
fill.position.set(-1.8, 1.4, 2.2);
scene.add(fill);

// ---------- صحنه‌ی زمین ----------
const stage = new THREE.Group();
{
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 72),
    new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.92, metalness: 0.02 })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.receiveShadow = true;
  stage.add(disc);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 0.86, 72),
    new THREE.MeshBasicMaterial({ color: 0x79c257, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.002;
  stage.add(ring);
}
scene.add(stage);

// ---------- ساخت مدل ----------
const loader = document.getElementById('loader');
let model = null;
const { group, build } = buildBeastBoy();

build((builtGroup) => {
  model = builtGroup;
  // شدت بازتاب محیطی ملایم برای همه‌ی متریال‌ها
  model.traverse((o) => {
    if (o.isMesh && o.material){
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if ('envMapIntensity' in m) m.envMapIntensity = 0.55;
      });
    }
  });
  scene.add(model);

  const st = modelStats(model);
  document.getElementById('polycount').textContent =
    `triangles: ${st.tris.toLocaleString('en-US')}  •  vertices: ${st.verts.toLocaleString('en-US')}  •  parts: ${st.meshes}`;

  loader.classList.add('done');
  window.__ready = true;
});

// ---------- تغییر نما (با انیمیشن نرم) ----------
const views = {
  front: { pos: [0.00, 1.05, 3.05], tgt: [0, 0.94, 0] },
  back:  { pos: [0.00, 1.05, -3.05], tgt: [0, 0.94, 0] },
  right: { pos: [-3.05, 1.05, 0.00], tgt: [0, 0.94, 0] },
  left:  { pos: [3.05, 1.05, 0.00], tgt: [0, 0.94, 0] },
  face:  { pos: [0.24, 1.66, 0.66], tgt: [0, 1.59, 0.02] },
  full:  { pos: [1.85, 1.35, 3.25], tgt: [0, 0.92, 0] },
};
let camAnim = null;
function goView(name, instant = false){
  const v = views[name];
  if (!v) return;
  const pEnd = new THREE.Vector3(...v.pos), tEnd = new THREE.Vector3(...v.tgt);
  if (instant){
    camera.position.copy(pEnd); controls.target.copy(tEnd); controls.update();
    return;
  }
  camAnim = {
    t: 0,
    p0: camera.position.clone(), t0: controls.target.clone(),
    p1: pEnd, t1: tEnd,
  };
}

document.querySelectorAll('#view-btns button').forEach((b) => {
  b.addEventListener('click', () => {
    controls.autoRotate = false;
    document.getElementById('btn-rotate').classList.remove('active');
    goView(b.dataset.view);
  });
});

// ---------- دکمه‌ها ----------
document.getElementById('btn-rotate').addEventListener('click', (e) => {
  controls.autoRotate = !controls.autoRotate;
  e.target.classList.toggle('active', controls.autoRotate);
});

let wire = false;
document.getElementById('btn-wire').addEventListener('click', (e) => {
  wire = !wire;
  allMaterials().forEach((m) => { m.wireframe = wire; });
  // متریال‌های محلی کفش و…
  if (model) model.traverse((o) => { if (o.isMesh && o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.wireframe = wire); });
  e.target.classList.toggle('active', wire);
});

document.getElementById('btn-stage').addEventListener('click', (e) => {
  stage.visible = !stage.visible;
  e.target.classList.toggle('active', stage.visible);
});
document.getElementById('btn-stage').classList.add('active');

// ---------- پرست‌های نور ----------
function setLight(preset){
  if (preset === 'studio'){
    key.intensity = 2.8; key.color.set(0xfff1dd); key.position.set(2.4, 3.4, 2.6);
    rim.intensity = 1.5; hemi.intensity = 0.55; fill.intensity = 0.55;
    renderer.toneMappingExposure = 1.12;
  } else if (preset === 'warm'){
    key.intensity = 3.1; key.color.set(0xffd9a8); key.position.set(1.8, 2.8, 2.2);
    rim.intensity = 1.0; hemi.intensity = 0.35; fill.intensity = 0.35;
    renderer.toneMappingExposure = 1.08;
  } else {
    key.intensity = 3.6; key.color.set(0xffffff); key.position.set(0.6, 4.2, 1.2);
    rim.intensity = 2.6; hemi.intensity = 0.18; fill.intensity = 0.15;
    renderer.toneMappingExposure = 1.0;
  }
}
for (const [id, preset] of [['light-studio', 'studio'], ['light-warm', 'warm'], ['light-dram', 'dram']]){
  document.getElementById(id).addEventListener('click', (e) => {
    ['light-studio', 'light-warm', 'light-dram'].forEach((x) => document.getElementById(x).classList.remove('active'));
    e.target.classList.add('active');
    setLight(preset);
  });
}

// ---------- خروجی GLB ----------
function bakeInstancedMeshes(root){
  // تبدیل موقت InstancedMesh به مش معمولی تا داخل GLB کامل بیاید
  const restore = [];
  const bakes = [];
  root.traverse((o) => {
    if (o.isInstancedMesh) bakes.push(o);
  });
  for (const inst of bakes){
    const geos = [];
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    for (let i = 0; i < inst.count; i++){
      inst.getMatrixAt(i, m4);
      const g = inst.geometry.clone().applyMatrix4(m4);
      if (inst.instanceColor){
        inst.getColorAt(i, col);
        const n = g.attributes.position.count;
        const cArr = new Float32Array(n * 3);
        for (let j = 0; j < n; j++){ cArr[j * 3] = col.r; cArr[j * 3 + 1] = col.g; cArr[j * 3 + 2] = col.b; }
        g.setAttribute('color', new THREE.BufferAttribute(cArr, 3));
      }
      geos.push(g.index ? g.toNonIndexed() : g);
    }
    const merged = mergeGeometries(geos, false);
    const mat = inst.material.clone();
    mat.vertexColors = !!inst.instanceColor;
    mat.color.set(0xffffff);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = inst.name + '_baked';
    inst.parent.add(mesh);
    restore.push([inst, mesh]);
    inst.visible = false;
  }
  return () => restore.forEach(([a, b]) => { a.visible = true; b.parent.remove(b); b.geometry.dispose(); });
}

document.getElementById('btn-glb').addEventListener('click', () => {
  if (!model) return;
  const btn = document.getElementById('btn-glb');
  btn.textContent = '⏳ در حال آماده‌سازی…';
  const unbake = bakeInstancedMeshes(model);
  const exporter = new GLTFExporter();
  exporter.parse(model, (res) => {
    unbake();
    const blob = new Blob([res], { type: 'model/gltf-binary' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'beast-boy-titans.glb';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    btn.textContent = '⬇ دانلود مدل (GLB)';
  }, (err) => {
    unbake();
    console.error(err);
    btn.textContent = 'خطا! دوباره تلاش کن';
  }, { binary: true });
});

// ---------- حلقه‌ی رندر ----------
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (camAnim){
    camAnim.t = Math.min(camAnim.t + dt / 0.7, 1);
    const e = camAnim.t < 0.5 ? 4 * camAnim.t ** 3 : 1 - ((-2 * camAnim.t + 2) ** 3) / 2;
    camera.position.lerpVectors(camAnim.p0, camAnim.p1, e);
    controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
    if (camAnim.t >= 1) camAnim = null;
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- API برای اسکرین‌شات و تست ----------
window.__api = {
  setView: (n) => { controls.autoRotate = false; goView(n, true); renderer.render(scene, camera); },
  setLight,
  renderer, scene, camera,
};
