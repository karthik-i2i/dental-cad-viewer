import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * STLViewerR3F — supports both:
 *   1. File-based (upload preview): scan1 / scan2 as File objects
 *   2. URL-based (AI result): stlUrl as URL string
 */
const EMPTY_STL_URLS = [];

const STLViewerR3F = ({ 
  file,
  stlUrl,
  stlUrls = EMPTY_STL_URLS,
  autoRotate = true,
  wireframe = false,
  accentColor = '#E8D5C3',
  background = '#111820',
  enablePan = true,
  showGrid = false
}) => {
  const hasInitializedRef = useRef(false);
  const mountRef = useRef(null);
  const sceneRef = useRef({});
  const lastSizeRef = useRef({ width: 0, height: 0 });

  /**
   * Presentation props must not participate in scene-identity React deps.
   * Latest values are read at bootstrap time and kept in sync via effects.
   */
  const presentationRef = useRef({
    autoRotate,
    wireframe,
    accentColor,
    background,
    enablePan,
    showGrid,
  });
  presentationRef.current = {
    autoRotate,
    wireframe,
    accentColor,
    background,
    enablePan,
    showGrid,
  };

  // ── Cleanup — mirrors STLViewer.jsx exactly ──────────────────────────────
  const cleanup = useCallback(() => {
    const s = sceneRef.current;
    if (s.animId)      cancelAnimationFrame(s.animId);
    if (s.controls)    s.controls.dispose();
    if (s.resizeObs)   s.resizeObs.disconnect();
    if (s.renderer) {
      s.renderer.dispose();
      if (s.renderer.forceContextLoss) {
        s.renderer.forceContextLoss();
      }
      if (
        mountRef.current &&
        s.renderer.domElement.parentNode === mountRef.current
      ) {
        mountRef.current.removeChild(s.renderer.domElement);
      }
    }
    if (s.meshes) {
      s.meshes.forEach(m => {
        m.geometry.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach(mat => mat.dispose());
        } else {
          m.material.dispose();
        }
        if (s.scene) s.scene.remove(m);
      });
    }
    sceneRef.current = {};
    hasInitializedRef.current = false;
  }, []);

  const prepareGeometry = useCallback((geometry) => {
    if (!geometry) return null;
    if (!geometry.attributes.normal) {
      geometry.computeVertexNormals();
    }
    geometry.computeBoundingBox?.();
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, []);

  const finishLoading = useCallback((results, index, geom, color, finished, total, initScene) => {
    results[index] = { geom, color };
    finished.current += 1;
    if (finished.current === total) {
      initScene(results);
    }
  }, []);

  const createRenderer = useCallback((mount, width, height) => {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    lastSizeRef.current = { width, height };
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    return renderer;
  }, []);

  const createCamera = useCallback((width, height) => {
    return new THREE.PerspectiveCamera(38, width / height, 0.1, 20000);
  }, []);

  const createControls = useCallback((camera, renderer) => {
    const { enablePan: panEnabled, autoRotate: rotateEnabled } =
      presentationRef.current;
    const controls = new OrbitControls(
      camera,
      renderer.domElement
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;
    controls.enablePan = panEnabled;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.screenSpacePanning = true;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minDistance = 5;
    controls.maxDistance = 10000;
    controls.autoRotate = rotateEnabled;
    controls.autoRotateSpeed = 2.0;
    camera.up.set(0, 1, 0);

    return controls;
  }, []);

  const createMeshes = useCallback((scene, geometries) => {
    const { accentColor: color, wireframe: isWireframe } =
      presentationRef.current;
    const meshes = [];
    geometries.forEach(({ geom }) => {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        metalness: 0,
        roughness: 0.65,
        side: THREE.DoubleSide,
        wireframe: isWireframe,
      });
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.rotation.set(0, 0, 0);
      scene.add(mesh);
      meshes.push(mesh);
    });
    scene.rotation.set(0, 0, 0);

    return meshes;
  }, []);

  const setupLights = useCallback((scene) => {
    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(60, 140, 100);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0xddeeff, 1.2);
    fillLight.position.set(-100, 40, -80);
    scene.add(fillLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(0, -60, -120);
    scene.add(rimLight);

    // Under light
    const underLight = new THREE.DirectionalLight(0xffffff, 0.7);
    underLight.position.set(0, -140, 0);
    scene.add(underLight);

    // Ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  }, []);

  const positionCamera = useCallback((camera, controls, meshes) => {
    const box = new THREE.Box3();
    meshes.forEach((mesh) => {
      box.expandByObject(mesh);
    });
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = Math.max(maxDim * 2.2, 100);
    camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance
    );
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
  }, []);

  const setupResizeObserver = useCallback((mount, camera, renderer) => {
    const handleResize = () => {
      if (!mount) return;
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width <= 0 || height <= 0) return;

      // Ignore no-op / sub-pixel churn — setSize on tiny layout shifts flashes the canvas.
      const prev = lastSizeRef.current;
      const nextW = Math.round(width);
      const nextH = Math.round(height);
      if (nextW === Math.round(prev.width) && nextH === Math.round(prev.height)) {
        return;
      }

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      lastSizeRef.current = { width, height };
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(mount);
    return resizeObs;
  }, []);

  const startAnimation = useCallback((scene, camera, renderer, controls) => {
    const animate = () => {
      sceneRef.current.animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }, []);

  // ── initScene — called once both geometries are ready ────────────────────
  //    geometries: array of { geom, color }
  const initScene = useCallback((geometries) => {
    cleanup();
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth  || 600;
    const h = mount.clientHeight || 400;
    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(presentationRef.current.background);
    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = createCamera(w, h);
    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = createRenderer(mount, w, h);
    // ── Controls — full free rotation, no pole restriction ─────────────────
    const controls = createControls(camera, renderer);
    // ── Process each geometry: centre + scale to 100 units ─────────────────
    const meshes = createMeshes(scene, geometries);
    // ── Lights — bright, neutral, multi-directional for clinical clarity ────
    // Key light: strong overhead-front
    setupLights(scene);
    // ── Compute combined bounding box for all meshes ───────────────────────
    positionCamera(camera, controls, meshes);
    // ── Resize observer ────────────────────────────────────────────────────
    const resizeObs = setupResizeObserver(mount, camera, renderer);
    // ── Animate ────────────────────────────────────────────────────────────
    startAnimation(scene, camera, renderer, controls);

    sceneRef.current = { scene, camera, renderer, controls, meshes, resizeObs };

  }, [cleanup, createRenderer, createCamera, createControls, createMeshes, setupLights,
      positionCamera, setupResizeObserver, startAnimation]);

  // ── Load files then fire initScene ────────────────────────────────────────
  useEffect(() => {
    if (!file && !stlUrl && stlUrls.length === 0) {
      cleanup();
      return;
    }

    const stlLoader = new STLLoader();
    const plyLoader = new PLYLoader();

    // URL-based mode (final AI result)
    if (stlUrls.length > 0) {
      const results = [];
      const finished = { current: 0 };

      stlUrls.forEach((entry, index) => {
        // entry may be a plain URL string (legacy: type inferred from the
        // URL's file extension), or { url, extension } — required for
        // Object URLs (blob:...), which carry no file extension of their
        // own and must state their type explicitly.
        const url = typeof entry === 'string' ? entry : entry.url;
        const declaredExtension =
          typeof entry === 'string' ? undefined : entry.extension;

        const isPly = declaredExtension
          ? declaredExtension.toLowerCase() === 'ply'
          : url.toLowerCase().endsWith('.ply');

        const loader = isPly
          ? plyLoader
          : stlLoader;

          loader.load(url, (geometry) => {
            const cleaned = prepareGeometry(geometry);

            finishLoading(
              results,
              index,
              cleaned,
              presentationRef.current.accentColor,
              finished,
              stlUrls.length,
              initScene
            );
          },
          undefined,
          (err) => {
            console.error('Load error', url, err);

          finished.current++;

          if (finished.current === stlUrls.length) {
            initScene(results.filter(Boolean));
          }
          }
        );
      });

      return cleanup;
    }

    // File-based mode (upload preview)
    const files = [
      { file, color: presentationRef.current.accentColor },
    ];
    const loaders = files.map(({ file, color }, idx) => {
      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const isPly = file.name.toLowerCase().endsWith('.ply');

            const geom = isPly
              ? plyLoader.parse(e.target.result)
              : stlLoader.parse(e.target.result);

            const cleaned = prepareGeometry(geom);

            resolve({
              index: idx,
              geom: cleaned || null,
              color,
              valid: !!cleaned,
            });
          } catch (err) {
            console.error('Parse error:', err);
            resolve({
              index: idx,
              geom: null,
              color,
              valid: false,
            });
          }
        };

        reader.onerror = () => resolve({ index: idx, geom: null, color, valid: false });

        reader.readAsArrayBuffer(file);
      });
    });

    Promise.all(loaders).then((results) => {
      const valid = results
        .filter(r => r?.valid && r.geom)
        .sort((a, b) => a.index - b.index);

      initScene(valid);
    });

    // Scene identity only — presentation props sync via effects below.
    return cleanup;
  }, [stlUrl, stlUrls, file, initScene, cleanup, prepareGeometry, finishLoading]);

  useEffect(() => {
    const handleFrontView = () => {
      const { camera, controls } = sceneRef.current;

      if (!camera || !controls) return;

      const target = controls.target.clone();

      const distance = camera.position.distanceTo(target);

      camera.position.set(
        target.x,
        target.y,
        target.z + distance
      );

      camera.lookAt(target);

      controls.update();
    };

    const moveCameraTo = (x, y, z) => {
      const { camera, controls } = sceneRef.current;

      if (!camera || !controls) return;

      const target = controls.target.clone();
      const distance = camera.position.distanceTo(target);

      camera.position.set(
        target.x + x * distance,
        target.y + y * distance,
        target.z + z * distance
      );

      camera.lookAt(target);
      controls.update();
    };

    const handleBackView = () => moveCameraTo(0, 0, -1);

    const handleLeftView = () => moveCameraTo(-1, 0, 0);

    const handleRightView = () => moveCameraTo(1, 0, 0);

    const handleTopView = () => moveCameraTo(0, 1, 0);

    const handleBottomView = () => moveCameraTo(0, -1, 0);

    window.addEventListener('viewer-front-view', handleFrontView);
    window.addEventListener('viewer-back-view', handleBackView);
    window.addEventListener('viewer-left-view', handleLeftView);
    window.addEventListener('viewer-right-view', handleRightView);
    window.addEventListener('viewer-top-view', handleTopView);
    window.addEventListener('viewer-bottom-view', handleBottomView);

    return () => {
      window.removeEventListener('viewer-front-view', handleFrontView);
      window.removeEventListener('viewer-back-view', handleBackView);
      window.removeEventListener('viewer-left-view', handleLeftView);
      window.removeEventListener('viewer-right-view', handleRightView);
      window.removeEventListener('viewer-top-view', handleTopView);
      window.removeEventListener('viewer-bottom-view', handleBottomView);
    };
  }, []);

  // ── Presentation sync — mutate existing Three objects, never rebuild ────
  useEffect(() => {
    const { meshes } = sceneRef.current;
    if (!meshes) return;
    meshes.forEach((mesh) => {
      if (mesh.material) {
        mesh.material.wireframe = wireframe;
      }
    });
  }, [wireframe]);

  useEffect(() => {
    const { meshes } = sceneRef.current;
    if (!meshes) return;
    const color = new THREE.Color(accentColor);
    meshes.forEach((mesh) => {
      if (mesh.material?.color) {
        mesh.material.color.copy(color);
      }
    });
  }, [accentColor]);

  useEffect(() => {
    const { scene } = sceneRef.current;
    if (!scene) return;
    if (scene.background && scene.background.isColor) {
      scene.background.set(background);
    } else {
      scene.background = new THREE.Color(background);
    }
  }, [background]);

  useEffect(() => {
    const { controls } = sceneRef.current;
    if (!controls) return;
    controls.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const { controls } = sceneRef.current;
    if (!controls) return;
    controls.enablePan = enablePan;
  }, [enablePan]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      
      {/* MAIN 3D VIEW */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 'inherit',
          overflow: 'hidden'
        }}
      />
    </div>
  );
};

export default STLViewerR3F;