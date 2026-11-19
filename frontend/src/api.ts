export interface Mandate {
  id: string
  instruction: string
  max_amount: number
  cumulative_limit: number
  merchants: string[]
  categories: string[]
  product_id: string | null
  requirements: string[]
  allow_substitutions: boolean
  missing_evidence?: "review" | "reject"
  expires_at: string
  consent: 'automatic' | 'review'
  spent?: number
  reserved?: number
}

export interface Product {
  id: string
  title: string
  merchant: string
  category: string
  amount: number
  requirements: string[]
  description: string
}

export interface Payment {
  id: string
  created_at?: string
  proposal: { mandate_id: string; product_id: string; amount: number; merchant: string; category?: string; nonce: string }
  source: string
  rationale: string
  decision: 'ALLOW' | 'ESCALATE' | 'REJECT'
  reasons: string[]
  checks: Record<string, boolean>
  status: 'SETTLED' | 'PENDING' | 'REJECTED'
  settlement: { reference: string } | null
  review: { approved: boolean; note: string; failed_checks: string[] } | null
  compatibility?: {
    status: 'verified_compatible' | 'verified_incompatible' | 'insufficient_evidence' | 'merchant_claim_only'
    required: string[]; confirmed: string[]; contradictions: string[]; missing: string[]; merchant_only: string[]
    evidence_reference: string | null
  } | null
  semantic?: { alpha?: number; prediction_set: string[]; p_values: Record<string, number> } | null
}

export interface Evidence {
  valid: boolean
  head: string
  count: number
  checkpoint_found: boolean | null
  events: EvidenceEvent[]
}

export interface EvidenceEvent {
  position: number; at: string; action: string; entity: string
  previous: string; digest: string; detail: unknown
}

export async function api<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await fetch('/api' + path, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (data === null) throw new Error('The sandbox returned an unreadable response. Try again shortly.')
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : (Array.isArray(data.detail) ? data.detail : []).map(
      (item: { loc: string[]; msg: string }) => item.loc.slice(1).join('.') + ' ' + item.msg,
    ).join(', ')
    throw new Error(detail || 'Request failed')
  }
  return data
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function signingKey() {
  if (!globalThis.crypto?.subtle) throw new Error('Browser signing needs HTTPS or localhost.')
  const request = indexedDB.open('pramiti', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('keys')
  const database = await requestResult(request)
  try {
    const stored = await requestResult(database.transaction('keys').objectStore('keys').get('demo')) as CryptoKeyPair | undefined
    if (stored) return stored
    const pair = await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify'])
    const transaction = database.transaction('keys', 'readwrite')
    const store = transaction.objectStore('keys')
    // A second tab may have created the key while Web Crypto was generating this pair.
    const existing = await requestResult(store.get('demo')) as CryptoKeyPair | undefined
    if (existing) return existing
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error)
      store.add(pair, 'demo')
    })
    return pair
  } finally {
    database.close()
  }
}

export async function sign(mandate: Mandate) {
  const pair = await signingKey()
  const payload = JSON.stringify(mandate)
  const encoded = new TextEncoder().encode(payload)
  const signature = await crypto.subtle.sign('Ed25519', pair.privateKey, encoded)
  const publicKey = await crypto.subtle.exportKey('raw', pair.publicKey)
  const base64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  return { payload, public_key: base64(publicKey), signature: base64(signature) }
}

export const money = (paise: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(paise / 100)

export const label = (value: string) => value.replaceAll('_', ' ')
