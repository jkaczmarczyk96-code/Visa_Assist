'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { toApiFormat } from '../../lib/countries'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Feedback = {
  id: string
  passport: string
  country: string
  rating: number
  comment: string | null
  created_at: string
  result: any
}

const STATUS_OPTIONS = [
  { value: 'visa_free', label: 'Bez víza' },
  { value: 'visa_on_arrival', label: 'Visa on arrival' },
  { value: 'evisa', label: 'eVisa' },
  { value: 'visa_required', label: 'Vízum nutné' }
]

export default function AdminPage() {

  const [user, setUser] = useState<any>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [data, setData] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [showNegative, setShowNegative] = useState(false)
  const [showFlagged, setShowFlagged] = useState(false)

  const [flagged, setFlagged] = useState<Record<string, number>>({})
  const [auditLog, setAuditLog] = useState<Record<string, any>>({})

  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const [form, setForm] = useState({
    status: '',
    visa_type: '',
    max_stay: ''
  })

  // 🔐 SESSION
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  // 🔐 LOGIN
  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) setErrorMsg(error.message)
    else location.reload()
  }

  // 🔐 LOGOUT
  const logout = async () => {
    await supabase.auth.signOut()
    location.reload()
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user, showNegative])

  useEffect(() => {
    if (data.length > 0) fetchAudit()
  }, [data])

  const fetchData = async () => {
    setLoading(true)

    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (showNegative) query = query.eq('rating', 0)

    const { data, error } = await query

    if (!error) {
      const fb = data as Feedback[]
      setData(fb)

      const counts: Record<string, number> = {}

      fb.forEach((item) => {
        if (item.rating === 0) {
          const key = `${item.passport}-${item.country}`
          counts[key] = (counts[key] || 0) + 1
        }
      })

      setFlagged(counts)
    }

    setLoading(false)
  }

  const fetchAudit = async () => {
    const { data: audits } = await supabase
      .from('visa_cache')
      .select('*')

    const map: Record<string, any> = {}

    audits?.forEach((a: any) => {
      const key = `${a.passport}-${a.country}`
      map[key] = a
    })

    setAuditLog(map)
  }

  const isFlagged = (item: Feedback) => {
    const key = `${item.passport}-${item.country}`
    return flagged[key] >= 3
  }

  const startEdit = (item: Feedback) => {
    setEditingId(item.id)

    const key = `${item.passport}-${toApiFormat(item.country)}`
    const audit = auditLog[key]

    const source = audit?.data || item.result

    setForm({
      status: source?.status || '',
      visa_type: source?.visa_type || '',
      max_stay: source?.max_stay || ''
    })
  }

  const saveOverride = async (item: Feedback) => {
    const overrideData = {
      ...form,
      source: 'admin',
      override: true,
      updated_at: new Date().toISOString()
    }

    await supabase.from('visa_cache').upsert({
      passport: item.passport,
      country: toApiFormat(item.country),
      data: overrideData,
      updated_at: new Date().toISOString()
    })

    setEditingId(null)
    await fetchAudit()
  }

  // 📊 ANALYTICS
  function groupByDate(items: Feedback[]) {
    const groups: Record<string, Feedback[]> = {}

    items.forEach(item => {
      const date = new Date(item.created_at)

      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)

      let label = date.toLocaleDateString('cs-CZ')

      if (date.toDateString() === today.toDateString()) {
        label = 'Dnes'
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Včera'
      }

      if (!groups[label]) groups[label] = []
      groups[label].push(item)
    })

    return groups
  }

  const total = data.length
  const negatives = data.filter(d => d.rating === 0).length
  const positives = total - negatives

  const topCountries = Object.entries(
    data.reduce((acc: any, item) => {
      acc[item.country] = (acc[item.country] || 0) + 1
      return acc
    }, {})
  )
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)

  const negativeRate = total > 0
    ? Math.round((negatives / total) * 100)
    : 0

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date()
    day.setDate(day.getDate() - i)

    const count = data.filter(item => {
      const d = new Date(item.created_at)
      return d.toDateString() === day.toDateString()
    }).length

    return {
      label: day.toLocaleDateString('cs-CZ', { weekday: 'short' }),
      count
    }
  }).reverse()

  // 🔐 LOGIN
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0e1117', color: 'white', padding: 40 }}>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <h2>Admin přihlášení</h2>

          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Heslo" />

          <button onClick={login}>Přihlásit</button>

          {errorMsg && <p style={{ color: '#f87171' }}>{errorMsg}</p>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', color: 'white', padding: 40 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1>Admin Dashboard</h1>
            <div style={{ color: '#9ca3af' }}>Feedback & úpravy</div>
          </div>

          <button onClick={logout}>Odhlásit</button>
        </div>

        {/* FILTERS */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
          <button onClick={() => setShowNegative(!showNegative)}>
            👎 Pouze negativní
          </button>

          <button onClick={() => setShowFlagged(!showFlagged)}>
            🚨 Flagované
          </button>
        </div>

        {/* LIST */}
        {Object.entries(
          groupByDate(
            data.filter(item => !showFlagged || isFlagged(item))
          )
        ).map(([group, items]) => (
          <div key={group}>

            <div style={{ color: '#9ca3af', margin: '10px 0 6px' }}>
              {group}
            </div>

            {items.map(item => {
              const key = `${item.passport}-${toApiFormat(item.country)}`
              const audit = auditLog[key]

              return (
                <div key={item.id} style={{
                  background: '#111827',
                  border: '1px solid #2a2f3a',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 10
                }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{item.passport} → {item.country}</strong>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {audit?.data?.override && (
                        <span style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 6,
                          background: '#f59e0b'
                        }}>
                          override
                        </span>
                      )}

                      <span style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: item.rating === 1 ? '#16a34a' : '#dc2626'
                      }}>
                        {item.rating === 1 ? '👍' : '👎'}
                      </span>
                    </div>
                  </div>

                  {audit?.updated_at && (
                    <div style={{ fontSize: 12, color: '#f59e0b' }}>
                      Override: {new Date(audit.updated_at).toLocaleString('cs-CZ')}
                    </div>
                  )}

                  <div style={{ marginTop: 8 }}>{item.comment || '—'}</div>

                  <button onClick={() => startEdit(item)}>Edit</button>

                </div>
              )
            })}

          </div>
        ))}

      </div>
    </div>
  )
}
