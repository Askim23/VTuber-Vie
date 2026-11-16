import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// Configuration de la scène Three.js
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20);
camera.position.set(0, 1.4, 1.5); // Centré à hauteur du visage

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Éclairage
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Chargement du modèle VRM avec le plugin officiel
let currentVRM = undefined;
const loader = new GLTFLoader();

// Enregistrement indispensable du plugin VRM pour Three-VRM v3
loader.register((parser) => {
  return new VRMLoaderPlugin(parser);
});

loader.load(
  './assets/perso.vrm', // Assure-toi que ton fichier s'appelle bien comme ça dans assets/
  (gltf) => {
    // Récupération du VRM via les données utilisateur du GLTF
    const vrm = gltf.userData.vrm;

    if (vrm) {
      scene.add(vrm.scene);
      currentVRM = vrm;

      // Rotation pour qu'elle soit face à la caméra
      vrm.scene.rotation.y = Math.PI;
      console.log('Modèle VRM chargé avec succès !', vrm);
    } else {
      console.error("Le fichier chargé n'est pas un VRM valide.");
    }
  },
  (progress) => {
    console.log('Chargement : ' + (progress.loaded / progress.total * 100) + '%');
  },
  (error) => {
    console.error('Erreur lors du chargement du fichier VRM :', error);
  }
);

// Boucle d'animation principale
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (currentVRM) {
    currentVRM.update(delta);
  }

  renderer.render(scene, camera);
}

animate();

// Redimensionnement
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
