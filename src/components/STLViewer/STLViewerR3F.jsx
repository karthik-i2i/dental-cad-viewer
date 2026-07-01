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
const STLViewerR3F = ({ 
  scan1, 
  scan2, 
  stlUrl,
  stlUrls = [],
  autoRotate = true,
  wireframe = false,
  accentColor = '#E8D5C3',
  background = '#111820',
  enablePan = true,
  showGrid = false
}) => {
  const mountRef = useRef(null);
  const sceneRef = useRef({});

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
    scene.background = new THREE.Color(background);

    // No grid for clean, professional appearance

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 20000);

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled   = true;
    renderer.shadowMap.type      = THREE.PCFShadowMap;
    // Use LinearToneMapping + exposure 1.0 for neutral, clinically accurate colour
    renderer.toneMapping         = THREE.LinearToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ── Controls — full free rotation, no pole restriction ─────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.08;
    controls.rotateSpeed    = 0.9;
    controls.zoomSpeed      = 1.0;
    controls.panSpeed       = 0.8;
    controls.enablePan      = enablePan;
    controls.enableZoom     = true;
    controls.enableRotate   = true;
    // Full sphere — no polar restrictions so clinicians can inspect from any angle
    controls.minPolarAngle  = 0;
    controls.maxPolarAngle  = Math.PI;
    controls.minDistance    = 5;
    controls.maxDistance    = 10000;
    controls.autoRotate     = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controls.enableDamping = true;
    controls.enableRotate = true;

    // IMPORTANT ADDITION
    controls.enablePan = enablePan;
    controls.screenSpacePanning = true;

    //THIS is what stabilizes “up direction”
    camera.up.set(0, 1, 0);
    // BUT allow horizontal orbit
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;

    // ── Process each geometry: centre + scale to 100 units ─────────────────
    const meshes = [];

    geometries.forEach(({ geom, color }, idx) => {
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(accentColor),
        metalness: 0,
        roughness: 0.65,
        side: THREE.DoubleSide,
        wireframe,
      });
      const mesh = new THREE.Mesh(geom, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
      mesh.rotation.set(0, 0, 0);
      scene.rotation.set(0, 0, 0);
    });

    // ── Lights — bright, neutral, multi-directional for clinical clarity ────
    // Key light: strong overhead-front
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(60, 140, 100);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    // Fill light: opposite side, slightly cooler, softens harsh shadows
    const fillLight = new THREE.DirectionalLight(0xddeeff, 1.2);
    fillLight.position.set(-100, 40, -80);
    scene.add(fillLight);

    // Back/rim light: separates model from background
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
    rimLight.position.set(0, -60, -120);
    scene.add(rimLight);

    // Under-fill: removes dark pockets on occlusal surfaces
    const underLight = new THREE.DirectionalLight(0xffffff, 0.7);
    underLight.position.set(0, -140, 0);
    scene.add(underLight);

    // Ambient: lifts the floor so no part is pitch-black
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // ── Compute combined bounding box for all meshes ───────────────────────
    const box = new THREE.Box3();
    meshes.forEach(mesh => {
      box.expandByObject(mesh);
    });
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(
      size.x,
      size.y,
      size.z
    );
    const distance = Math.max(maxDim * 2.2, 100);
    camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance
    );
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();

    // ── Resize observer ────────────────────────────────────────────────────
    const handleResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(mount);

    // ── Animate ────────────────────────────────────────────────────────────
    const animate = () => {
      const id = requestAnimationFrame(animate);
      sceneRef.current.animId = id;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { scene, camera, renderer, controls, meshes, resizeObs };
  }, [cleanup, background, accentColor, enablePan, autoRotate]);

  // ── Load files then fire initScene ────────────────────────────────────────
  useEffect(() => {
    if (!scan1 && !stlUrl && stlUrls.length === 0) {
      cleanup();
      return;
    }

    const stlLoader = new STLLoader();
    const plyLoader = new PLYLoader();

    // URL-based mode (final AI result)
    if (stlUrls.length > 0) {
      const results = [];
      let finished = 0;

      stlUrls.forEach((url, index) => {
        const isPly = url.toLowerCase().endsWith('.ply');

        const loader = isPly
          ? plyLoader
          : stlLoader;

          loader.load(url, (geometry) => {
            if (!geometry.attributes.normal) {
              geometry.computeVertexNormals();
            }

            // 🔧 FIX ORIENTATION HERE
            geometry.computeBoundingBox?.();

            const box = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
            const size = new THREE.Vector3();
            box.getSize(size);

            geometry.rotateX(-Math.PI / 2);

            results[index] = {
              geom: geometry,
              color: accentColor
            };

            finished++;

            if (finished === stlUrls.length) {
              initScene(results);
            }
          },
          undefined,
          (err) => {
            console.error('Load error', url, err);

            finished++;

            if (finished === stlUrls.length) {
              initScene(results.filter(Boolean));
            }
          }
        );
      });

      return cleanup;
    }

    // File-based mode (upload preview)
    const files   = [
      { file: scan1, color: accentColor },
      scan2 ? { file: scan2, color: accentColor } : null,
    ].filter(Boolean);

    const results  = new Array(files.length);
    let   finished = 0;

    files.forEach(({ file, color }, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const isPly = file.name.toLowerCase().endsWith('.ply');
          const geom = isPly
            ? plyLoader.parse(e.target.result)
            : stlLoader.parse(e.target.result);

          geom.computeVertexNormals();

          geom.computeBoundingBox?.();

          const box = new THREE.Box3().setFromObject(new THREE.Mesh(geom));
          const size = new THREE.Vector3();
          box.getSize(size);

          geom.rotateX(-Math.PI / 2);

          results[idx] = { geom, color };
          finished++;
          if (finished === files.length) {
            initScene(results);
          }
        } catch (parseErr) {
          console.error('STLViewerR3F: Parse error:', parseErr);
        }
      };
      reader.onerror = (e) => console.error('STLViewerR3F: FileReader error:', e);
      reader.readAsArrayBuffer(file);
    });

    return cleanup;
  }, [stlUrl, stlUrls, scan1, scan2, initScene, cleanup, accentColor]);

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

  // ── Update wireframe mode when toggled ──────────────────────────────────
  useEffect(() => {
    if (sceneRef.current.meshes) {
      sceneRef.current.meshes.forEach(mesh => {
        if (mesh.material) {
          mesh.material.wireframe = wireframe;
        }
      });
    }
  }, [wireframe]);

  // ── Update autoRotate when toggled ──────────────────────────────────────
  useEffect(() => {
    if (sceneRef.current.controls) {
      sceneRef.current.controls.autoRotate = autoRotate;
    }
  }, [autoRotate]);

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