import * as THREE from "three/build/three.module.js"
import { Easing, Tween } from "@tweenjs/tween.js"
import { GLTFLoader } from './GLTFLoader';

import Stats from './stats.module.js';

import { FancyWater } from './FancyWater.js';
import { Sky } from './Sky.js';

let stats;
let camera, scene, renderer;
let water, sun, sky, pmremGenerator, starMaterial, starMesh
let clock, delta;
let ghost, ghostMeme;
let racerCardTextures = []
let cards = []
let shineTextures = []

const parameters = {
    elevation: 135,
    azimuth: 5,
};

function updateSun() {
    const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
    const theta = THREE.MathUtils.degToRad( parameters.azimuth );

    sun.setFromSphericalCoords( 1, phi, theta );

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();
}

export function init(container, racerCards) {
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( 1920, 1080 );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild( renderer.domElement );


    stats = new Stats();
    container.appendChild( stats.dom );
    sun = new THREE.Vector3();
    const loader = new GLTFLoader();


    scene = new THREE.Scene();
    // Camera
    camera = new THREE.PerspectiveCamera(
        55,
        1920 / 1080,
        1,
        20000
    );
    camera.position.set( 1, 30, 100 );
    camera.rotateX(-.2)


    // ghost
    loader.load("model/ghost.gltf", function (gltf) {
        ghost = gltf.scene
        ghost.scale.set(5, 5, 5);
        scene.add(ghost)
    })

    loader.load("model/ghost_missing_pixel.gltf", function (gltf) {
        ghostMeme = gltf.scene
        ghostMeme.scale.set(5, 5, 5);
        ghostMeme.visible = false
        scene.add(ghostMeme)
    })



    let lawnmower, lawnmixer;
    // lawnmower
    loader.load("model/lawnmower/scene.gltf", function (gltf) {
        lawnmower = gltf.scene
        lawnmower.rotateY(-Math.PI*.5)
        lawnmower.scale.set(0.1, 0.1, 0.1);
        lawnmower.position.set(-500, -5, -200)

        lawnmixer = new THREE.AnimationMixer( gltf.scene );
        var action = lawnmixer.clipAction( gltf.animations[ 0 ] );
        action.play();

        scene.add(lawnmower)
    })

    // Water

    const waterGeometry = new THREE.PlaneGeometry( 2048, 2048, 512, 512 );

    water = new FancyWater( waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load(
            'img/waternormals.jpg',
            function ( texture ) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            }
        ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined,
    } );

    scene.add( water );

    // Skybox

    sky = new Sky();
    sky.scale.setScalar( 10000 );
    scene.add( sky );

    const skyUniforms = sky.material.uniforms;

    skyUniforms[ 'turbidity' ].value = 10;
    skyUniforms[ 'rayleigh' ].value = 2;
    skyUniforms[ 'mieCoefficient' ].value = 0.005;
    skyUniforms[ 'mieDirectionalG' ].value = 0.8;



    clock = new THREE.Clock();

    let timer = 160

    parameters.azimuth = 135;
    parameters.elevation = 5
    updateSun()
    pmremGenerator = new THREE.PMREMGenerator( renderer );
    scene.environment = pmremGenerator.fromScene( sky ).texture;



    // Stars
    var texLoader = new THREE.TextureLoader();
    texLoader.load(
        "./img/sky.png",
        (texture) => {
            var geometry = new THREE.PlaneBufferGeometry( 3000, 3000 );
            geometry.translate(0, 300, -1000)

            starMaterial = new THREE.MeshBasicMaterial( {
                map: texture,
                transparent: true,
            } );
            starMesh = new THREE.Mesh( geometry, starMaterial );
            scene.add( starMesh );
        }
    );



    // Light
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.2 );
    scene.add( hemiLight );




    const dirLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
    dirLight.position.set(1, 1, 1)
    scene.add( dirLight );

    // Cards
    for (let i = 0; i < 2; i++) {
        const geometry = new THREE.PlaneGeometry(59, 86);
        racerCardTextures[i] = new THREE.CanvasTexture(racerCards[i].canvas);
        const material = new THREE.MeshPhongMaterial({
            map: racerCardTextures[i],
            transparent: true,
            emissive: 0x111111
        });
        cards[i] = new THREE.Mesh(geometry, material);

        cards[i].scale.setScalar(0.6)
        cards[i].translateY(30)
        cards[i].translateZ(40)
        // cards[i].rotateX(-.2)

        let posX = -200

        if (i == 1) {
            posX *= -1;
        }

        cards[i].position.x = posX

        scene.add(cards[i])
    }

    var texLoader = new THREE.TextureLoader();
    for (let i = 0; i < 2; i++) {
        texLoader.load(
            "./img/shine.png",
            (texture) => {
                texture.offset = new THREE.Vector2(0, 0)

                const geometry = new THREE.PlaneGeometry(59, 86);

                let shineMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    opacity: 0.5,
                })

                shineTextures[i] = texture
                let shiny = new THREE.Mesh(geometry, shineMaterial);
                shiny.position.z = 0.01
                cards[i].add(shiny)
            }
        )
    }


    function animate() {
        requestAnimationFrame( animate );
        delta = clock.getDelta();
        timer += delta;
        water.material.uniforms[ 'time' ].value += delta;
        if (ghost && ghostMeme) {
            let oldRotation = ghost.rotation.y

            ghost.rotation.y = (timer*.3) % Math.PI*2
            ghostMeme.rotation.y = (timer*.3) % Math.PI*2

            if (ghost.rotation.y >= Math.PI*1.5 && oldRotation < Math.PI*1.5) {
                // swap?
                let swap = false

                if (ghost.visible) {
                    // maybe swap
                    if (Math.random() < 2/100) {
                        swap = true
                    }
                } else {
                    //swap
                    swap = true
                }

                if (swap) {
                    ghost.visible = !ghost.visible
                    ghostMeme.visible = !ghostMeme.visible
                }
            }
        }

        if (lawnmower) {
            lawnmixer.update( delta );
            lawnmower.position.x += delta*100

            lawnmower.rotation.y = Math.sin(timer*3)*0.3 - Math.PI/2

            if (lawnmower.position.x > 10000) {
                lawnmower.position.x = -500
            }
        }

        // card wiggle

        for (let i = 0; i < 2; i++) {
            let t = timer
            let mul = 1
            if (i == 0) {
                mul = -1
            }
            let posY = Math.sin(t*0.7)*3 + 30
            let rotY = Math.sin(t)*0.2

            cards[i].rotation.y = rotY*mul
            cards[i].position.y = posY
        }

        // shine
        for (let i = 0; i < 2; i++) {
            if (shineTextures[i]) {
                shineTextures[i].offset.y = cards[i].rotation.y * 30
            }
        }

        // a sun
        parameters.azimuth = -(timer-5)*10%360;
        let rise = ((Math.sin(timer*0.3)+1)/2)
        parameters.elevation = rise * 6 - 3

        if (starMesh) {
            starMaterial.opacity = 1-Math.min(1, rise*3)
            starMesh.rotateZ(delta*0.02)
        }

        hemiLight.intensity = rise


        updateSun()

        cardInTween.update(void 0, false)
        cardOutTween.update(void 0, false)

        render();
        stats.update();
    }

    function render() {
        renderer.render( scene, camera );
    }

    animate()
}

let cardInTween, cardOutTween
let tweenVal = {
    ghostY: 0,
    cardX: 90,
    cameraX: -0.2
}

function updatePositions() {
    if (ghost && ghostMeme) {
        ghost.position.y = tweenVal.ghostY
        ghostMeme.position.y = tweenVal.ghostY
    }

    cards[0].position.x = -tweenVal.cardX
    cards[1].position.x = tweenVal.cardX

    camera.rotation.x = tweenVal.cameraX
}

cardInTween = new Tween(tweenVal)
    .to({ ghostY: 100, cardX: 25, cameraX: 0 }, 2000)
    .easing(Easing.Cubic.InOut)
    .onUpdate(updatePositions)

cardOutTween = new Tween(tweenVal)
    .to({ ghostY: 0, cardX: 90, cameraX: -0.2 }, 2000)
    .easing(Easing.Cubic.InOut)
    .onUpdate(updatePositions)

export function toRacerCards() {
    cardInTween.start();
}

export function toGhost() {
    cardOutTween.start();
}

export function racerCardUpdated() {
    racerCardTextures[0].needsUpdate = true;
    racerCardTextures[1].needsUpdate = true;
}