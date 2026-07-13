import { useEffect, useRef, useState } from 'react'

const inputClass = 'px-3 py-2.5 rounded-lg border-2 border-gray-300 text-base focus:border-poke-dark outline-none w-full'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', pseudo: '' })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const callbackRef = useRef(null)

  callbackRef.current = async function handleGoogleResponse({ credential }) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('http://localhost:3001/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur Google.')
      localStorage.setItem('token', data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [googleBlocked, setGoogleBlocked] = useState(false)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (res) => callbackRef.current(res) })
      setGoogleLoaded(true)
      return
    }
    // Timeout 8s : si le script Google n'a pas chargé, c'est qu'il est bloqué ou lent
    const timeout = setTimeout(() => setGoogleBlocked(true), 8000)
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      clearTimeout(timeout)
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (res) => callbackRef.current(res) })
      setGoogleLoaded(true)
    }
    script.onerror = () => { clearTimeout(timeout); setGoogleBlocked(true) }
    document.head.appendChild(script)
    return () => clearTimeout(timeout)
  }, [])

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur.')
      localStorage.setItem('token', data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="text-center text-3xl font-bold mb-2">
        {mode === 'login' ? '🔑 Connexion' : '📝 Inscription'}
      </h1>
      <p className="text-center text-gray-500 text-sm mb-6">
        {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
        {' '}
        <button
          className="text-poke-dark font-semibold underline cursor-pointer"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
        >
          {mode === 'login' ? "S'inscrire" : 'Se connecter'}
        </button>
      </p>

      <form onSubmit={handleSubmit} className="bg-white border-2 border-poke-dark rounded-2xl p-6 flex flex-col gap-4">
        {mode === 'register' && (
          <label className="flex flex-col gap-1.5 font-semibold text-sm">
            Pseudo (optionnel)
            <input className={inputClass} name="pseudo" value={form.pseudo} onChange={handleChange} placeholder="ex: Dresseur42" />
          </label>
        )}
        <label className="flex flex-col gap-1.5 font-semibold text-sm">
          Email
          <input className={inputClass} type="email" name="email" value={form.email} onChange={handleChange} required placeholder="votre@email.com" />
        </label>
        <label className="flex flex-col gap-1.5 font-semibold text-sm">
          Mot de passe
          <input className={inputClass} type="password" name="password" value={form.password} onChange={handleChange} required placeholder={mode === 'register' ? '6 caractères minimum' : ''} />
        </label>

        {error && <p className="text-red-700 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="py-3 rounded-full border-2 border-poke-dark bg-poke-yellow font-bold cursor-pointer disabled:opacity-60 hover:bg-yellow-300 transition-colors"
        >
          {loading ? '...' : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
        </button>

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            {googleBlocked ? (
              <p className="text-xs text-center text-amber-600 font-medium">
                Google indisponible pour l'instant — utilise ton email et mot de passe.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => googleLoaded && window.google.accounts.id.prompt()}
                disabled={loading || !googleLoaded}
                className="flex items-center justify-center gap-3 w-full py-2.5 px-4 rounded-full border-2 border-gray-300 bg-white font-semibold text-sm hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoaded ? (
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                ) : (
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                )}
                {googleLoaded ? 'Se connecter avec Google' : 'Chargement Google...'}
              </button>
            )}
          </>
        )}
      </form>
    </div>
  )
}
