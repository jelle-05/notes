'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  onIngelogd: () => void
}

export default function LoginPagina({ onIngelogd }: Props) {
  const [modus, setModus]           = useState<'login' | 'registreer'>('login')
  const [email, setEmail]           = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [laden, setLaden]           = useState(false)
  const [fout, setFout]             = useState('')
  const [bevestigd, setBevestigd]   = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !wachtwoord) return
    setLaden(true)
    setFout('')

    try {
      if (modus === 'registreer') {
        const { error } = await supabase.auth.signUp({ email, password: wachtwoord })
        if (error) throw error
        setBevestigd(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })
        if (error) throw error
        onIngelogd()
      }
    } catch (err) {
      const boodschap = err instanceof Error ? err.message : 'Er ging iets mis'
      if (boodschap.includes('Invalid login credentials')) {
        setFout('Onjuist e-mailadres of wachtwoord')
      } else if (boodschap.includes('Email not confirmed')) {
        setFout('Bevestig eerst je e-mailadres via de link die je hebt ontvangen')
      } else {
        setFout(boodschap)
      }
    } finally {
      setLaden(false)
    }
  }

  if (bevestigd) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Controleer je e-mail</h2>
          <p className="text-[15px] text-gray-500 leading-relaxed">
            We hebben een bevestigingslink gestuurd naar{' '}
            <strong className="text-gray-800">{email}</strong>.
            Klik op de link om je account te activeren.
          </p>
          <button
            onClick={() => { setBevestigd(false); setModus('login') }}
            className="mt-6 text-[#007AFF] text-sm font-medium"
          >
            Terug naar inloggen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📝</div>
          <h1 className="text-2xl font-bold text-gray-900">Notities</h1>
          <p className="text-[15px] text-gray-400 mt-1">
            {modus === 'login' ? 'Log in om verder te gaan' : 'Maak een nieuw account aan'}
          </p>
        </div>

        {/* Formulier */}
        <form onSubmit={submit} className="space-y-3">
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200 divide-y divide-gray-100 shadow-sm">
            <div className="px-4 py-3.5">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="E-mailadres"
                required
                autoComplete="email"
                className="w-full text-[15px] outline-none placeholder:text-gray-400 bg-transparent"
              />
            </div>
            <div className="px-4 py-3.5">
              <input
                type="password"
                value={wachtwoord}
                onChange={e => setWachtwoord(e.target.value)}
                placeholder="Wachtwoord"
                required
                minLength={6}
                autoComplete={modus === 'login' ? 'current-password' : 'new-password'}
                className="w-full text-[15px] outline-none placeholder:text-gray-400 bg-transparent"
              />
            </div>
          </div>

          {fout && (
            <p className="text-red-500 text-sm text-center px-2">{fout}</p>
          )}

          <button
            type="submit"
            disabled={laden || !email || !wachtwoord}
            className="w-full bg-[#007AFF] text-white rounded-xl py-3.5 text-[15px] font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            {laden ? 'Bezig…' : modus === 'login' ? 'Inloggen' : 'Account aanmaken'}
          </button>
        </form>

        {/* Toggle login ↔ registreer */}
        <p className="text-center text-[14px] text-gray-400 mt-6">
          {modus === 'login' ? (
            <>
              Nog geen account?{' '}
              <button onClick={() => { setModus('registreer'); setFout('') }} className="text-[#007AFF] font-medium">
                Registreer
              </button>
            </>
          ) : (
            <>
              Al een account?{' '}
              <button onClick={() => { setModus('login'); setFout('') }} className="text-[#007AFF] font-medium">
                Inloggen
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
