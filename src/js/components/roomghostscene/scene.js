import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PointerLockControls } from './PointerLockControls';
import { CRTShader } from './CRTShader';

const playerCardTextures = [];
let cameraMovement, beziers;
let cameraAt = "idle";

// Reads a named node from the loaded room, warning (instead of throwing) if the
// artist-authored .glb no longer contains it.
function getNamed(root, name) {
  const obj = root.getObjectByName(name);
  if (!obj) {
    console.warn(`[RoomBackground] room.glb is missing expected object "${name}"`);
  }
  return obj;
}

// 1. Scene Setup
function init(container, playerCards, initialState) {
  // "ghost" is the only state that shows the idle view; every other known state
  // (cards1/cards2/paths1/paths2) shows the corkboard, so if we're mounting mid-match
  // the camera should snap straight there instead of starting from idle.
  cameraAt = initialState && initialState !== "ghost" ? "corkboard" : "idle";

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
  // This graphic is always captured at a fixed 1920x1080 (OBS/vMix browser source), so
  // scaling by devicePixelRatio would only render extra pixels nothing ever sees.
  renderer.setPixelRatio(1);
  renderer.setSize(1920, 1080);

  // load room

  let fan, ghostMixer, camera, controls, tvLight, crtUniforms;
  let tvVideo, tvGlowCtx;
  let lastGlowSampleTime = 0;
  let tvGlowLuminance = 0.5;
  const tvGlowColor = new THREE.Color(0xffffff);

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

    const lamp = getNamed(room, "LAMP");
    if (lamp) {
      // Lamp light
      const lampLight = new THREE.PointLight(0xffff00, 0.5, 2);
      lampLight.position.copy(lamp.position);
      scene.add(lampLight);
    }

    const tv = getNamed(room, "TELEVISION");
    if (tv) {
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
      tvVideo = video;

      // Tiny offscreen canvas used to sample the video's current frame every render,
      // so the TV's room light can "project" whatever color/brightness is on screen.
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = 8;
      glowCanvas.height = 8;
      tvGlowCtx = glowCanvas.getContext('2d', { willReadFrequently: true });

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

      if (tv.children[0]) {
        tv.children[0].material = videoMaterial;
      }
    }

    // play sitting animation
    let sittingAnimation = glb.animations.find((anim) => anim.name.toLowerCase().includes("sitting"));
    if (sittingAnimation) {
      ghostMixer = new THREE.AnimationMixer(room);
      const action = ghostMixer.clipAction(sittingAnimation);
      action.play();
    }

    const ghostBody = getNamed(room, "GHOST_BODY");
    if (ghostBody) {
      ghostBody.visible = false;
    }
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
    const tallLamp = getNamed(room, "TALL_LAMP");
    if (tallLamp) {
      const tallLampLight = new THREE.PointLight(0xffff88, 1, 4, 0.1);
      tallLampLight.position.copy(tallLamp.position).add(new THREE.Vector3(0, 2, 0));
      scene.add(tallLampLight);
    }

    // 4. Camera Setup
    camera = glb.cameras[0]
    if (!camera) {
      console.error("[RoomBackground] room.glb has no embedded camera; aborting scene setup");
      return;
    }

    const cameraStart = getNamed(room, "CAMERA_START");
    const cameraStartHandle = getNamed(room, "CAMERA_START_HANDLE");
    const cameraEnd = getNamed(room, "CAMERA_END");
    const cameraEndHandle = getNamed(room, "CAMERA_END_HANDLE");

    if (cameraAt === "corkboard" && cameraEnd) {
      camera.position.copy(cameraEnd.position);
      camera.rotation.copy(cameraEnd.rotation);
    }

    controls = new PointerLockControls(camera, document.body);

    // document.addEventListener('click', function () {
    //   controls.lock();
    // });

    scene.add(controls.getObject());

    animate();

    if (cameraStart && cameraStartHandle && cameraEnd && cameraEndHandle) {
      beziers = {
        idleToCards: {
          curve: new THREE.CubicBezierCurve3(
            cameraStart.position,
            cameraStartHandle.position,
            cameraEndHandle.position,
            cameraEnd.position
          ),
          start: cameraStart.position,
          end: cameraEnd.position,
          startAngle: cameraStart.rotation,
          endAngle: cameraEnd.rotation,
        },

        cardsToIdle: {
          curve: new THREE.CubicBezierCurve3(
            cameraEnd.position,
            cameraEndHandle.position,
            cameraStartHandle.position,
            cameraStart.position
          ),
          start: cameraEnd.position,
          end: cameraStart.position,
          startAngle: cameraEnd.rotation,
          endAngle: cameraStart.rotation,
        }
      }

      // hide the handles
      cameraStart.visible = false;
      cameraStartHandle.visible = false;
      cameraEnd.visible = false;
      cameraEndHandle.visible = false;
    } else {
      console.warn("[RoomBackground] camera path markers missing from room.glb; cards/idle camera transitions disabled");
    }

    // corkboard
    const card1 = getNamed(room, "CARD1");
    if (card1) {
      playerCardTextures[0] = new THREE.CanvasTexture(playerCards[0].canvas);
      card1.material = new THREE.MeshBasicMaterial({
        map: playerCardTextures[0],
        transparent: true,
      });
      playerCardTextures[0].needsUpdate = true;
    }

    const card2 = getNamed(room, "CARD2");
    if (card2) {
      playerCardTextures[1] = new THREE.CanvasTexture(playerCards[1].canvas);
      card2.material = new THREE.MeshBasicMaterial({
        map: playerCardTextures[1],
        transparent: true,
      });
      playerCardTextures[1].needsUpdate = true;
    }
  }, undefined, (error) => {
    console.error("[RoomBackground] Failed to load room.glb", error);
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

    // crtUniforms.yOffset.value = (clock.elapsedTime * 0.03) % 1;

    renderer.render(scene, camera);

    if (tvLight) {
      if (tvVideo && tvGlowCtx && tvVideo.readyState >= tvVideo.HAVE_CURRENT_DATA) {
        // getImageData forces a GPU->CPU readback, which stalls the pipeline - cheap
        // in data size (8x8) but doing that stall every single frame alongside video
        // decode was enough to visibly stutter the video. Throttle it; the easing below
        // still runs every frame, so it still reads as a quick, smooth reaction.
        if (clock.elapsedTime - lastGlowSampleTime > 0.08) {
          lastGlowSampleTime = clock.elapsedTime;
          tvGlowCtx.drawImage(tvVideo, 0, 0, 8, 8);
          const { data } = tvGlowCtx.getImageData(0, 0, 8, 8);
          let r = 0, g = 0, b = 0;
          const pixelCount = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          r /= pixelCount * 255;
          g /= pixelCount * 255;
          b /= pixelCount * 255;

          tvGlowColor.setRGB(r, g, b, THREE.SRGBColorSpace);
          // Punch up the saturation so even mildly-tinted footage swings the light
          // through strong, distinct colors instead of a subtle, washed-out tint.
          const hsl = { h: 0, s: 0, l: 0 };
          tvGlowColor.getHSL(hsl);
          tvGlowColor.setHSL(hsl.h, Math.min(1, hsl.s * 3), hsl.l);
          // just a touch of white so a fully black frame doesn't kill the light entirely
          tvGlowColor.lerp(new THREE.Color(0xffffff), 0.05);
          tvGlowLuminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        // Ease toward the latest sample - slow enough to read as a glow, not a snap.
        // Framerate-independent: a fixed lerp fraction applied once per rendered frame
        // would converge over a fixed number of frames, not a fixed amount of time, so
        // the glow would visibly react faster at 60fps than at 30fps. Converting a
        // "rate" (how many times per second it closes the remaining gap) through
        // 1 - exp(-rate * delta) gives the same real-time speed at any framerate.
        tvLight.color.lerp(tvGlowColor, 1 - Math.exp(-10 * delta));
        const targetPower = 3 + tvGlowLuminance * 14;
        tvLight.power += (targetPower - tvLight.power) * (1 - Math.exp(-5 * delta));
      } else {
        tvLight.power = 8;
      }
    }

    requestAnimationFrame(animate);
  }

  // 6. Append Renderer to DOM
  container.appendChild(renderer.domElement);


  document.scene = scene

  console.log(scene)
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