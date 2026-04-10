import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from './PointerLockControls';
import { CRTShader } from './CRTShader';

const playerCardTextures = [];
let cameraMovement, beziers;
let cameraAt = "idle";

// 1. Scene Setup
function init(container, playerCards) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  // 2. Add Lighting
  // Ambient light: Soft white light across the whole scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambientLight);

  // directional light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(0, 0, 0);
  const targetObject = new THREE.Object3D();
  targetObject.position.set(1, 0, -0.5);
  directionalLight.target = targetObject;
  scene.add(targetObject);
  scene.add(directionalLight);


  // 3. Renderer Setup
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true; // Enable shadow map in renderer
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(1920, 1080);

  // load room

  let fan, ghostMixer, camera, controls, tvLight, crtUniforms;

  const loader = new GLTFLoader();
  loader.load('/bundles/nodecg-mysteryfunhouse/dist/model/20/room.glb', (glb) => {
    const room = glb.scene;

    const castsShadowNames = ["CENTER_TABLE", "Console_controller", "Ceiling_fan_flaps", "FAN_BASE", "FAN_BASE_1", "FAN_BASE_2", "DESK", "DESK_STOOL", "PAPER_BIN"]

    room.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false; // Disable shadow casting for all meshes by default
        child.receiveShadow = true; // Enable shadow receiving for all meshes
      }
    });

    for (let name of castsShadowNames) {
      let obj = room.getObjectByName(name);
      if (obj) {
        obj.castShadow = true;
        obj.receiveShadow = false;
      }
    }

    fan = room.getObjectByName("Ceiling_fan_flaps")

    let lamp = room.getObjectByName("LAMP")

    // Lamp light
    const lampLight = new THREE.PointLight(0xffff00, 0.5, 2);
    lampLight.position.set(lamp.position.x, lamp.position.y, lamp.position.z);
    scene.add(lampLight);

    let tv = room.getObjectByName("TELEVISION")

    // TV light
    tvLight = new THREE.SpotLight(0xffffff);
    tvLight.name = "TV_LIGHT"
    tvLight.angle = 1.4
    tvLight.penumbra = 0.2
    tvLight.power = 10
    tvLight.decay = 1

    tvLight.castShadow = true
    tvLight.shadow.mapSize.width = 2048;
    tvLight.shadow.mapSize.height = 2048;
    tvLight.position.copy(tv.localToWorld(new THREE.Vector3(0, 0.5, -0.2)));

    const target = new THREE.Object3D();
    target.position.copy(tv.localToWorld(new THREE.Vector3(0, 0.5, -3)));
    scene.add(target);
    tvLight.target = target;

    scene.add(tvLight);


    // replace screen with video
    const video = document.getElementById("video");
    video.onloadeddata = function () {
      video.play();
    };

    //Create your video texture:
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.needsUpdate = true;
    crtUniforms = THREE.UniformsUtils.clone(CRTShader.uniforms);
    crtUniforms.tDiffuse.value = videoTexture;
    const videoMaterial = new THREE.ShaderMaterial({
      uniforms: crtUniforms,
      vertexShader: CRTShader.vertexShader,
      fragmentShader: CRTShader.fragmentShader,
      side: THREE.FrontSide,
      toneMapped: false,
    });
    videoMaterial.needsUpdate = true;

    tv.children[0].material = videoMaterial;

    // play sitting animation
    let sittingAnimation = glb.animations.find((anim) => anim.name.toLowerCase().includes("sitting"));
    if (sittingAnimation) {
      ghostMixer = new THREE.AnimationMixer(room);
      const action = ghostMixer.clipAction(sittingAnimation);
      action.play();
    }

    glb.scene.getObjectByName("GHOST_BODY").visible = false;
    scene.add(room);


    // spotlight for city outside the window
    const spotlight = new THREE.SpotLight(0xffffff, 3);
    spotlight.angle = 2;
    spotlight.penumbra = 0;
    spotlight.distance = 100;
    spotlight.position.set(9, 1, 0);

    const cityLightTarget = new THREE.Object3D();
    cityLightTarget.position.set(10, 1, 0);
    scene.add(cityLightTarget);
    spotlight.target = cityLightTarget;

    scene.add(spotlight);

    // tall lamp light
    const tallLampLight = new THREE.PointLight(0xffff88, 1, 4, 0.1);
    tallLampLight.position.copy(room.getObjectByName("TALL_LAMP").position).add(new THREE.Vector3(0, 2, 0));
    scene.add(tallLampLight);


    // 4. Camera Setup
    camera = glb.cameras[0]

    if (cameraAt === "corkboard") {
      camera.position.copy(room.getObjectByName("CAMERA_END").position);
      camera.rotation.copy(room.getObjectByName("CAMERA_END").rotation);
    }

    controls = new PointerLockControls(camera, document.body);

    document.addEventListener('click', function () {
      controls.lock();
    });

    scene.add(controls.getObject());

    animate();

    beziers = {
      idleToCards: {
        curve: new THREE.CubicBezierCurve3(
          room.getObjectByName("CAMERA_START").position,
          room.getObjectByName("CAMERA_START_HANDLE").position,
          room.getObjectByName("CAMERA_END_HANDLE").position,
          room.getObjectByName("CAMERA_END").position
        ),
        start: room.getObjectByName("CAMERA_START").position,
        end: room.getObjectByName("CAMERA_END").position,
        startAngle: room.getObjectByName("CAMERA_START").rotation,
        endAngle: room.getObjectByName("CAMERA_END").rotation,
      },

      cardsToIdle: {
        curve: new THREE.CubicBezierCurve3(
          room.getObjectByName("CAMERA_END").position,
          room.getObjectByName("CAMERA_END_HANDLE").position,
          room.getObjectByName("CAMERA_START_HANDLE").position,
          room.getObjectByName("CAMERA_START").position
        ),
        start: room.getObjectByName("CAMERA_END").position,
        end: room.getObjectByName("CAMERA_START").position,
        startAngle: room.getObjectByName("CAMERA_END").rotation,
        endAngle: room.getObjectByName("CAMERA_START").rotation,
      }
    }

    // hide the handles
    room.getObjectByName("CAMERA_START").visible = false;
    room.getObjectByName("CAMERA_START_HANDLE").visible = false;
    room.getObjectByName("CAMERA_END").visible = false;
    room.getObjectByName("CAMERA_END_HANDLE").visible = false;

    // const points = beziers.idleToCards.getPoints(50); // Get 50 points for smoothness
    // const geometry = new THREE.BufferGeometry().setFromPoints(points);
    // const material = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red line
    // const curveObject = new THREE.Line(geometry, material);
    // scene.add(curveObject);

    // corkboard
    playerCardTextures[0] = new THREE.CanvasTexture(playerCards[0].canvas);
    room.getObjectByName("CARD1").material = new THREE.MeshBasicMaterial({
      map: playerCardTextures[0],
      transparent: true,
    });

    playerCardTextures[1] = new THREE.CanvasTexture(playerCards[1].canvas);
    room.getObjectByName("CARD2").material = new THREE.MeshBasicMaterial({
      map: playerCardTextures[1],
      transparent: true,
    });

    console.log(playerCards)

    playerCardTextures[0].needsUpdate = true;
    playerCardTextures[1].needsUpdate = true;
  });

  const onKeyDown = function (event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = true;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = true;
        break;

      case 'ArrowDown':
      case 'KeyS':
        moveBackward = true;
        break;

      case 'ArrowRight':
      case 'KeyD':
        moveRight = true;
        break;

      case 'ShiftLeft':
        moveDown = true;
        break;

      case 'Space':
        moveUp = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = false;
        break;

      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = false;
        break;

      case 'ArrowDown':
      case 'KeyS':
        moveBackward = false;
        break;

      case 'ArrowRight':
      case 'KeyD':
        moveRight = false;
        break;

      case 'ShiftLeft':
        moveDown = false;
        break;

      case 'Space':
        moveUp = false;
        break;
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  let moveForward = false;
  let moveBackward = false;
  let moveLeft = false;
  let moveRight = false;
  let moveUp = false;
  let moveDown = false;
  const direction = new THREE.Vector3();
  const velocity = new THREE.Vector3();

  let clock = new THREE.Clock();

  cameraMovement = function (path, duration) {
    let startTime = null;
    function animateCamera(time) {
      if (!startTime) startTime = time;
      let elapsed = time - startTime;
      let t = Math.min(elapsed / duration, 1); // Normalize time to [0, 1]

      // make T ease in-out
      t = t * t * (3 - 2 * t);

      let point = path.curve.getPoint(t);
      camera.position.copy(point);

      // lerp rotation using slerp for smooth rotation
      let startQuaternion = new THREE.Quaternion().setFromEuler(path.startAngle);
      let endQuaternion = new THREE.Quaternion().setFromEuler(path.endAngle);
      startQuaternion.slerp(endQuaternion, t);
      camera.quaternion.copy(startQuaternion);

      if (t >= 1) {
        camera.position.copy(path.end);
        camera.rotation.copy(path.endAngle);
      } else {
        requestAnimationFrame(animateCamera);
      }
    }

    requestAnimationFrame(animateCamera);
  }

  // 5. Animation Loop
  function animate() {
    let delta = clock.getDelta();
    // controls

    if (controls.isLocked === true) {
      velocity.x -= velocity.x * 10.0 * delta;
      velocity.z -= velocity.z * 10.0 * delta;
      velocity.y -= velocity.y * 10.0 * delta;

      direction.z = Number(moveForward) - Number(moveBackward);
      direction.x = Number(moveRight) - Number(moveLeft);
      direction.y = Number(moveUp) - Number(moveDown);
      direction.normalize(); // this ensures consistent movements in all directions

      if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
      if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;
      if (moveUp || moveDown) velocity.y -= direction.y * 40.0 * delta;

      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);
      controls.moveUp(-velocity.y * delta);
    }

    // Rotate the fan if it's loaded
    if (fan) {
      fan.rotation.y += delta * 1.5; // Adjust rotation speed as needed
    }

    if (ghostMixer) {
      ghostMixer.update(delta);
    }

    if (crtUniforms) {
      const elapsedTime = clock.elapsedTime;
      crtUniforms.time.value = elapsedTime;
      // crtUniforms.yOffset.value = (elapsedTime * 0.03) % 1;
    }

    renderer.render(scene, camera);

    tvLight.power = 8 + perlinNoise(Date.now(), 0.008) * 3;

    requestAnimationFrame(animate);
  }

  // 6. Append Renderer to DOM
  container.appendChild(renderer.domElement);


  document.scene = scene

  console.log(scene)
}




var r = [];

var MAX_VERTICES = 256;
var MAX_VERTICES_MASK = MAX_VERTICES - 1;

for (var i = 0; i < MAX_VERTICES; ++i) {
  r.push(Math.random());
}

var lerp = function (a, b, t) {
  return a * (1 - t) + b * t;
};

function perlinNoise(x, scale) {

  var scaledX = x * scale;
  var xFloor = Math.floor(scaledX);
  var t = scaledX - xFloor;
  var tRemapSmoothstep = t * t * (3 - 2 * t);

  /// Modulo using &
  var xMin = xFloor & MAX_VERTICES_MASK;
  var xMax = (xMin + 1) & MAX_VERTICES_MASK;

  var y = lerp(r[xMin], r[xMax], tRemapSmoothstep);

  return y;
}

function playerCardUpdated() {
  for (let i = 0; i < 2; i++) {
    if (playerCardTextures && playerCardTextures[i]) {
      playerCardTextures[i].needsUpdate = true;
    }
  }
}

function toCorkboard() {
  if (beziers && cameraAt === "idle") {
    cameraMovement(beziers.idleToCards, 2000);
    cameraAt = "corkboard";
  }
}

function toIdle() {
  if (beziers && cameraAt === "corkboard") {
    cameraMovement(beziers.cardsToIdle, 2000);
    cameraAt = "idle";
  }
}

export { init, playerCardUpdated, toCorkboard, toIdle };