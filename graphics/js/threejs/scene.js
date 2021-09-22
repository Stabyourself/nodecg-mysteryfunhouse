import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader';

import Stats from './stats.module.js';

import { Water } from './Water.js';
import { Sky } from './Sky.js';

let stats;
let camera, scene, renderer;
let water, sun, sky, pmremGenerator;
let clock, delta;
let ghost;

const waves = {
    A: { direction: 0, steepness: 0.1, wavelength: 60 },
    B: { direction: 30, steepness: 0.1, wavelength: 30 },
    C: { direction: 60, steepness: 0.1, wavelength: 15 },
};

function getWaveInfo( x, z, time ) {

    const pos = new THREE.Vector3();
    const tangent = new THREE.Vector3( 1, 0, 0 );
    const binormal = new THREE.Vector3( 0, 0, 1 );
    Object.keys( waves ).forEach( ( wave ) => {

        const w = waves[ wave ];
        const k = ( Math.PI * 2 ) / w.wavelength;
        const c = Math.sqrt( 9.8 / k );
        const d = new THREE.Vector2(
            Math.sin( ( w.direction * Math.PI ) / 180 ),
            - Math.cos( ( w.direction * Math.PI ) / 180 )
        );
        const f = k * ( d.dot( new THREE.Vector2( x, z ) ) - c * time );
        const a = w.steepness / k;

        pos.x += d.y * ( a * Math.cos( f ) );
        pos.y += a * Math.sin( f );
        pos.z += d.x * ( a * Math.cos( f ) );

        tangent.x += - d.x * d.x * ( w.steepness * Math.sin( f ) );
        tangent.y += d.x * ( w.steepness * Math.cos( f ) );
        tangent.z += - d.x * d.y * ( w.steepness * Math.sin( f ) );

        binormal.x += - d.x * d.y * ( w.steepness * Math.sin( f ) );
        binormal.y += d.y * ( w.steepness * Math.cos( f ) );
        binormal.z += - d.y * d.y * ( w.steepness * Math.sin( f ) );

    } );

    const normal = binormal.cross( tangent ).normalize();

    return { position: pos, normal: normal };

}

// function updateBoxes( delta ) {

//     const t = water.material.uniforms[ 'time' ].value;
//     boxes.forEach( ( b ) => {

//         const waveInfo = getWaveInfo( b.position.x, b.position.z, t );
//         // b.position.y = waveInfo.position.y;
//         const quat = new THREE.Quaternion().setFromEuler(
//             new THREE.Euler( waveInfo.normal.x, waveInfo.normal.y, waveInfo.normal.z )
//         );
//         b.quaternion.rotateTowards( quat, delta * 0.5 );

//     } );

// }

const parameters = {
    elevation: 2,
    azimuth: 215,
};

function updateSun() {
    const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
    const theta = THREE.MathUtils.degToRad( parameters.azimuth );

    sun.setFromSphericalCoords( 1, phi, theta );

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

    // scene.environment = pmremGenerator.fromScene( sky ).texture;
}

export function init(container) {
    //

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( 1920, 1080 );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild( renderer.domElement );


    stats = new Stats();
    container.appendChild( stats.dom );

    //

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        55,
        1920 / 1080,
        1,
        20000
    );
    camera.position.set( 1, 30, 100 );
    camera.rotateX(-.2)

    //

    sun = new THREE.Vector3();
    const loader = new GLTFLoader();

    // ghost
    loader.load("model/ghost.gltf", function (gltf) {
        ghost = gltf.scene
        ghost.scale.set(5, 5, 5);
        scene.add(ghost)

        parameters.azimuth = 135;
        parameters.elevation = 5
        updateSun()
        scene.environment = pmremGenerator.fromScene( sky ).texture;
    })

    let lawnmower, lawnmixer;
    // ghost
    loader.load("model/lawnmower/scene.gltf", function (gltf) {
        lawnmower = gltf.scene
        lawnmower.rotateY(-Math.PI*.5)
        lawnmower.scale.set(0.1, 0.1, 0.1);
        lawnmower.position.set(-500, -5, -200)

        lawnmixer = new THREE.AnimationMixer( gltf.scene );
        var action = lawnmixer.clipAction( gltf.animations[ 0 ] );
        action.play();

        scene.add(lawnmower)



        parameters.azimuth = 135;
        parameters.elevation = 5
        updateSun()
        scene.environment = pmremGenerator.fromScene( sky ).texture;
    })

    // Water

    const waterGeometry = new THREE.PlaneGeometry( 2048, 2048, 512, 512 );

    water = new Water( waterGeometry, {
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
    water.rotation.x = - Math.PI / 2;

    water.material.onBeforeCompile = function ( shader ) {

        shader.uniforms.waveA = {
            value: [
                Math.sin( ( waves.A.direction * Math.PI ) / 180 ),
                Math.cos( ( waves.A.direction * Math.PI ) / 180 ),
                waves.A.steepness,
                waves.A.wavelength,
            ],
        };
        shader.uniforms.waveB = {
            value: [
                Math.sin( ( waves.B.direction * Math.PI ) / 180 ),
                Math.cos( ( waves.B.direction * Math.PI ) / 180 ),
                waves.B.steepness,
                waves.B.wavelength,
            ],
        };
        shader.uniforms.waveC = {
            value: [
                Math.sin( ( waves.C.direction * Math.PI ) / 180 ),
                Math.cos( ( waves.C.direction * Math.PI ) / 180 ),
                waves.C.steepness,
                waves.C.wavelength,
            ],
        };
        shader.vertexShader = `
            uniform mat4 textureMatrix;
            uniform float time;

            varying vec4 mirrorCoord;
            varying vec4 worldPosition;

            #include <common>
            #include <fog_pars_vertex>
            #include <shadowmap_pars_vertex>
            #include <logdepthbuf_pars_vertex>

            uniform vec4 waveA;
            uniform vec4 waveB;
            uniform vec4 waveC;

            vec3 GerstnerWave (vec4 wave, vec3 p) {
                float steepness = wave.z;
                float wavelength = wave.w;
                float k = 2.0 * PI / wavelength;
                float c = sqrt(9.8 / k);
                vec2 d = normalize(wave.xy);
                float f = k * (dot(d, p.xy) - c * time);
                float a = steepness / k;

                return vec3(
                    d.x * (a * cos(f)),
                    d.y * (a * cos(f)),
                    a * sin(f)
                );
            }

            void main() {
                mirrorCoord = modelMatrix * vec4( position, 1.0 );
                worldPosition = mirrorCoord.xyzw;
                mirrorCoord = textureMatrix * mirrorCoord;

                vec3 p = position.xyz;
                p += GerstnerWave(waveA, position.xyz);
                p += GerstnerWave(waveB, position.xyz);
                p += GerstnerWave(waveC, position.xyz);
                gl_Position = projectionMatrix * modelViewMatrix * vec4( p.x, p.y, p.z, 1.0);

                #include <beginnormal_vertex>
                #include <defaultnormal_vertex>
                #include <logdepthbuf_vertex>
                #include <fog_vertex>
                #include <shadowmap_vertex>
            }
        `;

        shader.fragmentShader = `
            uniform sampler2D mirrorSampler;
            uniform float alpha;
            uniform float time;
            uniform float size;
            uniform float distortionScale;
            uniform sampler2D normalSampler;
            uniform vec3 sunColor;
            uniform vec3 sunDirection;
            uniform vec3 eye;
            uniform vec3 waterColor;

            varying vec4 mirrorCoord;
            varying vec4 worldPosition;

            vec4 getNoise( vec2 uv ) {
                vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
                vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
                vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
                vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
                vec4 noise = texture2D( normalSampler, uv0 ) +
                    texture2D( normalSampler, uv1 ) +
                    texture2D( normalSampler, uv2 ) +
                    texture2D( normalSampler, uv3 );
                return noise * 0.5 - 1.0;
            }

            void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
                vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
                float direction = max( 0.0, dot( eyeDirection, reflection ) );
                specularColor += pow( direction, shiny ) * sunColor * spec;
                diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
            }

            #include <common>
            #include <packing>
            #include <bsdfs>
            #include <fog_pars_fragment>
            #include <logdepthbuf_pars_fragment>
            #include <lights_pars_begin>
            #include <shadowmap_pars_fragment>
            #include <shadowmask_pars_fragment>

            void main() {

                #include <logdepthbuf_fragment>
                vec4 noise = getNoise( worldPosition.xz * size );
                vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );

                vec3 diffuseLight = vec3(0.0);
                vec3 specularLight = vec3(0.0);

                vec3 worldToEye = eye-worldPosition.xyz;
                vec3 eyeDirection = normalize( worldToEye );
                sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );

                float distance = length(worldToEye);

                vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
                vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );

                float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
                float rf0 = 0.3;
                float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
                vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
                vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);
                vec3 outgoingLight = albedo;
                gl_FragColor = vec4( outgoingLight, alpha );

                #include <tonemapping_fragment>
                #include <fog_fragment>
            }
        `;

    };

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

    pmremGenerator = new THREE.PMREMGenerator( renderer );

    clock = new THREE.Clock();

    let timer = 160

    function animate() {
        requestAnimationFrame( animate );
        delta = clock.getDelta();
        timer += delta;
        water.material.uniforms[ 'time' ].value += delta;
        if (ghost) {
            ghost.rotation.y = timer*.5
        }

        if (lawnmower) {
            lawnmixer.update( delta );
            lawnmower.position.x += delta*100

            lawnmower.rotation.y = Math.sin(timer*3)*0.3 - Math.PI/2
            console.log(lawnmower.rotation.y)

            if (lawnmower.position.x > 1000) {
                lawnmower.position.x = -500
            }
        }

        parameters.azimuth = -timer*10%360;
        parameters.elevation = (Math.sin(timer*0.3)+1)/2 * 6-2

        updateSun()

        render();
        stats.update();
    }

    function render() {
        renderer.render( scene, camera );
    }

    animate()
}