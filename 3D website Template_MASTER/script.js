let scene, camera, renderer, clock;
let mixer = null, actions = [], mode = 'open';
let loadedModel = null;
let secondModelMixer = null, secondModelActions = [];
let isWireframe = false, params, lights;
let sound, secondSound;

init();

function init() {
  const assetPath = './assets/';
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x00aaff);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(-5, 25, 20);

  const listener = new THREE.AudioListener();
  camera.add(listener);
  sound = new THREE.Audio(listener);
  secondSound = new THREE.Audio(listener);

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load('./assets/can_opening_1_01.mp3', buffer => {
    sound.setBuffer(buffer);
    sound.setLoop(false);
    sound.setVolume(1.0);
  });

  audioLoader.load('./assets/can_crush.mp3', buffer => {
    secondSound.setBuffer(buffer);
    secondSound.setLoop(false);
    secondSound.setVolume(1.0);
  });

  const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 4);
  scene.add(ambient);

  lights = {};
  lights.spot = new THREE.SpotLight();
  lights.spot.visible = true;
  lights.spot.position.set(0, 20, 0);
  lights.spotHelper = new THREE.SpotLightHelper(lights.spot);
  lights.spotHelper.visible = false;
  scene.add(lights.spotHelper);
  scene.add(lights.spot);

  params = {
    spot: {
      enable: false,
      color: 0xffffff,
      distance: 20,
      angle: Math.PI / 2,
      penumbra: 0,
      helper: false,
      moving: false
    }
  };

  const gui = new dat.GUI({ autoPlace: false });
  const guiContainer = document.getElementById('gui-container');
  guiContainer.appendChild(gui.domElement);
  guiContainer.style.position = 'fixed';

  const spot = gui.addFolder('Spot');
  spot.open();
  spot.add(params.spot, 'enable').onChange(value => { lights.spot.visible = value });
  spot.addColor(params.spot, 'color').onChange(value => lights.spot.color = new THREE.Color(value));
  spot.add(params.spot, 'distance').min(0).max(20).onChange(value => lights.spot.distance = value);
  spot.add(params.spot, 'angle').min(0.1).max(6.28).onChange(value => lights.spot.angle = value);
  spot.add(params.spot, 'penumbra').min(0).max(1).onChange(value => lights.spot.penumbra = value);
  spot.add(params.spot, 'helper').onChange(value => lights.spotHelper.visible = value);
  spot.add(params.spot, 'moving');

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
      loadModel('./assets/coke_crash_video.glb', true, () => {
        if (secondModelActions.length) {
          secondModelActions.forEach(action => {
            action.reset();
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.play();
          });
          if (secondSound.isPlaying) secondSound.stop();
          secondSound.play();
        }
      });
      mode = 'crash';
    } else {
      loadModel('./assets/coke_can_open.glb', false, () => {
        if (actions.length) {
          actions.forEach(action => {
            action.reset();
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.play();
          });
          if (sound.isPlaying) sound.stop();
          sound.play();
        }
      });
      mode = 'open';
    }
  });

  document.getElementById("playSecondModelAnimation").addEventListener('click', () => {
    const msg = document.createElement('div');
    msg.innerText = "Let’s recycle and protect the planet!";
    msg.style.position = 'fixed';
    msg.style.top = '30px';
    msg.style.left = '50%';
    msg.style.transform = 'translateX(-50%)';
    msg.style.backgroundColor = '#eaffea';
    msg.style.border = '1px solid #5f9f5f';
    msg.style.padding = '10px 20px';
    msg.style.borderRadius = '10px';
    msg.style.fontSize = '18px';
    msg.style.color = '#2b4d2b';
    msg.style.zIndex = '9999';
    document.body.appendChild(msg);

    setTimeout(() => {
      if (msg && msg.parentNode) {
        msg.parentNode.removeChild(msg);
      }
    }, 2000);
  });

  loadModel(assetPath + 'coke_can_open.glb', false);
  window.addEventListener('resize', onResize, false);
  animate();
}

function loadModel(path, isSecond = false, onComplete = () => {}) {
  if (loadedModel) {
    scene.remove(loadedModel);
    disposeModel(loadedModel);
    loadedModel = null;
  }

  const loader = new THREE.GLTFLoader();
  loader.load(path, gltf => {
    const model = gltf.scene;
    scene.add(model);
    model.position.set(0, 0, 0);
    loadedModel = model;

    const thisMixer = new THREE.AnimationMixer(model);
    const theseActions = gltf.animations.map(clip => thisMixer.clipAction(clip));

    if (isSecond) {
      secondModelMixer = thisMixer;
      secondModelActions = theseActions;
    } else {
      mixer = thisMixer;
      actions = theseActions;
    }

    onComplete();
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

  const time = clock.getElapsedTime();
  const deltaX = Math.sin(time) * 5;
  if (params.spot.moving) {
    lights.spot.position.x = deltaX;
    lights.spotHelper.update();
  }
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
