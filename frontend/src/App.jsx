import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  AudioLines,
  Check,
  Copy,
  Download,
  Loader2,
  Moon,
  Pause,
  Play,
  Sparkles,
  Sun,
} from 'lucide-react'

const PRESETS = [
  {
    label: 'Narrador oscuro',
    text: '[dark narrator voice] They said she disappeared on a Tuesday. [building tension] No note. No struggle. No trace. [soft] Just an open window and a cold cup of coffee. [dismissive] Nobody talked about it much after that. [focused] Nobody wanted to. [whisper] But everybody knew.',
  },
  {
    label: 'Clásico',
    text: 'Beauty is no quality in things themselves: It exists merely in the mind which contemplates them.',
  },
]

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  const [text, setText] = useState(PRESETS[0].text)
  const [ipaText, setIpaText] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)

  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [audioUrl, setAudioUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Debounced live IPA transcription
  useEffect(() => {
    if (!text.trim()) {
      setIpaText('')
      setWordCount(0)
      setCharCount(0)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/ipa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (!res.ok) return
        const data = await res.json()
        setIpaText(data.ipa || '')
        setWordCount(data.word_count ?? 0)
        setCharCount(data.char_count ?? text.length)
      } catch {
        // Ignore transient network errors during typing
      }
    }, 280)

    return () => clearTimeout(timer)
  }, [text])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const handleGenerateAudio = async () => {
    if (!text.trim()) {
      setError('Escribe o pega algún texto en inglés primero.')
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'No se pudo generar el audio.')
      }

      const blob = await res.blob()
      const nextUrl = URL.createObjectURL(blob)
      if (audioUrl) URL.revokeObjectURL(audioUrl)

      setAudioUrl(nextUrl)
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
    } catch (err) {
      setError(err.message || 'Error inesperado al conectar con ElevenLabs.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyIpa = async () => {
    if (!ipaText) return
    await navigator.clipboard.writeText(ipaText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const togglePlay = () => {
    const el = audioRef.current
    if (!el) return
    if (isPlaying) {
      el.pause()
      setIsPlaying(false)
    } else {
      el.play()
      setIsPlaying(true)
    }
  }

  const handleScrub = (e) => {
    const val = Number(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
    }
    setCurrentTime(val)
  }

  return (
    <>
      <div className="ambient-canvas" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <main className="app-shell">
        <header className="top-bar">
          <div className="brand">
            <div className="brand-mark">
              <AudioLines size={20} strokeWidth={1.8} />
            </div>
            <div>
              <h1>AI Voice Studio</h1>
              <p>English → IPA · ElevenLabs</p>
            </div>
          </div>

          <div className="top-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label="Cambiar tema"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <section className="glass-card">
          <div className="card-header">
            <span className="section-label">Texto en inglés</span>
            <div className="preset-group">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="pill-btn"
                  onClick={() => setText(preset.text)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <textarea
            id="text-input"
            className="text-editor"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe texto en inglés o etiquetas expresivas como [whisper]..."
          />

          <div className="editor-footer">
            <div className="stats-row">
              <span>{wordCount} palabras</span>
              <span>·</span>
              <span>{charCount} caracteres</span>
            </div>

            <button
              type="button"
              id="generate-audio-btn"
              className="primary-btn"
              onClick={handleGenerateAudio}
              disabled={isGenerating || !text.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Sintetizando...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generar Audio
                </>
              )}
            </button>
          </div>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {ipaText && (
          <section className="glass-card">
            <div className="card-header">
              <span className="section-label">Transcripción Fonética (IPA)</span>
              <button type="button" className="pill-btn" onClick={handleCopyIpa}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado' : 'Copiar IPA'}
              </button>
            </div>
            <div className="ipa-box" aria-live="polite">
              {ipaText}
            </div>
          </section>
        )}

        {audioUrl && (
          <section className="glass-card">
            <div className="card-header">
              <span className="section-label">Audio Generado</span>
              <a
                href={audioUrl}
                download="output.mp3"
                className="pill-btn"
                style={{ textDecoration: 'none' }}
              >
                <Download size={14} />
                Descargar MP3
              </a>
            </div>

            <div className="player-bar">
              <button
                type="button"
                className="play-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
              </button>

              <div className="scrubber-wrap">
                <input
                  type="range"
                  className="scrubber"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={currentTime}
                  onChange={handleScrub}
                  aria-label="Progreso del audio"
                />
                <div className="time-row">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
              onEnded={() => setIsPlaying(false)}
            />
          </section>
        )}

        <footer className="app-footer">
          React · FastAPI · ElevenLabs · eng-to-ipa
        </footer>
      </main>
    </>
  )
}
