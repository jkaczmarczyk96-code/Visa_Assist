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
    const { error } = await supabase.auth.signInWithPassword({ email, password })
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

  // 📊 ANALYTICS
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

  // 🔐 LOGIN UI
  if (!user) {
    return (
      <div style={loginWrapper}>
        <div style={loginCard}>
          <h2 style={{ marginBottom: 20 }}>Admin</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={input} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Heslo" style={input} />
          </div>

          <button onClick={login} style={primaryBtn}>Přihlásit</button>

          {errorMsg && <p style={{ color: '#ef4444', marginTop: 10 }}>{errorMsg}</p>}
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
            <h1>Admin Dashboard</h1>
            <div style={{ color: '#9ca3af' }}>Feedback & úpravy</div>
          </div>

          <button onClick={logout} style={secondaryBtn}>Odhlásit</button>
        </div>

        {/* ANALYTICS */}
        <div style={card}>
          <div style={{ marginBottom: 12, fontWeight: 600 }}>📊 Analytics</div>

          <div style={statsRow}>
            <div>Celkem: {total}</div>
            <div>👍 {positives}</div>
            <div>👎 {negatives}</div>
            <div style={{ color: negativeRate > 30 ? '#ef4444' : '#9ca3af' }}>
              Negativita: {negativeRate}%
            </div>
          </div>

          {selectedCountry && (
            <div onClick={() => setSelectedCountry(null)} style={clearFilter}>
              ✖ Zrušit filtr ({selectedCountry})
            </div>
          )}

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

          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {last7Days.map((d, i) => (
              <div key={i} style={dayBox}>
                <div style={{ fontSize: 10 }}>{d.label}</div>
                <div>{d.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
          <button onClick={() => setShowNegative(!showNegative)} style={secondaryBtn}>👎 Negativní</button>
          <button onClick={() => setShowFlagged(!showFlagged)} style={secondaryBtn}>🚨 Flagged</button>
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
            <div style={{ color: '#9ca3af', margin: '10px 0 6px' }}>{group}</div>

            {items.map(item => (
              <div key={item.id} style={card}>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{item.passport} → {item.country}</strong>

                  {isFlagged(item) && <span style={badge}>🚨</span>}
                </div>

                <div style={{ marginTop: 8 }}>{item.comment || '—'}</div>

                {editingId === item.id ? (
                  <div style={{ marginTop: 10 }}>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>
                      <option value="">Status</option>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    <input
                      value={form.max_stay}
                      onChange={e => setForm({ ...form, max_stay: e.target.value })}
                      placeholder="Max stay"
                      style={input}
                    />

                    <button onClick={() => saveOverride(item)} style={primaryBtn}>Uložit</button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(item)} style={secondaryBtn}>
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

/* 🎨 STYLY */

const page = { minHeight: '100vh', background: '#0b0f14', color: 'white', padding: 40 }
const container = { maxWidth: 900, margin: '0 auto' }
const header = { display: 'flex', justifyContent: 'space-between', marginBottom: 20 }

const card = {
  background: '#111827',
  border: '1px solid #1f2937',
  borderRadius: 16,
  padding: 16,
  marginBottom: 10
}

const input = {
  width: '100%',
  padding: 10,
  borderRadius: 8,
  border: '1px solid #1f2937',
  background: '#0b0f14',
  color: 'white'
}

const primaryBtn = {
  width: '100%',
  padding: 10,
  marginTop: 10,
  background: '#2563eb',
  border: 'none',
  borderRadius: 8,
  color: 'white',
  cursor: 'pointer'
}

const secondaryBtn = {
  padding: '6px 10px',
  background: '#1f2937',
  border: '1px solid #374151',
  borderRadius: 8,
  color: 'white',
  cursor: 'pointer'
}

const statsRow = { display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }
const clearFilter = { fontSize: 12, color: '#9ca3af', cursor: 'pointer' }
const countryItem = { cursor: 'pointer', padding: '2px 6px', borderRadius: 6 }
const dayBox = { flex: 1, textAlign: 'center', background: '#1f2937', borderRadius: 6, padding: 6 }
const badge = { background: '#ef4444', padding: '2px 6px', borderRadius: 6 }

const loginWrapper = {
  minHeight: '100vh',
  background: '#0b0f14',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const loginCard = {
  width: 360,
  background: '#111827',
  padding: 24,
  borderRadius: 16,
  border: '1px solid #1f2937',
  display: 'flex',
  flexDirection: 'column'
}
