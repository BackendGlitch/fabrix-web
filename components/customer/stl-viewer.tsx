'use client';

import { useEffect, useRef, useState } from 'react';

interface STLViewerProps {
  file: File;
  className?: string;
}

export function STLViewer({ file, className = '' }: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    let animationId: number;
    let renderer: any;
    let scene: any;
    let camera: any;
    let mesh: any;

    const initViewer = async () => {
      try {
        const THREE = await import('three');

        const arrayBuffer = await file.arrayBuffer();
        if (!arrayBuffer) throw new Error('Failed to read file');

        // Parse STL
        const geometry = new THREE.BufferGeometry();
        const view = new DataView(arrayBuffer);

        // Check if binary STL
        const isBinary = !(new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, 5)) === 'solid');

        let vertices: number[] = [];
        let normals: number[] = [];

        if (isBinary) {
          const trianglesCount = view.getUint32(80, true);
          let offset = 84;

          for (let i = 0; i < trianglesCount; i++) {
            const nx = view.getFloat32(offset, true);
            const ny = view.getFloat32(offset + 4, true);
            const nz = view.getFloat32(offset + 8, true);
            offset += 12;

            for (let j = 0; j < 3; j++) {
              vertices.push(view.getFloat32(offset, true));
              vertices.push(view.getFloat32(offset + 4, true));
              vertices.push(view.getFloat32(offset + 8, true));
              normals.push(nx, ny, nz);
              offset += 12;
            }

            offset += 2;
          }
        } else {
          const text = new TextDecoder().decode(arrayBuffer);
          const lines = text.split('\n');
          let currentNormal = { x: 0, y: 0, z: 0 };

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('facet normal')) {
              const parts = trimmed.split(/\s+/);
              currentNormal = {
                x: parseFloat(parts[2]),
                y: parseFloat(parts[3]),
                z: parseFloat(parts[4]),
              };
            } else if (trimmed.startsWith('vertex')) {
              const parts = trimmed.split(/\s+/);
              vertices.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
              normals.push(currentNormal.x, currentNormal.y, currentNormal.z);
            }
          }
        }

        if (vertices.length === 0) throw new Error('No vertices in STL');

        // Setup geometry
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        if (normals.length > 0) {
          geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
        }
        geometry.computeVertexNormals();

        // Center and scale the geometry
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox!;
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 50 / maxDim;

        geometry.translate(-center.x, -center.y, -center.z);
        geometry.scale(scale, scale, scale);

        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);

        // Create material and mesh
        const material = new THREE.MeshPhongMaterial({
          color: 0x2563eb,
          specular: 0x111111,
          shininess: 200,
          side: THREE.DoubleSide,
        });

        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Add axes
        const axesHelper = new THREE.AxesHelper(40);
        scene.add(axesHelper);

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.95));
        const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
        light1.position.set(50, 50, 50);
        scene.add(light1);

        // Setup camera
        const width = containerRef.current!.clientWidth;
        const height = containerRef.current!.clientHeight;

        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
        camera.position.z = 120;

        // Setup renderer
        const canvas = canvasRef.current!;
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Zoom state
        let zoomDistance = 120;
        const minZoom = 50;
        const maxZoom = 300;

        // Rotation state
        let isRotating = false;
        let rotationX = 0;
        let rotationY = 0;
        let prevX = 0;
        let prevY = 0;

        // Mouse events
        const onMouseDown = (e: MouseEvent) => {
          isRotating = true;
          prevX = e.clientX;
          prevY = e.clientY;
        };

        const onMouseMove = (e: MouseEvent) => {
          if (!isRotating) return;
          
          const deltaX = e.clientX - prevX;
          const deltaY = e.clientY - prevY;

          rotationY += deltaX * 0.005;
          rotationX += deltaY * 0.005;

          mesh.rotation.x = rotationX;
          mesh.rotation.y = rotationY;

          prevX = e.clientX;
          prevY = e.clientY;
        };

        const onMouseUp = () => {
          isRotating = false;
        };

        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          
          if (e.deltaY > 0) {
            zoomDistance = Math.min(zoomDistance + 10, maxZoom);
          } else {
            zoomDistance = Math.max(zoomDistance - 10, minZoom);
          }
          
          camera.position.z = zoomDistance;
        };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });

        // Resize handler
        const handleResize = () => {
          const w = containerRef.current?.clientWidth || width;
          const h = containerRef.current?.clientHeight || height;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);

        // Animation loop
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };

        animate();
        setLoading(false);

        // Cleanup
        return () => {
          window.removeEventListener('resize', handleResize);
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mouseleave', onMouseUp);
            canvas.removeEventListener('wheel', onWheel);
          }
          cancelAnimationFrame(animationId);
          
          // Safely dispose Three.js resources
          if (renderer) {
            renderer.dispose();
          }
          if (geometry) {
            geometry.dispose();
          }
          if (material) {
            material.dispose();
          }
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to load model';
        console.error('STL Viewer Error:', msg);
        setError(msg);
        setLoading(false);
      }
    };

    initViewer();
  }, [file]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: '500px' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ display: 'block' }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Loading 3D Model...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-20">
          <div className="text-center px-6">
            <p className="text-red-900 font-semibold mb-2">Error Loading Model</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* XYZ Axes Legend */}
          <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur-sm text-white rounded-lg p-3 z-10 pointer-events-none shadow-lg">
            <div className="text-xs font-semibold mb-2">Axes</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-0.5 bg-red-500" />
                <span className="text-red-400">X</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-0.5 bg-green-500" />
                <span className="text-green-400">Y</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-0.5 bg-blue-500" />
                <span className="text-blue-400">Z</span>
              </div>
            </div>
          </div>

          {/* Control Tips */}
          <div className="absolute bottom-4 left-4 bg-gray-900/80 backdrop-blur-sm text-white rounded-lg p-4 z-10 pointer-events-none shadow-lg">
            <div className="text-xs space-y-2">
              <div className="font-semibold mb-3 text-blue-300">Controls</div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-400">🖱️</span>
                <span>Drag to Rotate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-green-400">⇧</span>
                <span>Scroll Up to Zoom In</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-400">⇩</span>
                <span>Scroll Down to Zoom Out</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur-sm text-white rounded-full px-4 py-2 z-10 pointer-events-none text-xs font-medium shadow-lg">
            <span className="inline-block w-2 h-2 bg-blue-300 rounded-full mr-2 animate-pulse" />
            Model Loaded • Ready to View
          </div>
        </>
      )}
    </div>
  );
}
