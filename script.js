import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
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

let currentVRM = null;
let mixer = null;
const clock = new THREE.Clock();

// Configuration du chargeur GLTF avec le plugin VRM
const gltfLoader = new GLTFLoader();
gltfLoader.register((parser) => new VRMLoaderPlugin(parser));

// 1. Chargement du modèle VRM
gltfLoader.load(
  './assets/perso.vrm',
  (gltf) => {
    const vrm = gltf.userData.vrm;
    if (!vrm) {
      console.error("Le fichier chargé n'est pas un VRM valide.");
      return;
    }

    scene.add(vrm.scene);
    currentVRM = vrm;
    vrm.scene.rotation.y = Math.PI; // Face à la caméra

    console.log('Modèle VRM chargé avec succès !');

    // 2. Une fois le VRM chargé, on charge l'animation Mixamo
    loadMixamoAnimation('./assets/animations/typing.fbx', vrm);
  },
  (progress) => console.log('Chargement VRM...'),
  (error) => console.error('Erreur chargement VRM :', error)
);

// Fonction pour charger et adapter une animation Mixamo au VRM
function loadMixamoAnimation(url, vrm) {
  const fbxLoader = new FBXLoader();
  fbxLoader.load(
    url,
    (fbx) => {
      const clip = fbx.animations[0];
      if (!clip) {
        console.error("Aucune animation trouvée dans ce fichier FBX.");
        return;
      }

      // Adaptation des pistes d'animation Mixamo pour correspondre au squelette du VRM
      const tracks = [];
      const restRotationInverse = new THREE.Quaternion();
      const parentRestRotationInverse = new THREE.Quaternion();

      clip.tracks.forEach((track) => {
        const trackSplitted = track.name.split('.');
        const mixamoBoneName = trackSplitted[0];
        const propertyName = trackSplitted[1];

        // Recherche de l'os correspondant dans le VRM Humanoid
        // On convertit le nom Mixamo (ex: mixamorigSpine) en nom standard VRM
        let vrmBoneName = mixamoBoneName.replace('mixamorig', '');
        // Première lettre en minuscule pour correspondre aux bones VRM
        vrmBoneName = vrmBoneName.charAt(0).toLowerCase() + vrmBoneName.slice(1);

        const vrmNode = vrm.humanoid.getBoneNode(vrmBoneName);

        if (vrmNode) {
          const trackName = `${vrmNode.name}.${propertyName}`;

          if (propertyName === 'position') {
            // Ajustement de l'échelle (Mixamo est en cm, Three.js en mètres)
            for (let i = 0; i < track.values.length; i++) {
              track.values[i] *= 0.01;
            }
            tracks.push(new THREE.VectorKeyframeTrack(trackName, track.times, track.values));
          } else if (propertyName === 'quaternion') {
            tracks.push(new THREE.QuaternionKeyframeTrack(trackName, track.times, track.values));
          }
        }
      });

      const targetClip = new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);

      // Lancement de l'animation avec le mixer Three.js
      mixer = new THREE.AnimationMixer(vrm.scene);
      const action = mixer.clipAction(targetClip);
      action.play();

      console.log("Animation Mixamo appliquée avec succès !");
    },
    undefined,
    (error) => console.error('Erreur lors du chargement de l’animation FBX :', error)
  );
}

// Boucle d'animation principale
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  if (currentVRM) {
    currentVRM.update(delta);
  }

  renderer.render(scene, camera);
}

animate();

// Redimensionnement de la fenêtre
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});