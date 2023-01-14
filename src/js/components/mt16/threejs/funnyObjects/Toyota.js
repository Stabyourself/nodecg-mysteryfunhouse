import FunnyObject from "./FunnyObject";
import { GLTFLoader } from "../GLTFLoader";
import * as THREE from "three/build/three.module.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

class Toyota extends FunnyObject {
  constructor(parentScene) {
    if (!gltf) return;

    super();

    this.timer = 0;
    this.scene = clone(gltf.scene);
    this.scene.position.set(-500, 6, -200);
    this.scene.scale.set(10, 10, 10);

    parentScene.add(this.scene);
  }

  update(dt) {
    if (this.scene) {
      this.scene.position.x += dt * 300;

      this.timer += dt;
      this.scene.rotation.y = Math.sin(this.timer * 4) * 0.3 + Math.PI * 0.1;

      if (this.scene.position.x > 500) {
        this.dispose();
        return true;
      }
    }
  }
}

Toyota.loaded = false;

const loader = new GLTFLoader();

let gltf;

loader.load(
  "/bundles/nodecg-mysteryfunhouse/dist/model/toyota/scene.gltf",
  (loadedGltf) => {
    gltf = loadedGltf;
    gltf.scene.position.set(0, -10, 0);
    FunnyObject.preload(gltf.scene, Toyota.preloadScene);
    Toyota.loaded = true;
  }
);

export default Toyota;
