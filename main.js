gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Three.js: sferă cu shader GLSL (deformare + efect Fresnel) ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg'), antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
cam.position.z = 6;

const U = {
  uTime: { value: 0 },
  uAmp: { value: 0.25 },
  uA: { value: new THREE.Color('#16264a') },
  uB: { value: new THREE.Color('#6fb7c9') },
};

const vertexShader = `
  uniform float uTime, uAmp;
  varying vec3 vN, vV;
  void main(){
    vec3 p = position;
    float d = sin(p.x*2.2+uTime) * sin(p.y*2.6+uTime*1.3) * sin(p.z*2.4+uTime*.8);
    p += normal * d * uAmp;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`;

const fragmentShader = `
  uniform vec3 uA, uB;
  uniform float uAlpha;
  varying vec3 vN, vV;
  void main(){
    float f = pow(1. - abs(dot(vN, vV)), 2.2);
    vec3 c = mix(uA, uB, f) * (.4 + f * 1.4);
    gl_FragColor = vec4(c, uAlpha * (.35 + f));
  }`;

const geo = new THREE.IcosahedronGeometry(1.5, 32);
const solid = new THREE.Mesh(geo, new THREE.ShaderMaterial({
  uniforms: { ...U, uAlpha: { value: 0.9 } }, vertexShader, fragmentShader, transparent: true
}));
const wire = new THREE.Mesh(geo, new THREE.ShaderMaterial({
  uniforms: { ...U, uAlpha: { value: 0.18 } }, vertexShader, fragmentShader, transparent: true, wireframe: true
}));
const orb = new THREE.Group();
orb.add(solid, wire);
scene.add(orb);

const state = { dx: 1 };
function place() {
  const halfW = Math.tan((22.5 * Math.PI) / 180) * 6 * cam.aspect;
  orb.position.x = innerWidth > 900 ? state.dx * halfW * 0.55 : 0;
}
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  place();
}
addEventListener('resize', resize);
resize();

let mx = 0, my = 0;
addEventListener('pointermove', e => {
  mx = (e.clientX / innerWidth - 0.5) * 2;
  my = (e.clientY / innerHeight - 0.5) * 2;
});

const clock = new THREE.Clock();
(function loop() {
  const t = clock.getElapsedTime();
  if (!reduce) U.uTime.value = t * 0.5;
  orb.rotation.y += (t * 0.1 + mx * 0.5 - orb.rotation.y) * 0.05;
  orb.rotation.x += (my * 0.25 - orb.rotation.x) * 0.05;
  renderer.render(scene, cam);
  requestAnimationFrame(loop);
})();

/* ---------- GSAP: sfera se transformă odată cu conținutul secțiunii ---------- */
const dur = reduce ? 0 : 1.4;
function morph(s) {
  const a = new THREE.Color(s.dataset.a), b = new THREE.Color(s.dataset.b), k = +s.dataset.s;
  gsap.to(U.uAmp, { value: +s.dataset.amp, duration: dur });
  gsap.to(U.uA.value, { r: a.r, g: a.g, b: a.b, duration: dur });
  gsap.to(U.uB.value, { r: b.r, g: b.g, b: b.b, duration: dur });
  gsap.to(orb.scale, { x: k, y: k, z: k, duration: dur, ease: 'power2.out' });
  gsap.to(state, { dx: +s.dataset.x, duration: dur, ease: 'power2.inOut', onUpdate: place });
}
document.querySelectorAll('[data-amp]').forEach(s =>
  ScrollTrigger.create({ trigger: s, start: 'top 55%', end: 'bottom 55%', onToggle: self => self.isActive && morph(s) })
);

/* bara de progres */
gsap.to('#bar', { scaleX: 1, ease: 'none', scrollTrigger: { scrub: 0.3, start: 0, end: 'max' } });

/* intrarea din hero: titlul "prinde greutate" (variable font) */
if (!reduce) {
  const tl = gsap.timeline();
  tl.fromTo('.hero-title',
    { fontVariationSettings: '"wght" 100,"opsz" 9,"SOFT" 0', opacity: 0 },
    { fontVariationSettings: '"wght" 700,"opsz" 144,"SOFT" 100', opacity: 1, duration: 2.2, ease: 'power3.out' })
    .from(orb.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 2, ease: 'power3.out' }, 0)
    .from('.hero .lead, .hero .meta', { opacity: 0, y: 16, duration: 0.9, stagger: 0.2 }, 1.2);
}
