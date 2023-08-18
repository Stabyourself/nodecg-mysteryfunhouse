import FunnyObject from "./FunnyObject";
import { GLTFLoader } from "../GLTFLoader";
import * as THREE from "three/build/three.module.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

let gltf;

class Box extends FunnyObject {
  constructor(parentScene) {
    if (!gltf) return;

    super();

    this.timer = 0;
    this.scene = clone(gltf.scene);
    this.scene.position.set(-500, -9, -200);
    this.scene.scale.set(25, 25, 25);

    parentScene.add(this.scene);
  }

  update(dt) {
    if (this.scene) {
      this.scene.position.x += dt * 100;

      this.timer += dt;

      this.scene.position.y = Math.sin(this.timer * 2) * 4 - 9;
      this.scene.rotation.z = Math.sin(this.timer) * 0.2;

      if (this.scene.position.x > 500) {
        this.dispose();
        return true;
      }
    }
  }

  static init() {
    const loader = new GLTFLoader();

    loader.load(
      "/bundles/nodecg-mysteryfunhouse/dist/model/box/scene.gltf",
      (loadedGltf) => {
        gltf = loadedGltf;
        gltf.scene.position.set(0, -10, 0);
        FunnyObject.preload(gltf.scene, Box.preloadScene);
        Box.loaded = true;
      }
    );
  }
}

Box.loaded = false;

export default Box;
