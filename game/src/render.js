// Renderer + camera rig. One directional sun with a shadow map, fog, and a
// smoothed third-person / chase camera.
// API: createRender(canvas) -> { renderer, scene, camera, sun,
//   setMode('foot'|'drive'|'orbit'), setOrbitTarget(x,y,z),
//   updateCamera(dt, targetPos, heading, speed01),
//   resize(), setTimeOfDay(hour), timeOfDay }
import * as THREE from '../vendor/three.module.min.js';
import { CONFIG, PALETTE } from './config.js';
import { angleLerp, clamp, damp } from './util.js';

export function createRender(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.fog, 90, 420);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

  // Sunset sky dome: big sphere with a vertical gradient shader.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      horizon: { value: new THREE.Color(PALETTE.skyHorizon) },
    },
    vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vPos; uniform vec3 top; uniform vec3 mid; uniform vec3 horizon;
      void main(){ float h = normalize(vPos).y; vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.8, h)) : mix(horizon, mid, smoothstep(-0.05, 0.25, h)); gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 16), skyMat);
  scene.add(sky);

  // Low sun disc in the west, so the boulevard glows.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  sunDisc.position.set(-620, 95, 120);
  sunDisc.lookAt(0, 40, 0);
  scene.add(sunDisc);

  const hemi = new THREE.HemisphereLight(0x8a7fd6, 0x4a3040, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffc07a, 2.2);
  sun.position.set(-120, 90, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  let mode = 'foot';
  let camYaw = 0;
  let camPitch = 0.32;
  let camDist = 9;
  let timeOfDay = 18.4; // golden hour
  const orbitTarget = new THREE.Vector3(0, 2, 0);
  const desired = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  function setTimeOfDay(hour) {
    timeOfDay = hour;
    // 17:00-19:30 maps sun elevation high->low; keep the dusk look.
    const t = clamp((hour - 17) / 2.5, 0, 1);
    const elev = 1.05 - t * 0.8;
    sun.position.set(-Math.cos(elev) * 140, Math.sin(elev) * 140 + 12, 60);
    sun.intensity = 2.4 - t * 0.9;
    sun.color.setHex(t > 0.7 ? 0xff9a5c : 0xffc07a);
    hemi.intensity = 0.95 - t * 0.3;
  }
  setTimeOfDay(timeOfDay);

  function updateCamera(dt, targetPos, heading, speed01 = 0) {
    const isDrive = mode === 'drive';
    const dist = isDrive ? 10.5 + speed01 * 4 : 8;
    const height = isDrive ? 4.2 : 3.4;
    camDist = damp(camDist, dist, 3, dt);
    // Camera yaw follows the target heading smoothly (chase cam).
    camYaw = angleLerp(camYaw, heading, 1 - Math.exp(-(isDrive ? 3.2 : 5) * dt));
    const cx = targetPos.x - Math.sin(camYaw) * camDist;
    const cz = targetPos.z - Math.cos(camYaw) * camDist;
    desired.set(cx, targetPos.y + height + camPitch * 4, cz);
    camera.position.x = damp(camera.position.x, desired.x, 8, dt);
    camera.position.y = damp(camera.position.y, desired.y, 8, dt);
    camera.position.z = damp(camera.position.z, desired.z, 8, dt);
    if (camera.position.y < 1.2) camera.position.y = 1.2;
    lookAt.set(targetPos.x, targetPos.y + 1.8, targetPos.z);
    camera.lookAt(lookAt);
    // Keep the shadow frustum centred on the action.
    sun.target.position.set(targetPos.x, 0, targetPos.z);
    sun.position.set(targetPos.x - 120, 90, targetPos.z + 60);
  }

  function updateOrbit(dt) {
    camYaw += dt * 0.05;
    const r = 60;
    camera.position.set(
      orbitTarget.x + Math.sin(camYaw) * r,
      orbitTarget.y + 26,
      orbitTarget.z + Math.cos(camYaw) * r,
    );
    camera.lookAt(orbitTarget);
    sun.target.position.copy(orbitTarget);
    sun.position.set(orbitTarget.x - 120, 90, orbitTarget.z + 60);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, sun,
    get mode() { return mode; },
    setMode(m) { mode = m; },
    setOrbitTarget(x, y, z) { orbitTarget.set(x, y, z); },
    setCamYaw(yaw) { camYaw = yaw; },
    addCamYaw(d) { camYaw += d; },
    addCamPitch(d) { camPitch = clamp(camPitch + d, -0.1, 0.9); },
    updateCamera, updateOrbit, resize, setTimeOfDay,
    get timeOfDay() { return timeOfDay; },
    render() { renderer.render(scene, camera); },
  };
}
