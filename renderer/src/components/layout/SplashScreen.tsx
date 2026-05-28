import { useEffect, useState } from 'react'

interface Props {
  onDone: () => void
}

const FALLBACK_DURATION = 3600

export default function SplashScreen({ onDone }: Props) {
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const sound = new Audio('./startup.mp3')
    sound.volume = 0.34

    let done = false
    let exitTimer = 0
    let endTimer = 0

    const finish = () => {
      if (done) return
      done = true
      setExiting(true)
      endTimer = window.setTimeout(onDone, 460)
    }

    const armFallback = (duration = FALLBACK_DURATION) => {
      window.clearTimeout(exitTimer)
      exitTimer = window.setTimeout(finish, Math.max(2600, duration))
    }

    sound.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(sound.duration) && sound.duration > 0) {
        armFallback(sound.duration * 1000)
      }
    })
    sound.addEventListener('ended', finish)

    sound.play().catch(() => {
      armFallback()
    })
    armFallback()

    return () => {
      done = true
      window.clearTimeout(exitTimer)
      window.clearTimeout(endTimer)
      sound.pause()
    }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#080a12]">
      <div
        className="absolute inset-[3%] rounded-[18px] border border-white/[0.08] bg-[#080a12]"
        style={{ animation: 'cipher-shell-in 3.6s ease both' }}
      />
      <div
        className="absolute h-[1px] w-[70%] bg-gradient-to-r from-transparent via-[#80d8ff] to-transparent blur-[1px]"
        style={{ animation: 'cipher-scan 3.6s cubic-bezier(.2,.8,.2,1) both' }}
      />
      <div className="absolute h-64 w-64 rounded-full border border-[#7a5cff]/25" style={{ animation: 'cipher-ring 2.4s ease-out infinite' }} />
      <div className="absolute h-96 w-96 rounded-full border border-[#4fc3f7]/10" style={{ animation: 'cipher-ring 3s 0.3s ease-out infinite' }} />

      <div className={`relative flex flex-col items-center transition-opacity duration-500 ${exiting ? 'opacity-0' : 'opacity-100'}`}>
        <div className="relative flex h-44 w-44 items-center justify-center">
          <div className="absolute h-36 w-36 rounded-[30px] border border-white/[0.08] bg-[#10131f]/75 shadow-[0_0_70px_rgba(122,92,255,0.26)]" />
          <img
            src="./logo.png"
            alt="Cipher"
            className="relative h-28 w-28 object-contain drop-shadow-[0_0_22px_rgba(122,92,255,0.85)]"
            style={{ animation: 'cipher-logo-rise 3.6s cubic-bezier(.2,.8,.2,1) both' }}
          />
        </div>

        <div className="mt-10 text-center">
          <div
            className="text-5xl font-semibold tracking-[0.08em] text-[#eef3ff]"
            style={{ animation: 'cipher-wordmark 3.6s cubic-bezier(.2,.8,.2,1) both' }}
          >
            Cipher
          </div>
          <div
            className="mt-6 text-[11px] font-medium tracking-[0.58em] text-[#9d87ff]"
            style={{ animation: 'cipher-subtitle 3.6s cubic-bezier(.2,.8,.2,1) both' }}
          >
            CODE EDITOR
          </div>
        </div>
      </div>
    </div>
  )
}
