class FunnyObject {
  constructor() {}

  update(dt) {}

  dispose() {
    this.scene.parent.remove(this.scene);
  }
}

FunnyObject.preload = (scene, parentScene) => {
  parentScene.add(scene);
  setTimeout(() => {
    parentScene.remove(scene);
  }, 1000);
};

export default FunnyObject;
