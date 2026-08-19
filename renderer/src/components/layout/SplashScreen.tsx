import { useEffect, useRef, useState } from 'react'

interface Props {
  onDone: () => void
}

const DURATION = 2600

// ── Particles ────────────────────────────────────────────

interface Particle {
  id: number
  x: number
  y: number
  size: number
  opacity: number
  duration: number
  delay: number
  color: string
}

function generateParticles(count: number): Particle[] {
  const colors = ['#7a5cff', '#4fc3f7', '#9d87ff', '#80d8ff', '#c5b8ff']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.5 + 0.1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }))
}

const PARTICLES = generateParticles(40)

/**
 * Hybrid startup sound system:
 * 1. Loads startup.mp3 and runs it through a Web Audio processing pipeline:
 *    pitch-glide on start → dynamics compressor → high-shelf EQ → master gain
 *    + a subtle stereo chorus branch for width and uniqueness.
 * 2. Falls back to a pure synthesizer chord if the file cannot be decoded.
 */
async function playStartupSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()

    // ── Try loading the real startup.mp3 ─────────────────────────────
    try {
      const response = await fetch('./startup.mp3')
      if (!response.ok) throw new Error('fetch failed')
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer

      // Cinematic pitch-glide: starts slightly flat and rises to pitch.
      // Makes the startup feel alive and uniquely "Cipher".
      source.playbackRate.setValueAtTime(0.93, ctx.currentTime)
      source.playbackRate.linearRampToValueAtTime(1.0, ctx.currentTime + 0.4)

      // Dynamics compressor — tightens transients, adds studio punch
      const compressor = ctx.createDynamicsCompressor()
      compressor.threshold.value = -18
      compressor.knee.value = 8
      compressor.ratio.value = 4
      compressor.attack.value = 0.004
      compressor.release.value = 0.25

      // High-shelf EQ +2 dB @ 6 kHz — presence & clarity on any speaker
      const shelf = ctx.createBiquadFilter()
      shelf.type = 'highshelf'
      shelf.frequency.value = 6000
      shelf.gain.value = 2

      // Master gain: cinematic fade-in → natural tail
      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0, ctx.currentTime)
      masterGain.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 0.12)
      masterGain.gain.setValueAtTime(0.9, ctx.currentTime + 1.6)
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8)

      // Subtle stereo chorus: slightly detuned delay panned wide
      // adds natural width without any extra audio assets.
      const chorusDelay = ctx.createDelay(0.06)
      chorusDelay.delayTime.setValueAtTime(0.022, ctx.currentTime)
      chorusDelay.delayTime.linearRampToValueAtTime(0.028, ctx.currentTime + 2.5)
      const chorusGain = ctx.createGain()
      chorusGain.gain.value = 0.16
      const chorusPanner = ctx.createStereoPanner()
      chorusPanner.pan.value = 0.65

      // Signal chain: source → compressor → shelf → masterGain → out
      //                                     shelf → chorus branch → out
      source.connect(compressor)
      compressor.connect(shelf)
      shelf.connect(masterGain)
      masterGain.connect(ctx.destination)
      shelf.connect(chorusDelay)
      chorusDelay.connect(chorusGain)
      chorusGain.connect(chorusPanner)
      chorusPanner.connect(ctx.destination)

      source.start(ctx.currentTime)
      setTimeout(() => ctx.close().catch(() => {}), 3500)
      return // success — skip synthesizer fallback
    } catch {
      // File not available — fall through to synthesizer chord
    }

    // ── Fallback: pure Web Audio synthesizer chord ────────────────────
    // F#4, C#5, F#5, G#5, C#6 — Futuristic Cyber Chord
    const masterGain = ctx.createGain()
    masterGain.gain.setValueAtTime(0.22, ctx.currentTime)
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2)
    masterGain.connect(ctx.destination)

    const frequencies = [369.99, 554.37, 739.99, 830.61, 1108.73]
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const oscGain = ctx.createGain()
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      const startTime = ctx.currentTime + idx * 0.05
      oscGain.gain.setValueAtTime(0.001, startTime)
      oscGain.gain.linearRampToValueAtTime(0.15 / (idx + 1), startTime + 0.08)
      oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.8)
      osc.connect(oscGain)
      oscGain.connect(masterGain)
      osc.start(startTime)
      osc.stop(startTime + 2.0)
    })

    // Sub-bass thump
    const subOsc = ctx.createOscillator()
    const subGain = ctx.createGain()
    subOsc.type = 'sine'
    subOsc.frequency.setValueAtTime(110, ctx.currentTime)
    subOsc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.4)
    subGain.gain.setValueAtTime(0.3, ctx.currentTime)
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    subOsc.connect(subGain)
    subGain.connect(ctx.destination)
    subOsc.start(ctx.currentTime)
    subOsc.stop(ctx.currentTime + 0.6)

    setTimeout(() => ctx.close().catch(() => {}), 2500)
  } catch (err) {
    console.warn('Startup sound error:', err)
  }
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter')
  const [progress, setProgress] = useState(0)
  const [glitchActive, setGlitchActive] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    // Progress bar animation
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / (DURATION * 0.85)) * 100, 100)
      setProgress(pct)
    }, 16)

    // Glitch effect at ~40% in
    const glitchTimer = setTimeout(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 180)
    }, DURATION * 0.4)

    // Phases
    const holdTimer = setTimeout(() => setPhase('hold'), 350)

    const exitTimer = setTimeout(() => {
      setPhase('exit')
      clearInterval(progressInterval)
      setProgress(100)
    }, DURATION - 400)

    const doneTimer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true
        onDone()
      }
    }, DURATION)

    // Web Audio Synthesizer Chime
    playStartupSound()

    return () => {
      clearInterval(progressInterval)
      clearTimeout(glitchTimer)
      clearTimeout(holdTimer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <>
      <style>{`
        @keyframes sp-particle-float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: var(--op); }
          50% { transform: translateY(-18px) scale(1.2); opacity: calc(var(--op) * 1.6); }
        }
        @keyframes sp-logo-enter {
          0% { opacity: 0; transform: scale(0.7) translateY(20px); filter: blur(16px); }
          60% { opacity: 1; transform: scale(1.04) translateY(0); filter: blur(0); }
          80% { transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes sp-logo-exit {
          0% { opacity: 1; transform: scale(1); filter: blur(0); }
          100% { opacity: 0; transform: scale(1.08) translateY(-12px); filter: blur(8px); }
        }
        @keyframes sp-text-enter {
          0% { opacity: 0; letter-spacing: 0.3em; transform: translateY(12px); }
          100% { opacity: 1; letter-spacing: 0.08em; transform: translateY(0); }
        }
        @keyframes sp-text-exit {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes sp-subtitle-enter {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes sp-ring-pulse {
          0% { transform: scale(0.85); opacity: 0; }
          30% { opacity: 0.5; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes sp-ring-pulse-2 {
          0% { transform: scale(0.7); opacity: 0; }
          25% { opacity: 0.3; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes sp-scanline {
          0% { top: -4px; opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.3; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes sp-glow-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.06); }
        }
        @keyframes sp-progress {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sp-glitch-1 {
          0%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
          20% { clip-path: inset(20% 0 60% 0); transform: translateX(-4px); }
          40% { clip-path: inset(50% 0 30% 0); transform: translateX(4px); }
          60% { clip-path: inset(70% 0 10% 0); transform: translateX(-2px); }
          80% { clip-path: inset(10% 0 80% 0); transform: translateX(2px); }
        }
        @keyframes sp-bg-exit {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sp-vignette {
          0% { opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes sp-line-h {
          0% { transform: scaleX(0); opacity: 0; }
          40% { opacity: 0.6; }
          60% { transform: scaleX(1); opacity: 0.6; }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#04050c]"
        style={phase === 'exit' ? { animation: 'sp-bg-exit 500ms ease forwards' } : {}}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(122,92,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(122,92,255,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            animation: 'sp-vignette 3.2s ease both',
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, #04050c 100%)',
            animation: 'sp-vignette 3.2s ease both',
          }}
        />

        {/* Particles */}
        {PARTICLES.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              '--op': p.opacity,
              opacity: p.opacity,
              animation: `sp-particle-float ${p.duration}s ${p.delay}s ease-in-out infinite`,
            } as React.CSSProperties}
          />
        ))}

        {/* Scan line */}
        <div
          className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--cipher-violet)] to-transparent"
          style={{
            animation: `sp-scanline ${DURATION}ms linear both`,
            boxShadow: '0 0 8px #7a5cff, 0 0 20px rgba(122,92,255,0.4)',
          }}
        />

        {/* Outer rings */}
        <div className="pointer-events-none absolute flex items-center justify-center">
          <div
            className="h-[420px] w-[420px] rounded-full border border-[var(--cipher-violet)]/15"
            style={{ animation: 'sp-ring-pulse 2.4s 0.2s ease-out infinite' }}
          />
        </div>
        <div className="pointer-events-none absolute flex items-center justify-center">
          <div
            className="h-[300px] w-[300px] rounded-full border border-[var(--cipher-sky)]/12"
            style={{ animation: 'sp-ring-pulse-2 3s 0.6s ease-out infinite' }}
          />
        </div>

        {/* Horizontal accent lines */}
        <div
          className="pointer-events-none absolute left-[15%] right-[15%] h-px origin-left bg-gradient-to-r from-transparent via-[var(--cipher-violet)]/40 to-transparent"
          style={{ top: '30%', animation: 'sp-line-h 3.2s 0.3s ease both' }}
        />
        <div
          className="pointer-events-none absolute left-[15%] right-[15%] h-px origin-right bg-gradient-to-r from-transparent via-[var(--cipher-sky)]/30 to-transparent"
          style={{ top: '70%', animation: 'sp-line-h 3.2s 0.5s ease both' }}
        />

        {/* Main content */}
        <div className="relative flex flex-col items-center">

          {/* Glow backdrop */}
          <div
            className="absolute h-64 w-64 rounded-full blur-[60px]"
            style={{
              background: 'radial-gradient(circle, rgba(122,92,255,0.25) 0%, rgba(79,195,247,0.1) 50%, transparent 70%)',
              animation: 'sp-glow-pulse 2s 0.4s ease-in-out infinite',
            }}
          />

          {/* Logo container */}
          <div className="relative flex h-48 w-48 items-center justify-center">
            {/* Inner glow ring */}
            <div
              className="absolute h-36 w-36 rounded-[32px]"
              style={{
                background: 'radial-gradient(circle at 50% 40%, rgba(122,92,255,0.18), transparent 70%)',
                border: '1px solid rgba(122,92,255,0.2)',
                boxShadow: '0 0 40px rgba(122,92,255,0.15), inset 0 0 20px rgba(122,92,255,0.05)',
              }}
            />

            {/* Logo */}
            <img
              src="./logo.png"
              alt="Cipher"
              className="relative h-28 w-28 object-contain"
              style={{
                filter: 'drop-shadow(0 0 18px rgba(122,92,255,0.9)) drop-shadow(0 0 40px rgba(79,195,247,0.4))',
                animation: phase === 'exit'
                  ? 'sp-logo-exit 500ms ease forwards'
                  : 'sp-logo-enter 700ms cubic-bezier(0.16,1,0.3,1) both',
              }}
            />

            {/* Glitch layer */}
            {glitchActive && (
              <img
                src="./logo.png"
                alt=""
                aria-hidden
                className="absolute h-28 w-28 object-contain"
                style={{
                  filter: 'drop-shadow(0 0 18px rgba(79,195,247,1))',
                  animation: 'sp-glitch-1 180ms steps(1) both',
                  mixBlendMode: 'screen',
                }}
              />
            )}
          </div>

          {/* Text */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <h1
              className="text-[52px] font-semibold leading-normal text-[#eef3ff]"
              style={{
                textShadow: '0 0 30px rgba(122,92,255,0.5)',
                animation: phase === 'exit'
                  ? 'sp-text-exit 500ms ease forwards'
                  : 'sp-text-enter 600ms 200ms cubic-bezier(0.16,1,0.3,1) both',
              }}
            >
              Cipher
            </h1>
            <p
              className="text-[11px] font-semibold tracking-[0.6em] text-[var(--cipher-violet-soft)]"
              style={{
                animation: phase === 'exit'
                  ? 'sp-text-exit 500ms 50ms ease forwards'
                  : 'sp-subtitle-enter 600ms 420ms cubic-bezier(0.16,1,0.3,1) both',
              }}
            >
              STUDIO
            </p>
          </div>

          {/* Progress bar */}
          <div
            className="mt-10 h-[2px] w-48 overflow-hidden rounded-full bg-white/[0.06]"
            style={{ animation: `sp-progress ${DURATION}ms ease both` }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7a5cff, #4fc3f7)',
                boxShadow: '0 0 8px rgba(122,92,255,0.8)',
                transition: 'width 80ms linear',
              }}
            />
          </div>

          {/* Version tag */}
          <p
            className="mt-5 text-[11px] tracking-[0.15em] text-[#3a4060]"
            style={{
              animation: phase === 'exit'
                ? 'sp-text-exit 500ms 100ms ease forwards'
                : 'sp-subtitle-enter 600ms 600ms cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            v2.8.2
          </p>
        </div>
      </div>
    </>
  )
}
