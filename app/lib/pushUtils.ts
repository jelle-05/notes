export function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer
}

// Vergelijkt de applicationServerKey van een bestaande subscription met de
// huidige VAPID-sleutel; bij een wissel is de oude subscription onbruikbaar.
function zelfdeSleutel(a: ArrayBuffer | null | undefined, b: ArrayBuffer): boolean {
  if (!a || a.byteLength !== b.byteLength) return false
  const va = new Uint8Array(a)
  const vb = new Uint8Array(b)
  return va.every((byte, i) => byte === vb[i])
}

export async function subscribeerOpPush(accessToken: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const reg = await navigator.serviceWorker.ready
    const vapidKey = urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
    let sub = await reg.pushManager.getSubscription()

    // VAPID-sleutel gewijzigd? De oude subscription werkt dan niet meer
    // (server krijgt 403/410) → opzeggen en hieronder opnieuw aanmaken.
    if (sub && !zelfdeSleutel(sub.options.applicationServerKey, vapidKey)) {
      await sub.unsubscribe()
      sub = null
    }

    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey })
      } catch {
        // Een achtergebleven/kapotte registratie kan subscribe blokkeren:
        // eenmalig opruimen en opnieuw proberen.
        const oude = await reg.pushManager.getSubscription()
        if (oude) await oude.unsubscribe()
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey })
      }
    }

    const resp = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })

    return resp.ok
  } catch (err) {
    console.error('Push abonnement mislukt:', err)
    return false
  }
}

// Meldt dit apparaat af voor push: browser-subscription opzeggen én de
// bijbehorende rij server-side verwijderen (opt-out per apparaat).
export async function afmeldenVanPush(accessToken: string): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = reg ? await reg.pushManager.getSubscription() : null
    if (!sub) return true   // niets om af te melden

    const endpoint = sub.endpoint
    await sub.unsubscribe()
    const resp = await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ endpoint }),
    })
    return resp.ok
  } catch (err) {
    console.error('Push afmelden mislukt:', err)
    return false
  }
}
