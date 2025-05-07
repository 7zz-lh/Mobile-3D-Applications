let scene, camera, renderer, clock;
let mixer = null, actions = [], mode = 'open';
let loadedModel = null;
let secondModelMixer = null, secondModelActions = [];
let isWireframe = false;
let sound, secondSound;

init();

function init() {
  const assetPath = './assets/';
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00ffff);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(-5, 25, 20);

  const listener = new THREE.AudioListener();
  camera.add(listener);
  sound = new THREE.Audio(listener);
  secondSound = new THREE.Audio(listener);

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load(assetPath + 'can_opening_1_01.mp3', buffer => {
    sound.setBuffer(buffer);
    sound.setLoop(false);
    sound.setVolume(1.0);
  });
  audioLoader.load(assetPath + 'can_crush.mp3', buffer => {
    secondSound.setBuffer(buffer);
    secondSound.setLoop(false);
    secondSound.setVolume(1.0);
  });

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 4);
  scene.add(ambient);

  const light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0, 10, 2);
  scene.add(light);

  const canvas = document.getElementById('threeContainer');
  renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setPixelRatio(window.devicePixelRatio);
  resize();

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(1, 2, 0);
  controls.update();

  document.getElementById("btn").addEventListener('click', () => {
    if (actions.length) {
      actions.forEach(action => {
        action.timeScale = 1.0;
        action.reset();
        action.play();
      });
      if (sound.isPlaying) sound.stop();
      sound.play();
    }
  });

  document.getElementById("toggleWireframe").addEventListener('click', () => {
    isWireframe = !isWireframe;
    toggleWireframe(isWireframe);
  });

  document.getElementById("Rotate").addEventListener('click', () => {
    if (loadedModel) {
      const axis = new THREE.Vector3(0, 1, 0);
      loadedModel.rotateOnAxis(axis, Math.PI / 8);
    }
  });

  document.getElementById("switchModel").addEventListener('click', () => {
    if (mode === 'open') {
      loadModel(assetPath + 'drpepper_crash.glb', true);
      mode = 'crash';
    } else {
      loadModel(assetPath + 'drpepper_open.glb', false);
      mode = 'open';
    }
  });

  document.getElementById("playSecondModelAnimation").addEventListener('click', () => {
    const message = document.createElement('div');
    message.innerText = "Let’s recycle together!";
    message.style.position = 'fixed';
    message.style.top = '20px';
    message.style.left = '50%';
    message.style.transform = 'translateX(-50%)';
    message.style.backgroundColor = '#88ff88';
    message.style.padding = '12px 24px';
    message.style.fontSize = '18px';
    message.style.fontWeight = 'bold';
    message.style.borderRadius = '8px';
    message.style.color = '#003300';
    message.style.zIndex = '999';
    message.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.3)';
    document.body.appendChild(message);

    const originalColor = scene.background.clone();
    scene.background.set(0x88ff88);
    setTimeout(() => {
      scene.background.copy(originalColor);
      document.body.removeChild(message);
    }, 1200);
  });

  loadModel(assetPath + 'drpepper_open.glb', false);

  window.addEventListener('resize', onResize, false);
  animate();
}

function loadModel(path, isSecond = false) {
  if (loadedModel) {
    scene.remove(loadedModel);
    disposeModel(loadedModel);
    loadedModel = null;
  }

  const loader = new THREE.GLTFLoader();
  loader.load(path, gltf => {
    const model = gltf.scene;
    scene.add(model);

    model.traverse(obj => {
      if (obj.isMesh) {
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach(mat => {
            if (mat.transparent || mat.alpha < 1.0 || mat.opacity < 1.0) {
              mat.transparent = true;
              mat.depthWrite = false;
              mat.side = THREE.DoubleSide;
            }
          });
        }
      }
    });

    model.position.set(0, 0, 0);
    loadedModel = model;

    const thisMixer = new THREE.AnimationMixer(model);
    const theseActions = gltf.animations.map(clip => thisMixer.clipAction(clip));

    theseActions.forEach(action => {
      action.reset();
      action.setLoop(THREE.LoopOnce);
      action.clampWhenFinished = true;
      action.play();
    });

    if (isSecond) {
      secondModelMixer = thisMixer;
      secondModelActions = theseActions;
      
    } else {
      mixer = thisMixer;
      actions = theseActions;
      if (sound.isPlaying) sound.stop();
      sound.play();
    }

    console.log("Loaded", path);
  }, undefined, err => {
    console.error("Fail", err);
  });
}

function disposeModel(model) {
  model.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
}

function toggleWireframe(enable) {
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach(mat => {
        mat.wireframe = enable;
        mat.needsUpdate = true;
      });
    }
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (secondModelMixer) secondModelMixer.update(delta);
  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function onResize() {
  resize();
}
