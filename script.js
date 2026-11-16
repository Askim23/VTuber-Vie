import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMUtils } from 'https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3/lib/three-vrm.module.js';

// Configuration de la scène Three.js
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20);
camera.position.set(0, 1.4, 1.5); // Centré à hauteur du buste/visage

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Éclairage doux pour le personnage anime
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Chargement du modèle VRM
let currentVRM = undefined;
const loader = new GLTFLoader();

loader.load(
  './assets/perso.vrm',
  (gltf) => {
    VRM.from(gltf).then((vrm) => {
      // Nettoyage et optimisation automatique du VRM
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.removeUnnecessaryJoints(gltf.scene);

      scene.add(vrm.scene);
      currentVRM = vrm;

      // Rotation pour qu'elle soit face à la caméra
      vrm.scene.rotation.y = Math.PI;
    });
  },
  (progress) => console.log('Chargement du modèle...'),
  (error) => console.error('Erreur de chargement VRM :', error)
);

// Boucle d'animation principale
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (currentVRM) {
    // Met à jour la respiration et le clignement automatique des yeux
    currentVRM.update(delta);
  }

  renderer.render(scene, camera);
}

animate();

// Gestion du redimensionnement de la fenêtre
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});