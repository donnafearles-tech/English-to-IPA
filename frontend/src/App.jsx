import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  AudioLines,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Moon,
  Pause,
  Play,
  SlidersHorizontal,
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

const MODEL_OPTIONS = [
  { value: 'eleven_v4', label: 'eleven_v4' },
  { value: 'eleven_multilingual_v2', label: 'eleven_multilingual_v2' },
  { value: 'eleven_turbo_v2_5', label: 'eleven_turbo_v2_5' },
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

  const [voiceId, setVoiceId] = useState('P7fAh4p4xVfEzGgihOit')
  const [modelId, setModelId] = useState('eleven_v4')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [hasEnvKey, setHasEnvKey] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

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

  useEffect(() => {
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setHasEnvKey(Boolean(data.has_env_api_key))
          if (data.default_voice_id) setVoiceId(data.default_voice_id)
          if (data.default_model_id) setModelId(data.default_model_id)
        }
      })
      .catch(() => {})
  }, [])

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
    if (!hasEnvKey && !apiKey.trim()) {
      setShowSettings(true)
      setError('Ingresa tu ElevenLabs API Key en Ajustes o configúrala en .env.')
      return
    }

    setError('')
    setIsGenerating(true)

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: voiceId.trim() || 'P7fAh4p4xVfEzGgihOit',
          model_id: modelId.trim() || 'eleven_v4',
          api_key: apiKey.trim() || null,
        }),
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

  const keyReady = hasEnvKey || Boolean(apiKey.trim())

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
              className={`icon-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings((prev) => !prev)}
              aria-label="Configuración de ElevenLabs"
              title="Configuración"
            >
              <SlidersHorizontal size={18} />
            </button>
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

        {showSettings && (
          <section className="glass-card" aria-label="Ajustes de voz y API">
            <div className="card-header">
              <span className="section-label">Configuración de ElevenLabs</span>
            </div>
            <div className="settings-grid">
              <div className="field">
                <label htmlFor="api-key-input">
                  API Key {hasEnvKey ? '(detectada en .env)' : '(requerida)'}
                </label>
                <div className="input-wrap">
                  <input
                    id="api-key-input"
                    className="glass-input"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasEnvKey ? 'Usando ELEVENLABS_API_KEY de .env' : 'xi-...'}
                    style={{ paddingRight: '2.2rem' }}
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? 'Ocultar API key' : 'Mostrar API key'}
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="voice-id-input">Voice ID</label>
                <input
                  id="voice-id-input"
                  className="glass-input"
                  type="text"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="P7fAh4p4xVfEzGgihOit"
                />
              </div>

              <div className="field">
                <label htmlFor="model-id-select">Model ID</label>
                <select
                  id="model-id-select"
                  className="glass-input"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

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
              <span>·</span>
              <span className={`status-dot ${keyReady ? '' : 'warn'}`}>
                {keyReady ? 'ElevenLabs listo' : 'Falta API Key'}
              </span>
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
              <span className="section-label">Audio Generado · {modelId}</span>
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
