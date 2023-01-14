import FunnyObject from "./FunnyObject";
import { GLTFLoader } from "../GLTFLoader";
import * as THREE from "three/build/three.module.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

class SmolAme extends FunnyObject {
  constructor(parentScene) {
    if (!gltf) return;

    super();

    this.scene = clone(gltf.scene);

    this.scene.position.set(-500, 0, -200);
    this.scene.scale.set(40, 40, 40);

    this.mixer = new THREE.AnimationMixer(this.scene);
    let action = this.mixer.clipAction(gltf.animations[1]);
    action.play();

    parentScene.add(this.scene);
  }

  update(dt) {
    if (this.scene) {
      this.mixer.update(dt);
      this.scene.position.x += dt * 100;

      if (this.scene.position.x > 500) {
        this.dispose();
        return true;
      }
    }
  }
}

SmolAme.loaded = false;

const loader = new GLTFLoader();

let gltf;

loader.load(
  "/bundles/nodecg-mysteryfunhouse/dist/model/ame/scene.gltf",
  (loadedGltf) => {
    gltf = loadedGltf;

    gltf.scene.position.set(0, -10, 0);
    FunnyObject.preload(gltf.scene, SmolAme.preloadScene);
    SmolAme.loaded = true;
  }
);

export default SmolAme;
