'use client';

import { useEffect, useRef } from 'react';
import { Box3, Color, DirectionalLight, Group, HemisphereLight, Mesh, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GridHelper } from 'three';
import { cn } from '@/lib/utils';

type LoadedGltf = {
  scene: Group;
};

type ThreeGlbViewerProps = {
  url?: string | null;
  className?: string;
  background?: string;
  badgeLabel?: string;
  title?: string;
  hint?: string;
  loading?: boolean;
  error?: string | null;
  autoRotate?: boolean;
  showGrid?: boolean;
  onError?: (message: string) => void;
};

function disposeObject(root: Group) {
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material?.dispose?.());
  });
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Failed to load the GLB asset.';
}

export function ThreeGlbViewer({
  url,
  className,
  background = '#020617',
  badgeLabel,
  title,
  hint,
  loading = false,
  error = null,
  autoRotate = true,
  showGrid = false,
  onError,
}: ThreeGlbViewerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();

    const scene = new Scene();
    scene.background = new Color(background);

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = false;
    host.appendChild(renderer.domElement);

    const camera = new PerspectiveCamera(42, 1, 0.1, 2000);
    camera.position.set(8, 6, 8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.35;
    controls.minDistance = 0.5;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2.02;

    const ambient = new HemisphereLight('#dbeafe', '#0f172a', 1.15);
    scene.add(ambient);

    const keyLight = new DirectionalLight('#ffffff', 1.4);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);

    const fillLight = new DirectionalLight('#9bd5ff', 0.7);
    fillLight.position.set(-6, 8, -4);
    scene.add(fillLight);

    const grid = showGrid ? new GridHelper(80, 80, '#334155', '#1e293b') : null;
    if (grid) {
      grid.position.y = -0.01;
      scene.add(grid);
    }

    const resize = () => {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(host);

    let frameId = 0;
    let mounted = true;
    let loadedRoot: Group | null = null;

    const animate = () => {
      if (!mounted) return;
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');

    if (url) {
      loader.load(
        url,
        (gltf: LoadedGltf) => {
          if (!mounted) {
            disposeObject(gltf.scene);
            return;
          }

          const root = gltf.scene.clone(true);
          root.traverse((node) => {
            if (!(node instanceof Mesh)) return;
            node.castShadow = false;
            node.receiveShadow = false;
            if (Array.isArray(node.material)) {
              node.material = node.material.map((material) => material.clone());
            } else if (node.material) {
              node.material = node.material.clone();
            }
          });

          const bounds = new Box3().setFromObject(root);
          const size = bounds.getSize(new Vector3());
          const center = bounds.getCenter(new Vector3());
          const maxDim = Math.max(size.x, size.y, size.z, 0.01);
          const distance = maxDim * 1.6 + 3;

          root.position.sub(center);
          scene.add(root);
          loadedRoot = root;

          camera.near = 0.1;
          camera.far = Math.max(500, distance * 20);
          camera.position.set(distance, distance * 0.72, distance);
          camera.updateProjectionMatrix();

          controls.target.set(0, 0, 0);
          controls.minDistance = Math.max(0.5, maxDim * 0.25);
          controls.maxDistance = Math.max(25, maxDim * 18);
          controls.update();
        },
        undefined,
        (loadError: unknown) => {
          const message = readableError(loadError);
          onError?.(message);
        }
      );
    }

    animate();

    return () => {
      mounted = false;
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      if (loadedRoot) {
        scene.remove(loadedRoot);
        disposeObject(loadedRoot);
      }
      if (grid) {
        scene.remove(grid);
      }
      renderer.dispose();
      host.replaceChildren();
    };
  }, [autoRotate, background, onError, showGrid, url]);

  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-black', className)}>
      <div ref={hostRef} className="absolute inset-0" />

      {(badgeLabel || title || hint) && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-sm rounded-2xl border border-white/10 bg-slate-950/72 px-4 py-3 backdrop-blur-md">
          {badgeLabel ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
              {badgeLabel}
            </p>
          ) : null}
          {title ? <p className="mt-1 text-sm font-medium text-white">{title}</p> : null}
          {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-300">{hint}</p> : null}
        </div>
      )}

      {loading ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div className="rounded-full border border-cyan-400/20 bg-slate-950/78 px-4 py-2 text-xs font-medium text-cyan-100 backdrop-blur-md">
            Loading GLB preview...
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 backdrop-blur-md">
          {error}
        </div>
      ) : null}
    </div>
  );
}
