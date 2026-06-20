'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/**
 * CINEMATIC HERO — a bloom-lit 3D consensus mesh.
 *
 * A volumetric cloud of glowing nodes wired into a mesh; consensus "pulses"
 * travel the edges and bloom dramatically on arrival. ACES filmic tone-mapping
 * + UnrealBloom give it the studio-flagship glow. Slow cinematic camera drift
 * with mouse parallax. Honours reduced-motion (single static frame) and frees
 * all GL resources on unmount.
 */

const NODES = 46
const C_EMERALD = new THREE.Color('#10D982')
const C_COOL = new THREE.Color('#5B8DEF')
const C_FLASH = new THREE.Color('#9CFFD8')

function glowTexture(): THREE.Texture {
  const s = 128
  const c = document.createElement('canvas'); c.width = c.height = s
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.2, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.3)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad; g.fillRect(0, 0, s, s)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

function fib(n: number, r: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const rad = Math.sqrt(1 - y * y)
    const th = phi * i
    // radial jitter -> volumetric cloud (not a clean shell)
    const rr = r * (0.62 + Math.random() * 0.5)
    pts.push(new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad).multiplyScalar(rr))
  }
  return pts
}

export default function CinematicHero3D({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    // Mobile / low-power devices choke on the UnrealBloom EffectComposer pipeline
    // (and the homepage already mounts other WebGL). Skip the heavy 3D entirely and
    // paint a lightweight CSS gradient so the hero stays smooth and never hangs.
    const nav = navigator as Navigator & { deviceMemory?: number }
    const lowPower =
      !!window.matchMedia?.('(max-width: 820px)').matches ||
      !!window.matchMedia?.('(pointer: coarse)').matches ||
      (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) ||
      (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4)
    if (lowPower) {
      mount.style.background =
        'radial-gradient(60% 70% at 28% 26%, rgba(16,217,130,0.16) 0%, transparent 60%), radial-gradient(55% 65% at 80% 30%, rgba(91,141,239,0.13) 0%, transparent 62%), radial-gradient(70% 80% at 55% 92%, rgba(16,217,130,0.08) 0%, transparent 72%)'
      return
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
    } catch { return }

    let w = mount.clientWidth || window.innerWidth
    let h = mount.clientHeight || window.innerHeight
    const dpr = Math.min(1.75, window.devicePixelRatio || 1)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h)
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    Object.assign(renderer.domElement.style, { width: '100%', height: '100%' })

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x05070b, 0.026)
    const camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 200)
    camera.position.set(0, 0, 14)

    const group = new THREE.Group(); scene.add(group)
    const tex = glowTexture()
    const positions = fib(NODES, 5.4)

    // Atmosphere — a few huge soft colour washes for depth
    const atmoMats: THREE.SpriteMaterial[] = []
    ;[[C_EMERALD, -8, 2, -14, 22], [C_COOL, 9, -4, -18, 26], [C_EMERALD, 2, 7, -22, 18]].forEach(([col, x, y, z, sc]) => {
      const m = new THREE.SpriteMaterial({ map: tex, color: (col as THREE.Color).clone(), transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false })
      const sp = new THREE.Sprite(m); sp.position.set(x as number, y as number, z as number); sp.scale.setScalar(sc as number)
      group.add(sp); atmoMats.push(m)
    })

    // Nodes — bright additive sprites (bloom turns these into glowing orbs)
    interface Node { sp: THREE.Sprite; mat: THREE.SpriteMaterial; base: THREE.Color; cur: THREE.Color; tgt: THREE.Color; baseScale: number }
    const nodes: Node[] = positions.map((p, i) => {
      const base = (i % 3 === 0 ? C_COOL : C_EMERALD).clone()
      const mat = new THREE.SpriteMaterial({ map: tex, color: base.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
      const sp = new THREE.Sprite(mat)
      const baseScale = 0.5 + Math.random() * 0.45
      sp.scale.setScalar(baseScale); sp.position.copy(p)
      group.add(sp)
      return { sp, mat, base, cur: base.clone(), tgt: base.clone(), baseScale }
    })

    // Edges — nearest neighbours, faint
    const edges: [number, number][] = []
    const seen = new Set<string>()
    positions.forEach((p, i) => {
      positions.map((q, j) => ({ j, d: p.distanceTo(q) })).filter(o => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
        .forEach(({ j }) => { const k = i < j ? `${i}-${j}` : `${j}-${i}`; if (!seen.has(k)) { seen.add(k); edges.push([i, j]) } })
    })
    const lp = new Float32Array(edges.length * 6)
    edges.forEach(([a, b], k) => { positions[a].toArray(lp, k * 6); positions[b].toArray(lp, k * 6 + 3) })
    const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(lp, 3))
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color('#2f6fae'), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })
    group.add(new THREE.LineSegments(lineGeo, lineMat))

    // Travelling consensus pulses
    interface Pulse { from: number; to: number; t: number; spd: number; sp: THREE.Sprite; mat: THREE.SpriteMaterial }
    const pulses: Pulse[] = []
    const tmp = new THREE.Vector3()
    function emit(from: number) {
      for (const [a, b] of edges) {
        let to = -1
        if (a === from) to = b; else if (b === from) to = a
        if (to < 0 || Math.random() > 0.75) continue
        const mat = new THREE.SpriteMaterial({ map: tex, color: C_FLASH.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
        const sp = new THREE.Sprite(mat); sp.scale.setScalar(0.42); group.add(sp)
        pulses.push({ from, to, t: 0, spd: 0.55 + Math.random() * 0.5, sp, mat })
      }
    }

    // Post-processing — the cinematic glow
    const composer = new EffectComposer(renderer)
    composer.setPixelRatio(dpr); composer.setSize(w, h)
    composer.addPass(new RenderPass(scene, camera))
    // Restraint: lower strength + tighter radius + higher threshold so only the
    // brightest nodes bloom — a focal glow on the mesh, not full-viewport orbs.
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.6, 0.45, 0.18)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    const pointer = new THREE.Vector2(0, 0), ptgt = new THREE.Vector2(0, 0)
    function onMove(e: MouseEvent) { ptgt.x = (e.clientX / window.innerWidth) * 2 - 1; ptgt.y = (e.clientY / window.innerHeight) * 2 - 1 }
    if (!reduce) window.addEventListener('mousemove', onMove, { passive: true })

    function resize() {
      w = mount!.clientWidth || window.innerWidth; h = mount!.clientHeight || window.innerHeight
      camera.aspect = w / h; camera.updateProjectionMatrix()
      renderer.setSize(w, h); composer.setSize(w, h)
    }
    window.addEventListener('resize', resize)

    const clock = new THREE.Clock()
    let raf = 0, running = true, emitClock = 0, scrollEase = 0
    function onVis() { running = !document.hidden; if (running && !reduce) { clock.getDelta(); loop() } }
    document.addEventListener('visibilitychange', onVis)

    function loop() {
      const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime
      emitClock += dt
      if (emitClock > 1.4) { emitClock = 0; emit(Math.floor(Math.random() * NODES)) }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i]; pu.t += pu.spd * dt
        if (pu.t >= 1) {
          nodes[pu.to].tgt.copy(C_FLASH); nodes[pu.to].cur.copy(C_FLASH) // arrival flash (bloom pops)
          group.remove(pu.sp); pu.mat.dispose(); pulses.splice(i, 1); continue
        }
        tmp.copy(positions[pu.from]).lerp(positions[pu.to], pu.t)
        pu.sp.position.copy(tmp); pu.sp.scale.setScalar(0.3 + Math.sin(pu.t * Math.PI) * 0.3)
      }

      nodes.forEach((n, i) => {
        n.cur.lerp(n.tgt, Math.min(1, dt * 3)); n.tgt.lerp(n.base, Math.min(1, dt * 1.6))
        n.mat.color.copy(n.cur)
        n.sp.scale.setScalar(n.baseScale * (1 + Math.sin(t * 1.4 + i) * 0.06))
      })

      if (!reduce) {
        group.rotation.y += dt * 0.08
        group.rotation.x = Math.sin(t * 0.12) * 0.14
        pointer.lerp(ptgt, 0.04)
        camera.position.x += (pointer.x * 2.2 - camera.position.x) * 0.04
        camera.position.y += (-pointer.y * 1.6 - camera.position.y) * 0.04
        const sp = Math.min(1, (window.scrollY || 0) / Math.max(1, innerHeight * 0.9))
        scrollEase += (sp - scrollEase) * 0.06
        group.rotation.y += scrollEase * dt * 0.6                          // scroll spins the network
        camera.position.z = 14 + Math.sin(t * 0.18) * 1.2 - scrollEase * 5.5 // scroll flies you into the mesh
        camera.lookAt(0, 0, 0)
      }
      composer.render()
      if (running && !reduce) raf = requestAnimationFrame(loop)
    }
    if (reduce) { camera.lookAt(0, 0, 0); composer.render() } else loop()

    return () => {
      cancelAnimationFrame(raf); running = false
      window.removeEventListener('mousemove', onMove); window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
      pulses.forEach(p => p.mat.dispose())
      nodes.forEach(n => n.mat.dispose())
      atmoMats.forEach(m => m.dispose())
      lineGeo.dispose(); lineMat.dispose(); tex.dispose()
      bloom.dispose(); composer.dispose(); renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden="true" />
}
