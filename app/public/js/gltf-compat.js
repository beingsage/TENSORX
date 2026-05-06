(function () {
  if (typeof THREE === 'undefined') return;

  if (!THREE.LoaderUtils) {
    THREE.LoaderUtils = {
      decodeText: function (array) {
        if (typeof TextDecoder !== 'undefined') {
          return new TextDecoder().decode(array);
        }
        var s = '';
        for (var i = 0; i < array.length; i++) {
          s += String.fromCharCode(array[i]);
        }
        return s;
      },
      extractUrlBase: function (url) {
        var index = url.lastIndexOf('/');
        if (index === -1) return './';
        return url.substr(0, index + 1);
      },
      resolveURL: function (url, path) {
        if (!path) return url;
        if (/^(?:https?:)?\/\//i.test(url) || /^data:|^blob:/i.test(url)) return url;
        return path + url;
      }
    };
  }

  if (!THREE.FileLoader) {
    THREE.FileLoader = function (manager) {
      this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;
      this.crossOrigin = undefined;
      this.responseType = undefined;
      this.withCredentials = false;
      this.mimeType = undefined;
      this.path = '';
    };
    THREE.FileLoader.prototype = {
      constructor: THREE.FileLoader,
      load: function (url, onLoad, onProgress, onError) {
        var resolvedUrl = url;
        if (this.path && !/^(?:https?:)?\/\//i.test(url) && !/^data:|^blob:/i.test(url)) {
          resolvedUrl = this.path + url;
        }
        var loader = new THREE.XHRLoader(this.manager);
        if (this.crossOrigin !== undefined) loader.setCrossOrigin(this.crossOrigin);
        if (this.responseType !== undefined) loader.setResponseType(this.responseType);
        loader.load(resolvedUrl, onLoad, onProgress, onError);
      },
      setResponseType: function (value) { this.responseType = value; return this; },
      setWithCredentials: function (value) { this.withCredentials = value; return this; },
      setMimeType: function (value) { this.mimeType = value; return this; },
      setPath: function (path) { this.path = path; return this; },
      setCrossOrigin: function (value) { this.crossOrigin = value; return this; }
    };
  }

  if (THREE.Loader && THREE.Loader.prototype && THREE.DefaultLoadingManager && !THREE.Loader.prototype.manager) {
    THREE.Loader.prototype.manager = THREE.DefaultLoadingManager;
  }
  if (THREE.LoadingManager && THREE.LoadingManager.prototype && !THREE.LoadingManager.prototype.itemError) {
    THREE.LoadingManager.prototype.itemError = function (url) {
      if (this.onError) this.onError(url);
    };
  }
  if (THREE.DefaultLoadingManager && !THREE.DefaultLoadingManager.itemError) {
    THREE.DefaultLoadingManager.itemError = function (url) {
      if (this.onError) this.onError(url);
    };
  }
  if (!THREE.PropertyBinding) {
    THREE.PropertyBinding = {};
  }
  if (!THREE.PropertyBinding.sanitizeNodeName) {
    THREE.PropertyBinding.sanitizeNodeName = function (name) {
      return name.replace(/[\[\]\.:\/]/g, '_');
    };
  }
  if (THREE.LoadingManager && THREE.LoadingManager.prototype && !THREE.LoadingManager.prototype.getHandler) {
    THREE.LoadingManager.prototype.getHandler = function (file) {
      if (THREE.Loader && THREE.Loader.Handlers && typeof THREE.Loader.Handlers.get === 'function') {
        return THREE.Loader.Handlers.get(file);
      }
      return null;
    };
  }

  if (!THREE.MeshStandardMaterial) {
    THREE.MeshStandardMaterial = function (params) {
      THREE.MeshPhongMaterial.call(this, params || {});
      this.type = 'MeshStandardMaterial';
      this.isMeshStandardMaterial = true;
      this.metalness = (params && params.metalness !== undefined) ? params.metalness : 0;
      this.roughness = (params && params.roughness !== undefined) ? params.roughness : 1;
    };
    THREE.MeshStandardMaterial.prototype = Object.create(THREE.MeshPhongMaterial.prototype);
    THREE.MeshStandardMaterial.prototype.constructor = THREE.MeshStandardMaterial;
  }

  if (!THREE.MeshPhysicalMaterial) {
    THREE.MeshPhysicalMaterial = THREE.MeshStandardMaterial;
  }

  if (THREE.BufferGeometry && !THREE.BufferGeometry.prototype.setIndex) {
    THREE.BufferGeometry.prototype.setIndex = function (index) {
      this.addAttribute('index', index);
      return this;
    };
  }
  if (THREE.BufferGeometry && !THREE.BufferGeometry.prototype.setAttribute && THREE.BufferGeometry.prototype.addAttribute) {
    THREE.BufferGeometry.prototype.setAttribute = function (name, attribute) {
      return this.addAttribute(name, attribute);
    };
  }

  if (!THREE.Interpolant) {
    THREE.Interpolant = function (parameterPositions, sampleValues, sampleSize, resultBuffer) {
      this.parameterPositions = parameterPositions;
      this.sampleValues = sampleValues;
      this.valueSize = sampleSize;
      this.resultBuffer = resultBuffer || new sampleValues.constructor(sampleSize);
      this._cachedIndex = 0;
    };
    THREE.Interpolant.prototype.evaluate = function () {
      return this.resultBuffer;
    };
  }

  if (THREE.sRGBEncoding === undefined) {
    THREE.sRGBEncoding = 3001;
  }
  if (THREE.LinearEncoding === undefined) {
    THREE.LinearEncoding = 3000;
  }
})();
