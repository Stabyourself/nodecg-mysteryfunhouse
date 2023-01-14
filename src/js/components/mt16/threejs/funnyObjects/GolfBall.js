import FunnyObject from "./FunnyObject";
import { GLTFLoader } from "../GLTFLoader";
import * as THREE from "three/build/three.module.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

class GolfBall extends FunnyObject {
  constructor(parentScene) {
    if (!gltf) return;

    super();

    this.timer = 0;
    this.scene = clone(gltf.scene);
    this.scene.position.set(-500, 9, -200);
    this.scene.scale.set(10, 10, 10);

    parentScene.add(this.scene);
  }

  update(dt) {
    if (this.scene) {
      this.scene.position.x += dt * 100;

      this.timer += dt;

      this.scene.rotation.z = -this.timer * 5;

      if (this.scene.position.x > 500) {
        this.dispose();
        return true;
      }
    }
  }
}

GolfBall.loaded = false;

const loader = new GLTFLoader();

let gltf;

loader.load(
  "/bundles/nodecg-mysteryfunhouse/dist/model/golfball/scene.gltf",
  (loadedGltf) => {
    gltf = loadedGltf;
    gltf.scene.position.set(0, -10, 0);
    FunnyObject.preload(gltf.scene, GolfBall.preloadScene);
    GolfBall.loaded = true;
  }
);

export default GolfBall;
