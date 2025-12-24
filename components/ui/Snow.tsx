'use client'

import React, { useEffect, useRef } from 'react'

export default function Snow({ enabled = true }: { enabled?: boolean }) {
    if (!enabled) return null
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const canvasEl = canvas as HTMLCanvasElement
        const ctx = canvasEl.getContext('2d')
        if (!ctx) return
        const context = ctx as CanvasRenderingContext2D

        let animationId = 0
        // 雪花 (shape) 与 雪粒 (dot)
        let flakes: {
            x: number
            y: number
            r: number
            vx: number
            vy: number
            swing: number
            phase: number
            rot: number
        }[] = []
        let particles: {
            x: number
            y: number
            r: number
            vx: number
            vy: number
            alpha: number
        }[] = []

        const DPR = Math.max(1, window.devicePixelRatio || 1)

        function resize() {
            const w = window.innerWidth
            const h = window.innerHeight
            canvasEl.style.width = `${w}px`
            canvasEl.style.height = `${h}px`
            canvasEl.width = Math.floor(w * DPR)
            canvasEl.height = Math.floor(h * DPR)
            context.setTransform(DPR, 0, 0, DPR, 0, 0)
        }

        function initScene() {
            const w = window.innerWidth
            const h = window.innerHeight

            // 数量
            const flakesCount = Math.max(20, Math.round(w / 60))
            const particlesCount = Math.max(80, Math.round(w / 16))

            flakes = []
            particles = []

            for (let i = 0; i < flakesCount; i++) {
                // 雪花尺寸范围 1.0 - 3.5
                const r = 1.0 + Math.random() * 2.5
                flakes.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r,
                    vx: (Math.random() - 0.5) * 0.4, // 横向速度
                    vy: 0.2 + Math.random() * 0.7, // 竖向速度
                    swing: 0.4 + Math.random() * 1.2,
                    phase: Math.random() * Math.PI * 2,
                    rot: Math.random() * Math.PI * 2
                })
            }

            for (let i = 0; i < particlesCount; i++) {
                // 小粒子，用作低阶雪粒效果
                const r = 0.4 + Math.random() * 1.6
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r,
                    vx: (Math.random() - 0.5) * 0.6,
                    vy: 0.6 + Math.random() * 0.8,
                    alpha: 0.3 + Math.random() * 0.7
                })
            }
        }

        function drawSnowflake(x: number, y: number, r: number, rot: number) {
            // 六角雪花样式
            context.save()
            context.translate(x, y)
            context.rotate(rot)
            context.strokeStyle = 'rgba(255,255,255,0.95)'
            context.lineWidth = Math.max(0.6, r * 0.12)

            const armLen = r * 3.0
            for (let i = 0; i < 6; i++) {
                context.beginPath()
                context.moveTo(0, 0)
                context.lineTo(0, armLen)
                context.stroke()

                context.beginPath()
                context.moveTo(0, armLen * 0.5)
                context.lineTo(r * 0.8, armLen * 0.7)
                context.moveTo(0, armLen * 0.5)
                context.lineTo(-r * 0.8, armLen * 0.7)
                context.stroke()

                context.rotate((Math.PI * 2) / 6)
            }

            context.restore()
        }

        function draw() {
            const w = window.innerWidth
            const h = window.innerHeight
            context.clearRect(0, 0, w, h)

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i]
                p.x += p.vx * 0.6
                p.y += p.vy * 0.9

                if (p.y > h + 8) {
                    p.y = -8
                    p.x = Math.random() * w
                }
                if (p.x > w + 12) p.x = -12
                if (p.x < -12) p.x = w + 12

                context.beginPath()
                context.fillStyle = `rgba(255,255,255,${p.alpha})`
                context.arc(p.x, p.y, p.r, 0, Math.PI * 2)
                context.fill()
            }

            for (let i = 0; i < flakes.length; i++) {
                const f = flakes[i]
                f.phase += 0.008 * f.swing
                f.rot += 0.002 * f.swing
                f.x += f.vx + Math.sin(f.phase) * 0.4
                f.y += f.vy * 0.85

                if (f.y > h + 12) {
                    f.y = -12
                    f.x = Math.random() * w
                }
                if (f.x > w + 20) f.x = -20
                if (f.x < -20) f.x = w + 20

                drawSnowflake(f.x, f.y, f.r, f.rot)
            }
        }

        function loop() {
            draw()
            animationId = requestAnimationFrame(loop)
        }

        function handleResize() {
            resize()
            initScene()
        }

        window.addEventListener('resize', handleResize)
        resize()
        initScene()
        loop()

        return () => {
            window.removeEventListener('resize', handleResize)
            cancelAnimationFrame(animationId)
        }
    }, [])

    return <canvas ref={canvasRef} className="snow" aria-hidden="true" />
}


