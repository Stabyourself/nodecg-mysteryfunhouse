import * as THREE from "three/build/three.module.js";
import { Easing, Tween } from "@tweenjs/tween.js";
import { GLTFLoader } from "./GLTFLoader";

import { FancyWater } from "./FancyWater.js";
import { Sky } from "./Sky.js";
import { PointerLockControls } from "./PointerLockControls";

import SmolAme from "./funnyObjects/SmolAme.js";
import LawnMower from "./funnyObjects/LawnMower.js";
import Toyota from "./funnyObjects/Toyota.js";
import Box from "./funnyObjects/Box.js";
import GolfBall from "./funnyObjects/GolfBall.js";

let funnyObjectList = [Box, GolfBall, Toyota, LawnMower, SmolAme];
let funnyObjectDelay = 30;
let funnyObjectTimer = 0;
let funnyObjectI = 0;

let camera, scene, renderer;
let water, sun, sky, pmremGenerator, starMaterial, starMesh;
let clock, delta;
let ghost, ghostMeme;
let playerCardTextures = [];
let cards = [];
let shineTextures = [];
let playerCardUniforms = [];
let autoCamera = true;

let tweenVars;
let cardInTween, cardOutTween, spinTween, zoomInTween, zoomOutTween;

let sunTimer = 20,
  ghostTimer = 0,
  cardRotationTimer = 0,
  cardBobTimer = 0;

const parameters = {
  elevation: 135,
  azimuth: 5,
};

function updateSun() {
  const phi = THREE.MathUtils.degToRad(90 - parameters.elevation);
  const theta = THREE.MathUtils.degToRad(parameters.azimuth);

  sun.setFromSphericalCoords(1, phi, theta);

  sky.material.uniforms["sunPosition"].value.copy(sun);
  water.material.uniforms["sunDirection"].value.copy(sun).normalize();
}

let funnyObjects = [];

export function init(container, playerCards) {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(1920, 1080);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  // stats = new Stats()
  // container.appendChild( stats.dom )
  sun = new THREE.Vector3();
  const loader = new GLTFLoader();

  scene = new THREE.Scene();
  // Camera
  camera = new THREE.PerspectiveCamera(55, 16 / 9, 1, 20000);
  camera.position.set(1, 30, 100);
  camera.rotateX(-0.2);

  const controls = new PointerLockControls(camera, document.body);

  document.addEventListener("click", function () {
    controls.lock();
    autoCamera = false;
  });

  scene.add(controls.getObject());

  const onKeyDown = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;

      case "ShiftLeft":
        moveDown = true;
        break;

      case "Space":
        moveUp = true;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;

      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;

      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;

      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;

      case "ShiftLeft":
        moveDown = false;
        break;

      case "Space":
        moveUp = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  let moveForward = false;
  let moveBackward = false;
  let moveLeft = false;
  let moveRight = false;
  let moveUp = false;
  let moveDown = false;
  const direction = new THREE.Vector3();
  const velocity = new THREE.Vector3();

  let queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

  // ghost
  loader.load(
    "/bundles/nodecg-mysteryfunhouse/dist/model/ghost.gltf",
    function (gltf) {
      ghost = gltf.scene;
      ghost.scale.set(5, 5, 5);
      scene.add(ghost);
    }
  );

  loader.load(
    "/bundles/nodecg-mysteryfunhouse/dist/model/ghost_missing_pixel.gltf",
    function (gltf) {
      ghostMeme = gltf.scene;
      ghostMeme.scale.set(5, 5, 5);
      ghostMeme.visible = false;
      scene.add(ghostMeme);
    }
  );

  // Water

  const waterGeometry = new THREE.PlaneGeometry(2048, 2048, 512, 512);

  water = new FancyWater(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      "/bundles/nodecg-mysteryfunhouse/dist/img/waternormals.jpg",
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: scene.fog !== undefined,
  });

  scene.add(water);

  // Skybox
  sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  skyUniforms["turbidity"].value = 10;
  skyUniforms["rayleigh"].value = 2;
  skyUniforms["mieCoefficient"].value = 0.005;
  skyUniforms["mieDirectionalG"].value = 0.8;

  clock = new THREE.Clock();

  parameters.azimuth = 135;
  parameters.elevation = 5;
  updateSun();
  pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(sky).texture;

  // Stars
  var texLoader = new THREE.TextureLoader();
  texLoader.load(
    "/bundles/nodecg-mysteryfunhouse/dist/img/sky.png",
    (texture) => {
      var geometry = new THREE.PlaneBufferGeometry(3000, 3000);
      geometry.translate(0, 300, -1000);

      starMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
      });
      starMesh = new THREE.Mesh(geometry, starMaterial);
      scene.add(starMesh);
    }
  );

  // Light
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5);
  scene.add(hemiLight);

  // const dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 )
  // dirLight.position.set(1, 1, 1)
  // scene.add( dirLight )

  for (let i = 0; i < 2; i++) {
    cards[i] = new THREE.Object3D();
    cards[i].scale.setScalar(0.6);
    cards[i].translateY(30);
    cards[i].translateZ(35);

    let posX = -90;

    if (i == 1) {
      posX *= -1;
    }

    cards[i].position.x = posX;

    scene.add(cards[i]);

    // front
    texLoader.load(
      "/bundles/nodecg-mysteryfunhouse/dist/img/shine.png",
      (texture) => {
        shineTextures[i] = texture;
        shineTextures[i].offset = new THREE.Vector2(0, 0.5);

        let vertShader = `
                    varying vec2 vUv;
                    void main()
                    {
                        vUv = uv;
                        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `;

        let fragShader = `
                    #ifdef GL_ES
                    precision highp float;
                    #endif

                    uniform sampler2D tOne;
                    uniform sampler2D tSec;
                    uniform float offsetY;
                    uniform float lightness;

                    varying vec2 vUv;

                    void main(void)
                    {
                        vec3 c;
                        vec4 Ca = texture2D(tOne, vUv);
                        vec4 Cb = texture2D(tSec, vec2(vUv.x, vUv.y+offsetY));
                        gl_FragColor= vec4( mix( Ca.rgb*lightness, Cb.rgb, Cb.a ), Ca.a );
                    }
                `;

        const geometry = new THREE.PlaneGeometry(59, 86);
        playerCardTextures[i] = new THREE.CanvasTexture(playerCards[i].canvas);

        playerCardUniforms[i] = {
          // custom uniforms (your textures)
          tOne: { type: "t", value: playerCardTextures[i] },
          tSec: { type: "t", value: shineTextures[i] },
          offsetY: { type: "f", value: 1 },
          lightness: { type: "f", value: 1 },
        };

        playerCardTextures[i].needsUpdate = true;

        let material = new THREE.ShaderMaterial({
          uniforms: playerCardUniforms[i],
          // attributes: attributes,
          vertexShader: vertShader,
          fragmentShader: fragShader,
          transparent: true,
        });

        let mesh = new THREE.Mesh(geometry, material);
        cards[i].add(mesh);
      }
    );
  }

  // back
  for (let i = 0; i < 2; i++) {
    texLoader.load(
      "/bundles/nodecg-mysteryfunhouse/dist/img/card_back.png",
      (texture) => {
        const geometry = new THREE.PlaneGeometry(59, 86);
        let material = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
        });

        let mesh = new THREE.Mesh(geometry, material);
        mesh.rotateY(Math.PI);
        cards[i].add(mesh);
      }
    );
  }

  // preload funny objects
  for (let i = 0; i < funnyObjectList.length; i++) {
    funnyObjectList[i].preloadScene = scene;
  }

  function animate() {
    requestAnimationFrame(animate);
    delta = clock.getDelta();

    sunTimer += delta;
    ghostTimer += delta * 0.3;
    cardRotationTimer += delta;
    cardBobTimer += delta * 0.7;

    water.material.uniforms["time"].value += delta;
    if (ghost && ghostMeme) {
      let mul = urlParams.get("spingate") != null ? 5 : 1;
      let oldRotation = ghost.rotation.y;

      ghost.rotation.y = (ghostTimer * 2 * mul) % (Math.PI * 2);
      ghostMeme.rotation.y = (ghostTimer * 2 * mul) % (Math.PI * 2);

      if (ghost.rotation.y >= Math.PI * 1.5 && oldRotation < Math.PI * 1.5) {
        // swap?
        let swap = false;

        if (ghost.visible) {
          // maybe swap
          if (Math.random() < 2 / 100) {
            swap = true;
          }
        } else {
          //swap
          swap = true;
        }

        if (swap) {
          ghost.visible = !ghost.visible;
          ghostMeme.visible = !ghostMeme.visible;
        }
      }
    }

    // card wiggle
    let rise = (Math.sin(sunTimer * 0.3) + 1) / 2;

    for (let i = 0; i < 2; i++) {
      let rotYtimer = cardRotationTimer;

      if (i == 1) {
        rotYtimer -= 0.5;
      }

      let rotY = Math.sin(rotYtimer) * 0.2;

      if (cards[i]) {
        if (playerCardUniforms[i]) {
          playerCardUniforms[i].lightness.value =
            (1 - Math.abs(rotY)) * Math.max(rise, 0.85);
        }

        let rotYspinning = rotY;

        if (i == 0) {
          rotYspinning += tweenVars.cardRotationAddY;
        } else {
          rotYspinning -= tweenVars.cardRotationAddY;
        }

        cards[i].rotation.y = rotYspinning;
        cards[i].position.y = Math.sin(cardBobTimer) * 3 + 29.5;
      }

      // shine
      if (shineTextures[i]) {
        let moduluTime = rotYtimer % (Math.PI * 2);

        playerCardUniforms[i].offsetY.value = -1;
        if (moduluTime < Math.PI * 0.5 || moduluTime > Math.PI * 1.5) {
          playerCardUniforms[i].offsetY.value = rotY * 20;
        }
      }
    }

    // a sun
    parameters.azimuth = (-(sunTimer - 5) * 10) % 360;
    parameters.elevation = rise * 6 - 3;

    if (starMesh) {
      starMaterial.opacity = 1 - Math.min(1, rise * 3);
      starMesh.rotateZ(delta * 0.02);
    }

    hemiLight.intensity = rise * 0.6;

    updateSun();

    if (cardInTween && cardInTween.isPlaying()) {
      cardInTween.update(void 0, false);
    }
    if (cardOutTween && cardOutTween.isPlaying()) {
      cardOutTween.update(void 0, false);
    }
    if (spinTween && spinTween.isPlaying()) {
      spinTween.update(void 0, false);
    }
    if (zoomInTween && zoomInTween.isPlaying()) {
      zoomInTween.update(void 0, false);
    }
    if (zoomOutTween && zoomOutTween.isPlaying()) {
      zoomOutTween.update(void 0, false);
    }

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= velocity.y * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.y = Number(moveUp) - Number(moveDown);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 1000.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 1000.0 * delta;
    if (moveUp || moveDown) velocity.y -= direction.y * 1000.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    controls.moveUp(-velocity.y * delta);

    // funny objects
    funnyObjectTimer += delta;

    if (funnyObjectTimer > funnyObjectDelay) {
      funnyObjectTimer = 0;
      if (funnyObjectList[funnyObjectI].loaded) {
        funnyObjects.push(new funnyObjectList[funnyObjectI](scene));
      }
      funnyObjectI++;

      if (funnyObjectI >= funnyObjectList.length) {
        funnyObjectI = 0;
      }
    }

    var i = funnyObjects.length;
    while (i--) {
      if (funnyObjects[i].update(delta)) {
        funnyObjects.splice(i, 1);
      }
    }

    render();
    // stats.update()
  }

  function render() {
    renderer.render(scene, camera);
  }

  animate();
}

const duration = 2000;
tweenVars = {
  ghostY: 0,
  cardX: 90,
  cameraX: -0.2,
  zoom: 1,
  cardRotationAddY: 0,
};

function updateTweens() {
  if (ghost && ghostMeme) {
    ghost.position.y = tweenVars.ghostY;
    ghostMeme.position.y = tweenVars.ghostY;
  }

  if (cards[0] && cards[1]) {
    cards[0].position.x = -tweenVars.cardX;
    cards[1].position.x = tweenVars.cardX;
  }

  if (autoCamera) {
    camera.rotation.x = tweenVars.cameraX;
  }

  if (camera.zoom != tweenVars.zoom) {
    camera.zoom = tweenVars.zoom;
    camera.updateProjectionMatrix();
  }
}

// Position tween
export function toPlayerCards() {
  if (cardOutTween) {
    cardOutTween.stop();
  }

  cardInTween = new Tween(tweenVars)
    .to({ ghostY: -100, cardX: 25, cameraX: 0, zoom: 1 }, duration)
    .easing(Easing.Cubic.InOut)
    .onUpdate(updateTweens)
    .start();

  if (tweenVars.cardX == 90) {
    cardRotationTimer = 4.2;
    cardBobTimer = Math.PI * 1.5;

    spin();
  }
}

export function toGhost() {
  if (cardInTween) {
    cardInTween.stop();
  }

  cardOutTween = new Tween(tweenVars)
    .to({ ghostY: 0, cardX: 90, cameraX: -0.2, zoom: 1 }, duration)
    .easing(Easing.Cubic.InOut)
    .onUpdate(updateTweens)
    .start();

  cardOutTween;
}

// Zoom tween
export function toPaths() {
  if (zoomInTween) {
    zoomInTween.stop();
  }

  zoomOutTween = new Tween(tweenVars)
    .to({ ghostY: -100, cardX: 25, cameraX: -0.7, zoom: 1.5 }, duration)
    .easing(Easing.Cubic.InOut)
    .onUpdate(updateTweens)
    .start();
}

export function spin() {
  tweenVars.cardRotationAddY = Math.PI * 2;

  spinTween = new Tween(tweenVars)
    .to({ cardRotationAddY: 0 }, duration)
    .easing(Easing.Cubic.InOut)
    .start();
}

export function playerCardUpdated() {
  setTimeout(() => {
    for (let i = 0; i < 2; i++) {
      if (playerCardTextures[i]) {
        playerCardTextures[i].needsUpdate = true;
      }
    }
  }, duration / 2);
}
