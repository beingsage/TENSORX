/// <reference path="../../lib/three.d.ts" />
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="../items/factory.ts" />

module BP3D.Model {
  /**
   * The Scene is a manager of Items and also links to a ThreeJS scene.
   */
  export class Scene {

    /** The associated ThreeJS scene. */
    private scene: THREE.Scene;

    /** */
    private items: Items.Item[] = [];

    /** */
    public needsUpdate = false;

    /** The Json loader. */
    private loader: THREE.JSONLoader;

    /** */
    private itemLoadingCallbacks = $.Callbacks();

    /** Item */
    private itemLoadedCallbacks = $.Callbacks();

    /** Item */
    private itemRemovedCallbacks = $.Callbacks();

    /**
     * Constructs a scene.
     * @param model The associated model.
     * @param textureDir The directory from which to load the textures.
     */
    constructor(private model: Model, private textureDir: string) {
      this.scene = new THREE.Scene();

      // init item loader
      this.loader = new THREE.JSONLoader();
      this.loader.crossOrigin = "";
    }

    /** Adds a non-item, basically a mesh, to the scene.
     * @param mesh The mesh to be added.
     */
    public add(mesh: THREE.Mesh) {
      this.scene.add(mesh);
    }

    /** Removes a non-item, basically a mesh, from the scene.
     * @param mesh The mesh to be removed.
     */
    public remove(mesh: THREE.Mesh) {
      this.scene.remove(mesh);
      Core.Utils.removeValue(this.items, mesh);
    }

    /** Gets the scene.
     * @returns The scene.
     */
    public getScene(): THREE.Scene {
      return this.scene;
    }

    /** Gets the items.
     * @returns The items.
     */
    public getItems(): Items.Item[] {
      return this.items;
    }

    /** Gets the count of items.
     * @returns The count.
     */
    public itemCount(): number {
      return this.items.length
    }

    /** Removes all items. */
    public clearItems() {
      var items_copy = this.items
      var scope = this;
      this.items.forEach((item) => {
        scope.removeItem(item, true);
      });
      this.items = []
    }

    /**
     * Removes an item.
     * @param item The item to be removed.
     * @param dontRemove If not set, also remove the item from the items list.
     */
    public removeItem(item: Items.Item, dontRemove?: boolean) {
      dontRemove = dontRemove || false;
      // use this for item meshes
      this.itemRemovedCallbacks.fire(item);
      item.removed();
      this.scene.remove(item);
      if (!dontRemove) {
        Core.Utils.removeValue(this.items, item);
      }
    }

    /**
     * Creates an item and adds it to the scene.
     * @param itemType The type of the item given by an enumerator.
     * @param fileName The name of the file to load.
     * @param metadata TODO
     * @param position The initial position.
     * @param rotation The initial rotation around the y axis.
     * @param scale The initial scaling.
     * @param fixed True if fixed.
     */
    public addItem(itemType: number, fileName: string, metadata, position: THREE.Vector3, rotation: number, scale: THREE.Vector3, fixed: boolean) {
      itemType = itemType || 1;
      var scope = this;
      var loaderCallback = function (geometry: THREE.Geometry, materials: THREE.Material[]) {
        var item = new (Items.Factory.getClass(itemType))(
          scope.model,
          metadata, geometry,
          new THREE.MeshFaceMaterial(materials),
          position, rotation, scale
        );
        item.fixed = fixed || false;
        scope.items.push(item);
        scope.add(item);
        item.initObject();
        scope.itemLoadedCallbacks.fire(item);
      }

      var objectCallback = function (object: THREE.Object3D) {
        if (!object) return;
        object.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(object);
        var size = new THREE.Vector3();
        var center = new THREE.Vector3();
        if ((box as any).size) {
          (box as any).size(size);
        } else if ((box as any).getSize) {
          (box as any).getSize(size);
        } else {
          size.subVectors(box.max, box.min);
        }
        if ((box as any).center) {
          (box as any).center(center);
        } else if ((box as any).getCenter) {
          (box as any).getCenter(center);
        } else {
          center.addVectors(box.min, box.max).multiplyScalar(0.5);
        }
        if (!isFinite(size.x) || size.x === 0) size.x = 1;
        if (!isFinite(size.y) || size.y === 0) size.y = 1;
        if (!isFinite(size.z) || size.z === 0) size.z = 1;
        object.position.sub(center);
        var geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        if ((geometry as any).faces) {
          for (var i = 0; i < (geometry as any).faces.length; i++) {
            (geometry as any).faces[i].materialIndex = 0;
          }
        }
        var invisibleMaterial = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0 });
        let autoScale = scale as any;
        if (!autoScale) {
          const maxDim = Math.max(size.x, size.y, size.z);
          let factor = 1;
          if (maxDim > 0 && maxDim < 2) {
            factor = 100;
          } else if (maxDim > 1000) {
            factor = 0.1;
          }
          if (factor !== 1) {
            autoScale = new THREE.Vector3(factor, factor, factor);
          }
        }
        var item = new (Items.Factory.getClass(itemType))(
          scope.model,
          metadata, geometry,
          new THREE.MeshFaceMaterial([invisibleMaterial]),
          position, rotation, autoScale
        );
        item.fixed = fixed || false;
        object.traverse(function (child: any) {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = false;
          }
        });
        item.add(object);
        scope.items.push(item);
        scope.add(item);
        item.initObject();
        scope.itemLoadedCallbacks.fire(item);
      }

      var lower = (fileName || '').toLowerCase();
      this.itemLoadingCallbacks.fire();

      if (lower.indexOf('.obj', lower.length - 4) !== -1) {
        if (metadata && (metadata as any).mtlUrl && (THREE as any).OBJMTLLoader) {
          var objMtlLoader = new (THREE as any).OBJMTLLoader();
          objMtlLoader.load(
            fileName,
            (metadata as any).mtlUrl,
            function (object: THREE.Object3D) {
              objectCallback(object);
            },
            undefined,
            function () {
              if ((THREE as any).OBJLoader) {
                var objLoader = new (THREE as any).OBJLoader();
                objLoader.load(fileName, function (object: THREE.Object3D) {
                  objectCallback(object);
                });
              } else {
                console.warn('OBJLoader not available for', fileName);
              }
            }
          );
        } else if ((THREE as any).OBJLoader) {
          var objLoader = new (THREE as any).OBJLoader();
          objLoader.load(fileName, function (object: THREE.Object3D) {
            objectCallback(object);
          });
        } else {
          console.warn('OBJ loaders not available for', fileName);
        }
        return;
      }

      if (lower.indexOf('.gltf', lower.length - 5) !== -1 || lower.indexOf('.glb', lower.length - 4) !== -1) {
        if ((THREE as any).GLTFLoader) {
          var gltfLoader = new (THREE as any).GLTFLoader();
          gltfLoader.load(
            fileName,
            function (gltf: any) {
              var object = gltf.scene || (gltf.scenes && gltf.scenes[0]);
              objectCallback(object);
            },
            undefined,
            function (err: any) {
              console.warn('GLTF load failed for', fileName, err);
            }
          );
        } else {
          console.warn('GLTFLoader not available for', fileName);
        }
        return;
      }

      this.loader.load(
        fileName,
        loaderCallback,
        undefined // TODO_Ekki 
      );
    }
  }
}
