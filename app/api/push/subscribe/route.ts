import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function clientMetToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

// Push is bewust beperkt tot één account (twa.md, open vraag #6): alleen het
// e-mailadres in de server-only env-var PUSH_TOEGESTAAN_EMAIL mag subscriben
// en testpushes sturen. RLS scopet daarnaast alles per user.
function pushNietToegestaan(email: string | undefined): NextResponse | null {
  const toegestaan = process.env.PUSH_TOEGESTAAN_EMAIL
  if (!toegestaan) {
    return NextResponse.json(
      { error: 'Push is niet geconfigureerd (PUSH_TOEGESTAAN_EMAIL ontbreekt)' },
      { status: 503 }
    )
  }
  if (!email || email.toLowerCase() !== toegestaan.toLowerCase()) {
    return NextResponse.json(
      { error: 'Pushmeldingen zijn niet beschikbaar voor dit account' },
      { status: 403 }
    )
  }
  return null
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = clientMetToken(token)
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Ongeldig token' }, { status: 401 })

  const geweigerd = pushNietToegestaan(user.email)
  if (geweigerd) return geweigerd

  const { subscription } = await req.json()
  const { endpoint, keys: { p256dh, auth } } = subscription

  const { error } = await supabase
    .from('notes_push_subscriptions')
    .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: 'user_id,endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Opt-out per apparaat: verwijdert de subscription-rij van de ingelogde
// gebruiker voor het meegegeven endpoint (RLS beperkt tot eigen rijen).
export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const supabase = clientMetToken(token)
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Ongeldig token' }, { status: 401 })

  const { endpoint } = await req.json().catch(() => ({ endpoint: null }))
  if (typeof endpoint !== 'string' || !endpoint) {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }

  const { error } = await supabase
    .from('notes_push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
