"use client";

import { useEffect, useRef, useState } from "react";

interface STLViewerProps {
  file: File;
  className?: string;
  scale?: number;
  onDimensions?: (dimensions: {
    width: number;
    height: number;
    depth: number;
  }) => void;
}

export function STLViewer({
  file,
  className = "",
  scale = 1,
  onDimensions,
}: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
    depth: number;
  } | null>(null);

  // Three.js references
  const rendererRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const meshRef = useRef<any>(null);

  useEffect(() => {
    // Wait for refs to be properly mounted
    if (!containerRef.current || !canvasRef.current) return;

    let animationId: number;
    let renderer: any;
    let scene: any;
    let camera: any;
    let mesh: any;

    const initViewer = async () => {
      try {
        const THREE = await import("three");

        const arrayBuffer = await file.arrayBuffer();
        if (!arrayBuffer) throw new Error("Failed to read file");

        console.log("File loaded, size:", arrayBuffer.byteLength, "bytes");

        // Parse STL
        const geometry = new THREE.BufferGeometry();
        const view = new DataView(arrayBuffer);

        // Better binary detection: Binary STL has:
        // - 80 byte header (can contain anything)
        // - 4 bytes at offset 80: triangle count (uint32)
        // - Then triangles (50 bytes each)
        // ASCII STL is text-based
        let isBinary = true;
        
        // Check if file size matches binary format
        if (arrayBuffer.byteLength >= 84) {
          const triangleCount = view.getUint32(80, true);
          const expectedSize = 84 + triangleCount * 50;
          const headerText = new TextDecoder().decode(new Uint8Array(arrayBuffer, 0, Math.min(80, arrayBuffer.byteLength)));
          
          // If file is text-like and starts with "solid", might be ASCII
          // But check if the structure makes sense for ASCII
          const isTextHeader = /^solid\s+/i.test(headerText.trim());
          const binaryStructureMatches = Math.abs(arrayBuffer.byteLength - expectedSize) < 50;
          
          // Prefer binary if structure matches or file is not clearly ASCII
          if (binaryStructureMatches || !isTextHeader) {
            isBinary = true;
          } else {
            // Only treat as ASCII if header looks text-like AND file size doesn't match binary format
            try {
              const fullText = new TextDecoder().decode(arrayBuffer);
              isBinary = !fullText.includes("facet") && !fullText.includes("vertex");
            } catch {
              isBinary = true;
            }
          }
        }

        console.log("File format - Size:", arrayBuffer.byteLength, "isBinary:", isBinary);

        let vertices: number[] = [];
        let normals: number[] = [];

        if (isBinary) {
          try {
            if (arrayBuffer.byteLength >= 84) {
              const trianglesCount = view.getUint32(80, true);
              let offset = 84;
              let trianglesRead = 0;

              for (let i = 0; i < trianglesCount; i++) {
                if (offset + 50 > arrayBuffer.byteLength) {
                  break;
                }

                const nx = view.getFloat32(offset, true);
                const ny = view.getFloat32(offset + 4, true);
                const nz = view.getFloat32(offset + 8, true);
                offset += 12;

                for (let j = 0; j < 3; j++) {
                  if (offset + 12 > arrayBuffer.byteLength) break;
                  vertices.push(view.getFloat32(offset, true));
                  vertices.push(view.getFloat32(offset + 4, true));
                  vertices.push(view.getFloat32(offset + 8, true));
                  normals.push(nx, ny, nz);
                  offset += 12;
                }

                offset += 2; // attribute byte count
                trianglesRead++;
              }
              console.log("Binary parse result - triangles read:", trianglesRead, "vertices:", vertices.length / 3);
            }
          } catch (e) {
            console.log("Binary parse failed:", e);
            vertices = [];
            normals = [];
          }
        }

        // If binary parsing got no vertices, try ASCII
        if (vertices.length === 0) {
          try {
            console.log("Attempting ASCII parse...");
            const text = new TextDecoder().decode(arrayBuffer);
            const lines = text.split("\n");
            let currentNormal = { x: 0, y: 0, z: 0 };
            let facetCount = 0;
            let vertexCount = 0;

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();

              if (!line) continue;

              const lower = line.toLowerCase();
              
              if (lower.startsWith("facet")) {
                facetCount++;
                const parts = line.split(/\s+/);
                for (let j = 0; j < parts.length - 3; j++) {
                  if (parts[j].toLowerCase() === "normal") {
                    const nx = parseFloat(parts[j + 1]);
                    const ny = parseFloat(parts[j + 2]);
                    const nz = parseFloat(parts[j + 3]);
                    if (!isNaN(nx) && !isNaN(ny) && !isNaN(nz)) {
                      currentNormal = { x: nx, y: ny, z: nz };
                    }
                    break;
                  }
                }
              } 
              else if (lower.startsWith("vertex")) {
                vertexCount++;
                const parts = line.split(/\s+/);
                if (parts.length >= 4) {
                  const x = parseFloat(parts[1]);
                  const y = parseFloat(parts[2]);
                  const z = parseFloat(parts[3]);
                  if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    vertices.push(x, y, z);
                    normals.push(currentNormal.x, currentNormal.y, currentNormal.z);
                  }
                }
              }
            }
            console.log("ASCII parse result - facets:", facetCount, "vertices:", vertices.length / 3);
          } catch (e) {
            console.log("ASCII parse failed:", e);
          }
        }

        if (vertices.length === 0) {
          throw new Error(
            "No vertices found in STL file. The file may be empty, corrupted, or in an unsupported format."
          );
        }

        console.log("Final vertices count:", vertices.length / 3);

        // Setup geometry
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(vertices), 3),
        );
        if (normals.length > 0) {
          geometry.setAttribute(
            "normal",
            new THREE.BufferAttribute(new Float32Array(normals), 3),
          );
        }
        geometry.computeVertexNormals();

        // Compute bounding box and dimensions
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox!;
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        const dims = {
          width: size.x,
          height: size.y,
          depth: size.z,
        };
        setDimensions(dims);
        onDimensions?.(dims);

        // Center geometry
        geometry.translate(-center.x, -center.y, -center.z);

        // Note: Scaling will be applied via mesh.scale to preserve original dimensions

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
        // Apply scale to mesh (not geometry) to preserve original dimensions
        mesh.scale.set(scale, scale, scale);
        mesh.position.set(0, 0, 0); // Ensure mesh is centered
        scene.add(mesh);

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(40);
        scene.add(axesHelper);

        // Lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.95));
        const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
        light1.position.set(50, 50, 50);
        scene.add(light1);

        // Setup camera - with proper null checks
        if (!containerRef.current) {
          throw new Error("Container ref is not available");
        }

        const width = containerRef.current.clientWidth || 800;
        const height = containerRef.current.clientHeight || 600;

        if (width === 0 || height === 0) {
          throw new Error("Container has no dimensions - make sure it's visible");
        }

        camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
        camera.position.z = 120;

        // Setup renderer
        if (!canvasRef.current) {
          throw new Error("Canvas ref is not available");
        }

        const canvas = canvasRef.current;
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Store references
        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;
        meshRef.current = mesh;

        // Camera state
        let zoomDistance = 120;
        const minZoom = 30;
        const maxZoom = 500;
        let targetZoom = zoomDistance;

        // Rotation state
        let isRotating = false;
        let rotationX = 0;
        let rotationY = 0;
        let prevX = 0;
        let prevY = 0;

        // Panning state
        let isPanning = false;
        let panX = 0;
        let panY = 0;
        let prevPanX = 0;
        let prevPanY = 0;

        // Mouse events
        const onMouseDown = (e: MouseEvent) => {
          if (e.button === 0) {
            isRotating = true;
            prevX = e.clientX;
            prevY = e.clientY;
          } else if (e.button === 2) {
            isPanning = true;
            prevPanX = e.clientX;
            prevPanY = e.clientY;
          }
          e.preventDefault();
        };

        const onMouseMove = (e: MouseEvent) => {
          if (isRotating) {
            const deltaX = e.clientX - prevX;
            const deltaY = e.clientY - prevY;

            rotationY += deltaX * 0.01;
            rotationX += deltaY * 0.01;

            prevX = e.clientX;
            prevY = e.clientY;
          }

          if (isPanning) {
            const deltaX = e.clientX - prevPanX;
            const deltaY = e.clientY - prevPanY;

            panX += deltaX * 0.5;
            panY -= deltaY * 0.5;

            prevPanX = e.clientX;
            prevPanY = e.clientY;
          }
        };

        const onMouseUp = (e: MouseEvent) => {
          isRotating = false;
          isPanning = false;
        };

        const onContextMenu = (e: MouseEvent) => {
          e.preventDefault();
        };

        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          const zoomAmount = e.deltaY > 0 ? 0.8 : 1.2;
          targetZoom *= zoomAmount;
          targetZoom = Math.max(minZoom, Math.min(maxZoom, targetZoom));
        };

        // Smooth camera updates in animation loop
        const updateCamera = () => {
          zoomDistance += (targetZoom - zoomDistance) * 0.1;
          camera.position.z = zoomDistance;
          mesh.rotation.x = rotationX;
          mesh.rotation.y = rotationY;
          camera.position.x = panX;
          camera.position.y = panY;
        };

        // Event listeners
        canvas.addEventListener("mousedown", onMouseDown, true);
        canvas.addEventListener("mousemove", onMouseMove, true);
        canvas.addEventListener("mouseup", onMouseUp, true);
        canvas.addEventListener("mouseleave", onMouseUp, true);
        canvas.addEventListener("contextmenu", onContextMenu, true);
        canvas.addEventListener("wheel", onWheel, { passive: false, capture: true });
        
        // Also add document-level listeners to catch events outside canvas
        document.addEventListener("mousemove", onMouseMove, true);
        document.addEventListener("mouseup", onMouseUp, true);

        // Resize handler
        const handleResize = () => {
          const w = containerRef.current?.clientWidth || width;
          const h = containerRef.current?.clientHeight || height;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };

        window.addEventListener("resize", handleResize);

        // Animation loop
        const animate = () => {
          animationId = requestAnimationFrame(animate);
          updateCamera();
          renderer.render(scene, camera);
        };

        animate();
        setLoading(false);

        // Cleanup
        return () => {
          window.removeEventListener("resize", handleResize);
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.removeEventListener("mousedown", onMouseDown, true);
            canvas.removeEventListener("mousemove", onMouseMove, true);
            canvas.removeEventListener("mouseup", onMouseUp, true);
            canvas.removeEventListener("mouseleave", onMouseUp, true);
            canvas.removeEventListener("wheel", onWheel, true);
            canvas.removeEventListener("contextmenu", onContextMenu, true);
          }
          // Remove document listeners
          document.removeEventListener("mousemove", onMouseMove, true);
          document.removeEventListener("mouseup", onMouseUp, true);
          
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
        const msg = err instanceof Error ? err.message : "Failed to load model";
        console.error("STL Viewer Error:", msg);
        console.error("Full error:", err);
        setError(msg);
        setLoading(false);
      }
    };

    initViewer();
  }, [file]);

  // Update scaling when scale prop changes
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.scale.set(scale, scale, scale);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  }, [scale]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: "500px" }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ display: "block" }}
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
            <p className="text-red-900 font-semibold mb-2">
              Error Loading Model
            </p>
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
              <div className="flex items-center gap-2">
                <span className="font-bold text-purple-400">🤚</span>
                <span>Right-click to Pan</span>
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
