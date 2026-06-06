"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * SwarmField — a hand-built WebGL constellation of "agent" nodes with glowing
 * proximity links. Mouse-reactive parallax, slow autonomous drift, additive glow.
 * SSR-safe, DPR-capped, pauses when hidden, respects prefers-reduced-motion,
 * and fully disposes on unmount. Drop it behind any hero as an absolute layer.
 */
export default function SwarmField({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COUNT = 130;
    const LINK_DIST = 3.4;
    const BOUND = 12;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 17;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // --- Nodes: positions, velocities, depth-graded colours (navy → cyan → gold) ---
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const vel: number[] = [];
    const cA = new THREE.Color("#3b82f6"); // blue
    const cB = new THREE.Color("#22d3ee"); // cyan
    const cC = new THREE.Color("#fbbf24"); // gold accent (brand)
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * BOUND * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * BOUND * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * BOUND * 2;
      vel.push((Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.012);
      const t = Math.random();
      const c = t < 0.85 ? cA.clone().lerp(cB, Math.random()) : cC.clone();
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    nodeGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const nodeMat = new THREE.PointsMaterial({
      size: 0.16, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    group.add(new THREE.Points(nodeGeo, nodeMat));

    // --- Links: rebuilt each frame for nearby node pairs ---
    const linkPos = new Float32Array(COUNT * COUNT * 3);
    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
    const linkMat = new THREE.LineBasicMaterial({
      color: new THREE.Color("#38bdf8"), transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    group.add(new THREE.LineSegments(linkGeo, linkMat));

    // --- Interaction + sizing ---
    const mouse = new THREE.Vector2(0, 0);
    const targetRot = new THREE.Vector2(0, 0);
    const onMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove);

    const resize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let running = true;
    const onVis = () => { running = !document.hidden; if (running) loop(); };
    document.addEventListener("visibilitychange", onVis);

    const d2 = LINK_DIST * LINK_DIST;
    const loop = () => {
      if (!running) return;
      raf = requestAnimationFrame(loop);

      const speed = reduced ? 0.15 : 1;
      // drift + wrap
      for (let i = 0; i < COUNT; i++) {
        for (let a = 0; a < 3; a++) {
          const idx = i * 3 + a;
          pos[idx] += vel[idx] * speed;
          if (pos[idx] > BOUND) pos[idx] = -BOUND;
          else if (pos[idx] < -BOUND) pos[idx] = BOUND;
        }
      }
      nodeGeo.attributes.position.needsUpdate = true;

      // rebuild proximity links
      let n = 0;
      for (let i = 0; i < COUNT; i++) {
        const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
        for (let j = i + 1; j < COUNT; j++) {
          const dx = ix - pos[j * 3], dy = iy - pos[j * 3 + 1], dz = iz - pos[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < d2) {
            linkPos[n++] = ix; linkPos[n++] = iy; linkPos[n++] = iz;
            linkPos[n++] = pos[j * 3]; linkPos[n++] = pos[j * 3 + 1]; linkPos[n++] = pos[j * 3 + 2];
          }
        }
      }
      linkGeo.setDrawRange(0, n / 3);
      linkGeo.attributes.position.needsUpdate = true;

      // parallax: ease group rotation toward mouse + gentle autonomous spin
      targetRot.x += (mouse.y * 0.25 - targetRot.x) * 0.04;
      targetRot.y += (mouse.x * 0.4 - targetRot.y) * 0.04;
      group.rotation.x = targetRot.x;
      group.rotation.y = targetRot.y + (reduced ? 0 : performance.now() * 0.00004);

      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      nodeGeo.dispose(); nodeMat.dispose();
      linkGeo.dispose(); linkMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden style={{ position: "absolute", inset: 0 }} />;
}
