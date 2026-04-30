'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const [form, setForm] = useState({
    status: '',
    visa_type: '',
    max_stay: ''
  })

  // SESSION
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  const login = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErrorMsg(error.message)
    else location.reload()
  }

  const logout = async () => {
    await supabase.auth.signOut()
    location.reload()
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user, showNegative])

  const fetchData = async () => {
    setLoading(true)

    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (showNegative) query = query.eq('rating', 0)

    const { data } = await query

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
    setLoading(false)
  }

  const isFlagged = (item: Feedback) => {
    const key = `${item.passport}-${item.country}`
    return flagged[key] >= 3
  }

  const startEdit = (item: Feedback) => {
    setEditingId(item.id)
    setForm({
      status: item.result?.status || '',
      visa_type: item.result?.visa_type || '',
      max_stay: item.result?.max_stay || ''
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
  }

  function groupByDate(items: Feedback[]) {
    const groups: Record<string, Feedback[]> = {}

    items.forEach(item => {
      const date = new Date(item.created_at)

      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)

      let label = date.toLocaleDateString('cs-CZ')

      if (date.toDateString() === today.toDateString()) label = 'Dnes'
      else if (date.toDateString() === yesterday.toDateString()) label = 'Včera'

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
  ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)

  const negativeRate = total > 0 ? Math.round((negatives / total) * 100) : 0

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

  // LOGIN
  if (!user) {
    return (
      <div style={loginWrapper}>
        <div style={loginCard}>
          <h2 style={{ marginBottom: 20 }}>Admin</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={input} type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button style={primaryBtn} onClick={login}>Přihlásit</button>

          {errorMsg && <div style={error}>{errorMsg}</div>}
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ padding: 40 }}>Načítám...</div>

  return (
    <div style={page}>
      <div style={container}>

        {/* HEADER */}
        <div style={header}>
          <div>
            <h1>Dashboard</h1>
            <div style={muted}>Feedback & overrides</div>
          </div>
          <button onClick={logout} style={secondaryBtn}>Odhlásit</button>
        </div>

        {/* ANALYTICS */}
        <div style={card}>
          <div style={sectionTitle}>📊 Analytics</div>

          <div style={statsRow}>
            <Stat label="Celkem" value={total} />
            <Stat label="👍" value={positives} />
            <Stat label="👎" value={negatives} />
            <Stat label="Negativita" value={`${negativeRate}%`} danger={negativeRate > 30} />
          </div>

          {selectedCountry && (
            <div style={clearFilter} onClick={() => setSelectedCountry(null)}>
              ✖ Zrušit filtr ({selectedCountry})
            </div>
          )}

          <div style={{ marginTop: 10 }}>
            {topCountries.map(([country, count]: any) => (
              <div
                key={country}
                onClick={() => setSelectedCountry(country)}
                style={{
                  ...countryItem,
                  background: selectedCountry === country ? '#1f2937' : 'transparent'
                }}
              >
                {country} ({count})
              </div>
            ))}
          </div>

          <div style={daysRow}>
            {last7Days.map((d, i) => (
              <div key={i} style={dayBox}>
                <div style={dayLabel}>{d.label}</div>
                <div>{d.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div style={filters}>
          <button onClick={() => setShowNegative(!showNegative)} style={secondaryBtn}>
            👎 Negativní
          </button>
          <button onClick={() => setShowFlagged(!showFlagged)} style={secondaryBtn}>
            🚨 Flagged
          </button>
        </div>

        {/* LIST */}
        {Object.entries(
          groupByDate(
            data.filter(item =>
              (!showFlagged || isFlagged(item)) &&
              (!selectedCountry || item.country === selectedCountry)
            )
          )
        ).map(([group, items]) => (
          <div key={group}>
            <div style={groupLabel}>{group}</div>

            {items.map(item => (
              <div key={item.id} style={card}>

                <div style={rowBetween}>
                  <strong>{item.passport} → {item.country}</strong>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={item.rating === 1 ? badgeGreen : badgeRed}>
                      {item.rating === 1 ? '👍' : '👎'}
                    </span>

                    {isFlagged(item) && <span style={badgeWarn}>🚨</span>}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>{item.comment || '—'}</div>

                {editingId === item.id ? (
                  <div style={{ marginTop: 10 }}>
                    <select style={input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="">Status</option>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    <input
                      style={input}
                      placeholder="Max stay"
                      value={form.max_stay}
                      onChange={e => setForm({ ...form, max_stay: e.target.value })}
                    />

                    <button style={primaryBtn} onClick={() => saveOverride(item)}>Uložit</button>
                  </div>
                ) : (
                  <button style={secondaryBtn} onClick={() => startEdit(item)}>
                    Upravit override
                  </button>
                )}

              </div>
            ))}
          </div>
        ))}

      </div>
    </div>
  )
}

/* ---------- UI ---------- */

function Stat({ label, value, danger }: any) {
  return (
    <div style={{ minWidth: 80 }}>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ color: danger ? '#ef4444' : 'white' }}>{value}</div>
    </div>
  )
}

/* ---------- STYLY ---------- */

const page: CSSProperties = { minHeight: '100vh', background: '#0b0f14', color: 'white', padding: 40 }
const container: CSSProperties = { maxWidth: 900, margin: '0 auto' }
const header: CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: 20 }

const card: CSSProperties = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12
}

const sectionTitle: CSSProperties = { marginBottom: 10, fontWeight: 600 }
const statsRow: CSSProperties = { display: 'flex', gap: 20, flexWrap: 'wrap' }

const input: CSSProperties = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b0f14',
  color: 'white',
  marginTop: 6
}

const primaryBtn: CSSProperties = {
  marginTop: 10,
  width: '100%',
  padding: 10,
  background: '#2563eb',
  borderRadius: 8,
  border: 'none',
  color: 'white',
  cursor: 'pointer'
}

const secondaryBtn: CSSProperties = {
  padding: '6px 10px',
  background: '#1f2937',
  border: '1px solid #374151',
  borderRadius: 8,
  color: 'white',
  cursor: 'pointer'
}

const filters: CSSProperties = { marginBottom: 20, display: 'flex', gap: 10 }

const countryItem: CSSProperties = {
  padding: '4px 8px',
  borderRadius: 6,
  cursor: 'pointer'
}

const clearFilter: CSSProperties = {
  fontSize: 12,
  color: '#9ca3af',
  cursor: 'pointer'
}

const daysRow: CSSProperties = { display: 'flex', gap: 6, marginTop: 10 }
const dayBox: CSSProperties = { flex: 1, textAlign: 'center', background: '#1f2937', borderRadius: 6, padding: 6 }
const dayLabel: CSSProperties = { fontSize: 10, color: '#9ca3af' }

const groupLabel: CSSProperties = { color: '#9ca3af', margin: '10px 0 6px' }
const rowBetween: CSSProperties = { display: 'flex', justifyContent: 'space-between' }

const badgeGreen: CSSProperties = { background: '#16a34a', padding: '2px 6px', borderRadius: 6 }
const badgeRed: CSSProperties = { background: '#dc2626', padding: '2px 6px', borderRadius: 6 }
const badgeWarn: CSSProperties = { background: '#f59e0b', padding: '2px 6px', borderRadius: 6 }

const muted: CSSProperties = { color: '#9ca3af' }
const error: CSSProperties = { marginTop: 10, color: '#ef4444' }

const loginWrapper: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0b0f14'
}

const loginCard: CSSProperties = {
  width: 360,
  padding: 24,
  background: '#111827',
  borderRadius: 16,
  border: '1px solid #1f2937',
  display: 'flex',
  flexDirection: 'column'
}
