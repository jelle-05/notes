import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const runtime = 'nodejs'

// Lazy VAPID-config (in plaats van module-level): ontbrekende env-vars geven
// dan een nette 503 in plaats van een gecrashte build/route — fail-open,
// consistent met de rest van de app.
let vapidGeconfigureerd = false
function configureerVapid(): boolean {
  if (vapidGeconfigureerd) return true
  const publiek = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privaat = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT
  if (!publiek || !privaat || !subject) return false
  webpush.setVapidDetails(`mailto:${subject}`, publiek, privaat)
  vapidGeconfigureerd = true
  return true
}

function clientMetToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

// Push is bewust beperkt tot één account (twa.md, open vraag #6) — zie
// app/api/push/subscribe/route.ts voor toelichting.
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

  if (!configureerVapid()) {
    return NextResponse.json(
      { error: 'Push is niet geconfigureerd (VAPID-env-vars ontbreken)' },
      { status: 503 }
    )
  }

  const supabase = clientMetToken(token)
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Ongeldig token' }, { status: 401 })

  const geweigerd = pushNietToegestaan(user.email)
  if (geweigerd) return geweigerd

  const { data: subs } = await supabase
    .from('notes_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', user.id)

  if (!subs?.length) {
    return NextResponse.json({ error: 'Geen abonnementen gevonden. Zet meldingen aan in de app.' }, { status: 404 })
  }

  const payload = JSON.stringify({
    titel:   'Testmelding',
    bericht: 'Pushmeldingen werken op dit apparaat',
    id:      `test-${Date.now()}`,
  })

  let verstuurd = 0
  let opgeruimd = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      verstuurd++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        // Permanent verlopen abonnement → opruimen (user-scoped, RLS).
        // Bewust geen endpoint in de log.
        await supabase.from('notes_push_subscriptions').delete()
          .eq('user_id', user.id).eq('endpoint', sub.endpoint)
        opgeruimd++
        console.log('[push-test] dode push-subscription opgeruimd', { status })
      } else {
        // Transient (netwerk/5xx): subscription behouden.
        console.error('[push-test] push mislukt', { status })
      }
    }
  }

  return NextResponse.json({ verstuurd, opgeruimd })
}
