import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader';

import Stats from './stats.module.js';

import { FancyWater } from './FancyWater.js';
import { Sky } from './Sky.js';

let stats;
let camera, scene, renderer;
let water, sun, sky, pmremGenerator, starMaterial, starMesh;
let clock, delta;
let ghost, ghostMeme;

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

export function init(container) {
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

            starMaterial = new THREE.MeshBasicMaterial( { map: texture, transparent: true } );
            starMesh = new THREE.Mesh( geometry, starMaterial );
            scene.add( starMesh );
        }
    );



    // Light
    const light = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.5 );
    scene.add( light );




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

        parameters.azimuth = -(timer-5)*10%360;
        let rise = ((Math.sin(timer*0.3)+1)/2)
        parameters.elevation = rise * 6 - 3

        if (starMesh) {
            starMaterial.opacity = 1-Math.min(1, rise*3)
            starMesh.rotateZ(delta*0.02)
        }

        light.intensity = rise


        updateSun()

        render();
        stats.update();
    }

    function render() {
        renderer.render( scene, camera );
    }

    animate()
}