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
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const [flagged, setFlagged] = useState<Record<string, number>>({})
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    status: '',
    visa_type: '',
    max_stay: ''
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const login = async () => {
  const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMsg(error.message)
    } else {
      // důležité: krátké zpoždění
      setTimeout(() => {
        location.reload()
      }, 500)
    }
  }

  useEffect(() => {
    if (user) fetchData()
  }, [user, showNegative])

  const fetchData = async () => {
    setLoading(true)

    let query = supabase.from('feedback').select('*').order('created_at', { ascending: false })
    if (showNegative) query = query.eq('rating', 0)

    const { data } = await query
    const fb = data as Feedback[]
    setData(fb)

    const counts: Record<string, number> = {}
    fb.forEach(item => {
      if (item.rating === 0) {
        const key = `${item.passport}-${item.country}`
        counts[key] = (counts[key] || 0) + 1
      }
    })

    setFlagged(counts)
    setLoading(false)
  }

  const isFlagged = (item: Feedback) =>
    flagged[`${item.passport}-${item.country}`] >= 3

  const startEdit = (item: Feedback) => {
    setEditingId(item.id)
    setForm({
      status: item.result?.status || '',
      visa_type: item.result?.visa_type || '',
      max_stay: item.result?.max_stay || ''
    })
  }

  const saveOverride = async (item: Feedback) => {
    await supabase.from('visa_cache').upsert({
      passport: item.passport,
      country: toApiFormat(item.country),
      data: {
        ...form,
        source: 'admin',
        override: true,
        updated_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })

    setEditingId(null)
  }

  function groupByDate(items: Feedback[]) {
    const groups: Record<string, Feedback[]> = {}

    items.forEach(item => {
      const d = new Date(item.created_at)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)

      let label = d.toLocaleDateString('cs-CZ')
      if (d.toDateString() === today.toDateString()) label = 'Dnes'
      else if (d.toDateString() === yesterday.toDateString()) label = 'Včera'

      if (!groups[label]) groups[label] = []
      groups[label].push(item)
    })

    return groups
  }

  // analytics
  const total = data.length
  const negatives = data.filter(d => d.rating === 0).length
  const positives = total - negatives
  const negativeRate = total ? Math.round((negatives / total) * 100) : 0

  const topCountries = Object.entries(
    data.reduce((acc: any, item) => {
      acc[item.country] = (acc[item.country] || 0) + 1
      return acc
    }, {})
  ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5)

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return {
      label: d.toLocaleDateString('cs-CZ', { weekday: 'short' }),
      count: data.filter(x => new Date(x.created_at).toDateString() === d.toDateString()).length
    }
  }).reverse()

  // LOGIN
  if (!user) {
    return (
      <div style={loginWrap}>
        <form
            style={loginCard}
            onSubmit={(e) => {
              e.preventDefault()
              login()
            }}
          >
          <h2>Admin login</h2>

          <label style={label}>Email</label>
          <input
            style={input}
            value={email}
            onChange={e => setEmail(e.target.value)}
            id="email"
            name="email"
            autoComplete="email"
          />

          <label style={label}>Heslo</label>
          <input
            id="password"
            type="password"
            style={input}
            value={password}
            onChange={e => setPassword(e.target.value)}
            name="password"
            autoComplete="current-password"
          />

          <button style={primaryBtn} type="submit">Přihlásit</button>

          {errorMsg && <div style={error}>{errorMsg}</div>}
        </form>
      </div>
    )
  }

  if (loading) return <div style={{ padding: 40 }}>Načítám...</div>

  return (
    <div style={page}>
      <div style={container}>

        {/* HEADER */}
       <div style={header}>
          <h1>Admin Dashboard</h1>
        
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => (window.location.href = '/')}
              style={ghostBtn}
            >
              Domů
            </button>
        
            <button onClick={logout} style={ghostBtn}>
              Odhlásit
            </button>
          </div>
        </div>

        {/* ANALYTICS */}
        <div style={analyticsCard}>
          <div style={analyticsGrid}>
            <Stat label="Celkem" value={total} />
            <Stat label="Pozitivní" value={positives} />
            <Stat label="Negativní" value={negatives} />
            <Stat label="Negativita" value={`${negativeRate}%`} danger={negativeRate > 30} />
          </div>

          <div style={divider} />

          {selectedCountry && (
            <div style={clearFilter} onClick={() => setSelectedCountry(null)}>
              ✖ Zrušit filtr ({selectedCountry})
            </div>
          )}

          <div style={chips}>
            {topCountries.map(([c, n]: any) => (
              <div
                key={c}
                onClick={() => setSelectedCountry(c)}
                style={{
                  ...chip,
                  background: selectedCountry === c ? '#3b82f6' : '#1e293b'
                }}
              >
                {c} ({n})
              </div>
            ))}
          </div>

          <div style={days}>
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
          <button style={ghostBtn} onClick={() => setShowNegative(!showNegative)}>👎 Negativní</button>
          <button style={ghostBtn} onClick={() => setShowFlagged(!showFlagged)}>🚨 Flagged</button>
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

                <div style={row}>
                  <strong>{item.passport} → {item.country}</strong>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={item.rating ? badgeGood : badgeBad}>
                      {item.rating ? '👍' : '👎'}
                    </span>
                    {isFlagged(item) && <span style={badgeWarn}>🚨</span>}
                  </div>
                </div>

                <div style={divider} />

                <div style={comment}>{item.comment || '—'}</div>

                <div style={actions}>
                  {editingId === item.id ? (
                    <>
                      <label style={label}>Status</label>
                      <select style={input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                        <option value="">Vyber</option>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>

                      <label style={label}>Max stay</label>
                      <input style={input} value={form.max_stay} onChange={e => setForm({ ...form, max_stay: e.target.value })} />

                      <button style={primaryBtn} onClick={() => saveOverride(item)}>Uložit</button>
                    </>
                  ) : (
                    <button style={ghostBtn} onClick={() => startEdit(item)}>Upravit</button>
                  )}
                </div>

              </div>
            ))}
          </div>
        ))}

      </div>
    </div>
  )
}

/* STYLES */

const page: CSSProperties = {
  padding: 40,
  background: '#020617',
  minHeight: '100vh',
  color: 'white'
}

const container: CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 28
}

const header: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const analyticsCard: CSSProperties = {
  background: '#0f172a',
  borderRadius: 18,
  padding: 20,
  border: '1px solid #334155'
}

const analyticsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4,1fr)',
  gap: 20
}

const card: CSSProperties = {
  background: '#0f172a',
  borderRadius: 16,
  padding: 18,
  border: '1px solid #334155'
}

const row: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const comment: CSSProperties = {
  color: '#cbd5f5',
  marginTop: 8,
  lineHeight: 1.5
}

const actions: CSSProperties = {
  marginTop: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 6
}

const input: CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: '1px solid #475569',
  background: '#020617',
  color: 'white'
}

const label: CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  marginTop: 6
}

const primaryBtn: CSSProperties = {
  marginTop: 10,
  padding: 10,
  borderRadius: 8,
  background: '#3b82f6',
  border: 'none',
  color: 'white',
  cursor: 'pointer'
}

const ghostBtn: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #475569',
  background: 'transparent',
  color: '#cbd5f5',
  cursor: 'pointer'
}

const badgeGood: CSSProperties = { background: '#22c55e', padding: '2px 6px', borderRadius: 6 }
const badgeBad: CSSProperties = { background: '#ef4444', padding: '2px 6px', borderRadius: 6 }
const badgeWarn: CSSProperties = { background: '#f59e0b', padding: '2px 6px', borderRadius: 6 }

const divider: CSSProperties = {
  height: 1,
  background: '#334155',
  margin: '10px 0'
}

const chips: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 10
}

const chip: CSSProperties = {
  padding: '4px 10px',
  borderRadius: 999,
  cursor: 'pointer'
}

const days: CSSProperties = {
  display: 'flex',
  gap: 6,
  marginTop: 12
}

const dayBox: CSSProperties = {
  flex: 1,
  textAlign: 'center',
  padding: 6,
  background: '#020617',
  borderRadius: 6
}

const dayLabel: CSSProperties = {
  fontSize: 10,
  color: '#94a3b8'
}

const filters: CSSProperties = {
  display: 'flex',
  gap: 10
}

const groupLabel: CSSProperties = {
  margin: '24px 0 8px',
  color: '#94a3b8'
}

const clearFilter: CSSProperties = {
  fontSize: 12,
  cursor: 'pointer',
  marginBottom: 6,
  color: '#cbd5f5'
}

const loginWrap: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh'
}

const loginCard: CSSProperties = {
  width: 320,
  padding: 24,
  background: '#0f172a',
  borderRadius: 16,
  border: '1px solid #334155',
  display: 'flex',
  flexDirection: 'column',
  gap: 8
}

const error: CSSProperties = { color: '#ef4444' }

function Stat({ label, value, danger }: any) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 18, color: danger ? '#ef4444' : 'white' }}>{value}</div>
    </div>
  )
}
