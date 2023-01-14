import FunnyObject from "./FunnyObject";
import { GLTFLoader } from "../GLTFLoader";
import * as THREE from "three/build/three.module.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

class LawnMower extends FunnyObject {
  constructor(parentScene) {
    if (!gltf) return;

    super();

    this.timer = 0;
    this.scene = clone(gltf.scene);
    this.scene.position.set(-500, -5, -200);
    this.scene.scale.set(0.1, 0.1, 0.1);

    this.mixer = new THREE.AnimationMixer(this.scene);
    let action = this.mixer.clipAction(gltf.animations[0]);
    action.play();

    parentScene.add(this.scene);
  }

  update(dt) {
    if (this.scene) {
      this.timer += dt;

      this.mixer.update(dt);
      this.scene.position.x += dt * 100;
      this.scene.rotation.y = Math.sin(this.timer * 4) * 0.5 - Math.PI / 2;

      if (this.scene.position.x > 500) {
        this.dispose();
        return true;
      }
    }
  }
}

LawnMower.loaded = false;

const loader = new GLTFLoader();

let gltf;

loader.load(
  "/bundles/nodecg-mysteryfunhouse/dist/model/lawnmower/scene.gltf",
  (loadedGltf) => {
    gltf = loadedGltf;
    gltf.scene.scale.set(0.1, 0.1, 0.1);
    gltf.scene.position.set(0, -50, 0);
    FunnyObject.preload(gltf.scene, LawnMower.preloadScene);
    LawnMower.loaded = true;
  }
);

export default LawnMower;
