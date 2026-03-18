import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from './PointerLockControls';

// 1. Scene Setup
function init(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  // 2. Add Lighting
  // Ambient light: Soft white light across the whole scene
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  // hemisphere light: Simulates sky and ground lighting
  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  hemisphereLight.position.set(0, 20, 0);
  scene.add(hemisphereLight);

  // 3. Renderer Setup
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.shadowMap.enabled = true; // Enable shadow map in renderer
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(1920, 1080);

  // 4. Camera Setup
  const camera = new THREE.PerspectiveCamera(45, 1920 / 1080, 0.1, 100);
  camera.position.set(-2, 3, 0);
  camera.lookAt(2, 2, -1);


  // load room
  let fan;

  const loader = new GLTFLoader();
  loader.load('/bundles/nodecg-mysteryfunhouse/dist/model/20/room.glb', (gltf) => {
    const room = gltf.scene;
    room.traverse((child) => {
      if (["CENTER_TABLE", "Console_controller", "Ceiling_fan_flaps", "Ceiling_fan_base", "DESK", "DESK_STOOL",].includes(child.name)) {
        child.castShadow = true;
        child.receiveShadow = false;
      } else {
        child.receiveShadow = true;
      }

      if (child.name === "Ceiling_fan_flaps") {
        fan = child;
      }

      if (child.name === "LAMP") {
        // Lamp light
        const light = new THREE.PointLight(0xffff00, 0.5, 2);
        light.position.set(child.position.x, child.position.y, child.position.z);
        scene.add(light);
      }

      if (child.name === "TELEVISION") {
        // TV light
        const light = new THREE.SpotLight(0xffffff);
        light.angle = 1.3
        light.penumbra = 0.2
        light.distance = 5
        light.castShadow = true
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.shadow.bias = -0.0001;
        light.position.set(child.position.x, child.position.y + 0.5, child.position.z + 0.1);
        // create shadow



        const target = new THREE.Object3D();
        target.position.set(light.position.x, light.position.y, light.position.z + 1);
        scene.add(target);
        light.target = target;

        scene.add(light);


        // replace screen with video
        const video = document.getElementById("video");
        video.onloadeddata = function () {
          video.play();
        };

        //Create your video texture:
        const videoTexture = new THREE.VideoTexture(video);
        videoTexture.needsUpdate = true;
        const videoMaterial = new THREE.MeshBasicMaterial({
          map: videoTexture,
          side: THREE.FrontSide,
          toneMapped: false,
        });
        videoMaterial.needsUpdate = true;

        child.children[0].material = videoMaterial;
      }
    }
    );

    scene.add(room);
  });

  // spotlight for city outside the window
  const spotlight = new THREE.SpotLight(0xffffff, 3);
  spotlight.angle = 2;
  spotlight.penumbra = 0;
  spotlight.distance = 100;
  spotlight.position.set(9, 1, 0);

  const target = new THREE.Object3D();
  target.position.set(10, 1, 0);
  scene.add(target);
  spotlight.target = target;

  scene.add(spotlight);



  const controls = new PointerLockControls(camera, document.body);

  document.addEventListener('click', function () {
    controls.lock();
  });

  scene.add(controls.getObject());

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

  // 5. Animation Loop
  function animate() {
    let delta = clock.getDelta();
    // controls

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= velocity.y * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.y = Number(moveUp) - Number(moveDown);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 100.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 100.0 * delta;
    if (moveUp || moveDown) velocity.y -= direction.y * 100.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.moveUp(-velocity.y * delta);

    // Rotate the fan if it's loaded
    if (fan) {
      fan.rotation.y += delta * 1.5; // Adjust rotation speed as needed
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();

  // 6. Append Renderer to DOM
  container.appendChild(renderer.domElement);
}



export {
  init,
}