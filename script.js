import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 20);
camera.position.set(0, 1.4, 3); // reculé pour voir le corps (les anims sont en pied)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(1, 1, 1).normalize();
scene.add(dirLight);

// ---------- Correspondance os Mixamo -> os humanoïdes VRM ----------
const mixamoVRMRigMap = {
  mixamorigHips: 'hips', mixamorigSpine: 'spine', mixamorigSpine1: 'chest',
  mixamorigSpine2: 'upperChest', mixamorigNeck: 'neck', mixamorigHead: 'head',
  mixamorigLeftShoulder: 'leftShoulder', mixamorigLeftArm: 'leftUpperArm',
  mixamorigLeftForeArm: 'leftLowerArm', mixamorigLeftHand: 'leftHand',
  mixamorigLeftHandThumb1: 'leftThumbMetacarpal', mixamorigLeftHandThumb2: 'leftThumbProximal',
  mixamorigLeftHandThumb3: 'leftThumbDistal', mixamorigLeftHandIndex1: 'leftIndexProximal',
  mixamorigLeftHandIndex2: 'leftIndexIntermediate', mixamorigLeftHandIndex3: 'leftIndexDistal',
  mixamorigLeftHandMiddle1: 'leftMiddleProximal', mixamorigLeftHandMiddle2: 'leftMiddleIntermediate',
  mixamorigLeftHandMiddle3: 'leftMiddleDistal', mixamorigLeftHandRing1: 'leftRingProximal',
  mixamorigLeftHandRing2: 'leftRingIntermediate', mixamorigLeftHandRing3: 'leftRingDistal',
  mixamorigLeftHandPinky1: 'leftLittleProximal', mixamorigLeftHandPinky2: 'leftLittleIntermediate',
  mixamorigLeftHandPinky3: 'leftLittleDistal',
  mixamorigRightShoulder: 'rightShoulder', mixamorigRightArm: 'rightUpperArm',
  mixamorigRightForeArm: 'rightLowerArm', mixamorigRightHand: 'rightHand',
  mixamorigRightHandThumb1: 'rightThumbMetacarpal', mixamorigRightHandThumb2: 'rightThumbProximal',
  mixamorigRightHandThumb3: 'rightThumbDistal', mixamorigRightHandIndex1: 'rightIndexProximal',
  mixamorigRightHandIndex2: 'rightIndexIntermediate', mixamorigRightHandIndex3: 'rightIndexDistal',
  mixamorigRightHandMiddle1: 'rightMiddleProximal', mixamorigRightHandMiddle2: 'rightMiddleIntermediate',
  mixamorigRightHandMiddle3: 'rightMiddleDistal', mixamorigRightHandRing1: 'rightRingProximal',
  mixamorigRightHandRing2: 'rightRingIntermediate', mixamorigRightHandRing3: 'rightRingDistal',
  mixamorigRightHandPinky1: 'rightLittleProximal', mixamorigRightHandPinky2: 'rightLittleIntermediate',
  mixamorigRightHandPinky3: 'rightLittleDistal',
  mixamorigLeftUpLeg: 'leftUpperLeg', mixamorigLeftLeg: 'leftLowerLeg',
  mixamorigLeftFoot: 'leftFoot', mixamorigLeftToeBase: 'leftToes',
  mixamorigRightUpLeg: 'rightUpperLeg', mixamorigRightLeg: 'rightLowerLeg',
  mixamorigRightFoot: 'rightFoot', mixamorigRightToeBase: 'rightToes',
};

// Convertit un clip FBX Mixamo en clip utilisable par le VRM
function loadMixamoAnimation(url, vrm) {
  const loader = new FBXLoader();
  return loader.loadAsync(url).then((asset) => {
    const clip = THREE.AnimationClip.findByName(asset.animations, 'mixamo.com') || asset.animations[0];
    const tracks = [];

    const restRotationInverse = new THREE.Quaternion();
    const parentRestWorldRotation = new THREE.Quaternion();
    const _quatA = new THREE.Quaternion();

    // Ratio de taille hanches Mixamo / hanches VRM
    const motionHipsHeight = asset.getObjectByName('mixamorigHips').position.y;
    const vrmHipsY = vrm.humanoid.getNormalizedBoneNode('hips').getWorldPosition(new THREE.Vector3()).y;
    const vrmRootY = vrm.scene.getWorldPosition(new THREE.Vector3()).y;
    const hipsPositionScale = Math.abs(vrmHipsY - vrmRootY) / motionHipsHeight;

    clip.tracks.forEach((track) => {
      const [mixamoRigName, propertyName] = track.name.split('.');
      const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
      const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;
      const mixamoRigNode = asset.getObjectByName(mixamoRigName);

      if (vrmNodeName != null) {
        mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
        mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation);

        if (track instanceof THREE.QuaternionKeyframeTrack) {
          for (let i = 0; i < track.values.length; i += 4) {
            const flatQuaternion = track.values.slice(i, i + 4);
            _quatA.fromArray(flatQuaternion);
            _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
            _quatA.toArray(flatQuaternion);
            flatQuaternion.forEach((v, index) => { track.values[index + i] = v; });
          }
          tracks.push(new THREE.QuaternionKeyframeTrack(
            `${vrmNodeName}.${propertyName}`,
            track.times,
            track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v)),
          ));
        } else if (track instanceof THREE.VectorKeyframeTrack) {
          const value = track.values.map((v, i) =>
            (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale);
          tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value));
        }
      }
    });

    return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks);
  });
}

// ---------- Chargement du VRM ----------
let currentVRM;
let mixer;
const actions = {};
let currentAction;

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));

loader.load(
  './assets/perso.vrm',
  async (gltf) => {
    const vrm = gltf.userData.vrm;
    if (!vrm) { console.error("Pas un VRM valide."); return; }

    VRMUtils.rotateVRM0(vrm); // gère l'orientation des VRM 0.x (à la place de rotation.y = Math.PI)
    scene.add(vrm.scene);
    currentVRM = vrm;

    mixer = new THREE.AnimationMixer(vrm.scene);

    // Charge les 3 animations
    const names = ['gaming', 'sleeping', 'typing'];
    for (const name of names) {
      try {
        const clip = await loadMixamoAnimation(`./assets/${name}.fbx`, vrm);
        actions[name] = mixer.clipAction(clip);
      } catch (e) {
        console.error(`Erreur chargement ${name}.fbx`, e);
      }
    }

    playAnimation('typing');
    console.log('VRM + animations prêts', Object.keys(actions));
  },
  undefined,
  (error) => console.error('Erreur VRM :', error),
);

// Transition douce entre animations
function playAnimation(name, fade = 0.5) {
  const next = actions[name];
  if (!next || next === currentAction) return;
  next.reset().play();
  if (currentAction) currentAction.crossFadeTo(next, fade, false);
  currentAction = next;
}

// Test rapide : touches 1 / 2 / 3
window.addEventListener('keydown', (e) => {
  if (e.key === '1') playAnimation('typing');
  if (e.key === '2') playAnimation('gaming');
  if (e.key === '3') playAnimation('sleeping');
});

// ---------- Boucle ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);       // <-- indispensable
  if (currentVRM) currentVRM.update(delta);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
