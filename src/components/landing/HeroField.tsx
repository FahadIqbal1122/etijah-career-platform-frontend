'use client'

// HeroField — the brand constellation as a full-banner canvas background. The Etijahi "horizon" asterism (same node
// layout as LandingConstellation) rises across the whole hero in blue with a teal north star; faint ambient stars drift
// around it. The cursor lights up nearby stars, pulls them slightly toward it and draws teal threads to them.
// Touch screens and reduced-motion users get the calm version (no cursor effects / a still frame).

import { useEffect, useRef } from 'react'

// asterism nodes and links, in the 520x360 space of LandingConstellation
const NODES: [number, number][] = [
  [40, 300], [96, 250], [70, 188], [150, 214], [198, 158], [256, 196],
  [250, 116], [320, 138], [360, 80], [414, 118], [446, 56], [482, 30],
]
const LINKS: [number, number][] = [
  [0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [4, 6], [6, 7],
  [7, 8], [8, 9], [8, 10], [10, 11], [2, 4], [5, 7], [9, 11],
]

const REACH = 190 // cursor influence radius, px
const LINK_DIST_WIDE = 150 // ambient star-to-star link distance, px (phones use a shorter one)

interface Star {
  hx: number // home position
  hy: number
  x: number
  y: number
  r: number
  main: boolean
  north: boolean
  ph: number // drift phase
  sp: number // drift speed
  amp: number // drift amplitude
  glow: number // 0..1 cursor glow
}

// tone 'light': blue on a light background (the hero). 'onteal': white on the teal final banner.
// fadeMode: where the field is quieter so text stays readable: 'left' (hero text) or 'center' (centred banner text).
export default function HeroField({ tone = 'light', fadeMode = 'left' }: { tone?: 'light' | 'onteal'; fadeMode?: 'left' | 'center' }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    const host = canvas?.parentElement
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const BLUE = tone === 'onteal' ? '255,255,255' : '7,112,186'
    const TEAL = tone === 'onteal' ? '255,255,255' : '0,201,167'
    // const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const FREEZE_ANIMATION = true // set to false to bring the constellation animation back
    const reduced = FREEZE_ANIMATION || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, linkDist = LINK_DIST_WIDE
    let stars: Star[] = []
    const mouse = { x: -9999, y: -9999, on: false }

    // tiny seeded random so the ambient stars sit in the same places on every load
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

    function build() {
      const r = host!.getBoundingClientRect()
      w = r.width; h = r.height
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(w * dpr); canvas!.height = Math.round(h * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      linkDist = w < 700 ? 95 : LINK_DIST_WIDE
      seed = 7
      stars = []
      // the asterism spans the banner from left edge to right edge. On a narrow (phone) banner, which is much taller than
      // wide, it keeps its proportions in a band of its own instead of being squeezed into the full height.
      const narrow = w < 700
      const bandH = narrow ? Math.min(h * 0.8, w * 1.05) : h
      const bandTop = narrow ? h * 0.22 : 0
      const padX = w * 0.03, padTop = bandTop + bandH * 0.1, padBot = h - (bandTop + bandH) + bandH * 0.1
      NODES.forEach(([nx, ny], i) => {
        const x = padX + ((nx - 40) / (482 - 40)) * (w - padX * 2)
        const y = padTop + ((ny - 30) / (300 - 30)) * (h - padTop - padBot)
        stars.push({ hx: x, hy: y, x, y, r: i === NODES.length - 1 ? 5.4 : 3.6, main: true, north: i === NODES.length - 1, ph: rnd() * 6.28, sp: 0.25 + rnd() * 0.2, amp: 4, glow: 0 })
      })
      const ambient = narrow ? 16 : Math.max(26, Math.min(80, Math.round((w * h) / 17000)))
      for (let k = 0; k < ambient; k++) {
        const x = rnd() * w, y = rnd() * h
        stars.push({ hx: x, hy: y, x, y, r: 1.2 + rnd() * 1.6, main: false, north: false, ph: rnd() * 6.28, sp: 0.2 + rnd() * 0.35, amp: 6 + rnd() * 8, glow: 0 })
      }
    }

    // quieter over the intro text on the left, full strength behind the reviews; the cursor always brings it back
    const fade = (x: number) => {
      const d = fadeMode === 'center' ? Math.abs(x - w / 2) - w * 0.12 : x - w * 0.25
      const k = Math.min(1, Math.max(0, d / (w * (fadeMode === 'center' ? 0.28 : 0.35))))
      return 0.28 + 0.72 * (k * k * (3 - 2 * k))
    }

    function draw(t: number) {
      const time = t / 1000
      ctx!.clearRect(0, 0, w, h)

      for (const s of stars) {
        // gentle drift
        let tx = s.hx + Math.cos(time * s.sp + s.ph) * s.amp
        let ty = s.hy + Math.sin(time * s.sp * 1.2 + s.ph) * s.amp
        let g = 0
        if (mouse.on) {
          const dx = mouse.x - tx, dy = mouse.y - ty
          const d = Math.hypot(dx, dy)
          if (d < REACH) {
            g = 1 - d / REACH
            tx += dx * g * 0.12 // pulled toward the cursor
            ty += dy * g * 0.12
          }
        }
        s.x += (tx - s.x) * 0.12
        s.y += (ty - s.y) * 0.12
        s.glow += (g - s.glow) * 0.14
      }

      // links: the asterism first (bright), then ambient neighbours (faint)
      ctx!.lineCap = 'round'
      for (const [a, b] of LINKS) {
        const A = stars[a], B = stars[b]
        const g = Math.max(A.glow, B.glow)
        const f = Math.max(fade((A.x + B.x) / 2), g)
        ctx!.strokeStyle = g > 0.02 ? `rgba(${TEAL},${(0.5 + g * 0.4) * f})` : `rgba(${BLUE},${0.55 * f})`
        ctx!.lineWidth = 1.7 + g * 0.8
        ctx!.beginPath(); ctx!.moveTo(A.x, A.y); ctx!.lineTo(B.x, B.y); ctx!.stroke()
      }
      ctx!.lineWidth = 1
      for (let i = NODES.length; i < stars.length; i++) {
        const A = stars[i]
        for (let j = i + 1; j < stars.length; j++) {
          const B = stars[j]
          const d = Math.hypot(A.x - B.x, A.y - B.y)
          if (d > linkDist) continue
          const g = Math.max(A.glow, B.glow)
          const a = (1 - d / linkDist) * (0.2 + g * 0.5) * Math.max(fade((A.x + B.x) / 2), g)
          ctx!.strokeStyle = g > 0.05 ? `rgba(${TEAL},${a})` : `rgba(${BLUE},${a})`
          ctx!.beginPath(); ctx!.moveTo(A.x, A.y); ctx!.lineTo(B.x, B.y); ctx!.stroke()
        }
      }

      // cursor threads
      if (mouse.on) {
        for (const s of stars) {
          if (s.glow < 0.06) continue
          ctx!.strokeStyle = `rgba(${TEAL},${s.glow * 0.7})`
          ctx!.lineWidth = 1.2
          ctx!.beginPath(); ctx!.moveTo(mouse.x, mouse.y); ctx!.lineTo(s.x, s.y); ctx!.stroke()
        }
        const halo = ctx!.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 90)
        halo.addColorStop(0, `rgba(${TEAL},0.22)`); halo.addColorStop(1, `rgba(${TEAL},0)`)
        ctx!.fillStyle = halo
        ctx!.fillRect(mouse.x - 90, mouse.y - 90, 180, 180)
      }

      // stars
      for (const s of stars) {
        const lit = s.glow
        const r = s.r * (1 + lit * 0.9)
        if (s.north || lit > 0.05) {
          const hr = r * (s.north ? 5 : 3.4)
          const gr = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, hr)
          gr.addColorStop(0, `rgba(${TEAL},${(s.north ? 0.45 : 0.4) * Math.max(lit, s.north ? 1 : 0)})`)
          gr.addColorStop(1, `rgba(${TEAL},0)`)
          ctx!.fillStyle = gr
          ctx!.beginPath(); ctx!.arc(s.x, s.y, hr, 0, 6.283); ctx!.fill()
        }
        ctx!.beginPath(); ctx!.arc(s.x, s.y, r, 0, 6.283)
        const f = Math.max(fade(s.x), lit)
        ctx!.fillStyle = s.north || lit > 0.3 ? `rgb(${TEAL})` : s.main ? `rgba(${BLUE},${0.9 * f})` : `rgba(${BLUE},${(0.28 + lit * 0.5) * f})`
        ctx!.fill()
      }

    }

    function frame(t: number) {
      draw(t)
      if (visible && !reduced) raf = requestAnimationFrame(frame)
    }

    function start() {
      cancelAnimationFrame(raf)
      if (reduced) { raf = requestAnimationFrame(frame); return } // one still frame
      raf = requestAnimationFrame(frame)
    }

    build(); start()

    // The review stack below changes the banner's height a little on every slide. Only rebuild for a real resize, and
    // redraw straight away: resizing a canvas clears it, and waiting for the next frame left it blank for a moment.
    const onResize = () => {
      const r = host.getBoundingClientRect()
      if (Math.abs(r.width - w) < 1 && Math.abs(r.height - h) < 48) return
      build(); draw(performance.now())
      if (reduced) start()
    }
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top
      mouse.on = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= r.width && mouse.y <= r.height
    }
    const onLeave = () => { mouse.on = false }

    const ro = new ResizeObserver(onResize); ro.observe(host)
    // pause when scrolled out of view or the tab is hidden
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !reduced) start()
    })
    io.observe(host)
    const onVis = () => { visible = !document.hidden; if (visible && !reduced) start() }
    document.addEventListener('visibilitychange', onVis)
    if (fine && !reduced) {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.addEventListener('pointerleave', onLeave)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [tone, fadeMode])

  return <canvas ref={ref} aria-hidden="true" className="hero-field" />
}
