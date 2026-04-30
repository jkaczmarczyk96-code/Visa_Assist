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

  // AUTH
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
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
        <div style={loginCard}>
          <h2>Admin</h2>
          <input style={input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={input} type="password" placeholder="Heslo" value={password} onChange={e => setPassword(e.target.value)} />
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
          <h1>Dashboard</h1>
          <button onClick={logout} style={ghostBtn}>Odhlásit</button>
        </div>

        {/* ANALYTICS */}
        <div style={card}>
          <div style={stats}>
            <Stat label="Celkem" value={total} />
            <Stat label="👍" value={positives} />
            <Stat label="👎" value={negatives} />
            <Stat label="%" value={negativeRate} danger={negativeRate > 30} />
          </div>

          <div style={divider} />

          <div style={chips}>
            {topCountries.map(([c, n]: any) => (
              <div
                key={c}
                onClick={() => setSelectedCountry(c)}
                style={{
                  ...chip,
                  background: selectedCountry === c ? '#2563eb' : '#1e293b'
                }}
              >
                {c} ({n})
              </div>
            ))}
          </div>

          <div style={days}>
            {last7Days.map((d, i) => (
              <div key={i} style={dayBox}>
                <div style={{ fontSize: 10 }}>{d.label}</div>
                <div>{d.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTERS */}
        <div style={filters}>
          <button style={ghostBtn} onClick={() => setShowNegative(!showNegative)}>Negativní</button>
          <button style={ghostBtn} onClick={() => setShowFlagged(!showFlagged)}>Flagged</button>
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
                      <select style={input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                        <option value="">Status</option>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>

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

const page: CSSProperties = { padding: 40, background: '#0a0f1a', minHeight: '100vh', color: 'white' }
const container: CSSProperties = { maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }

const header: CSSProperties = { display: 'flex', justifyContent: 'space-between' }

const card: CSSProperties = { background: '#0f172a', borderRadius: 16, padding: 18, border: '1px solid #1e293b' }

const stats: CSSProperties = { display: 'flex', gap: 20 }

const chip: CSSProperties = { padding: '4px 10px', borderRadius: 999, cursor: 'pointer', fontSize: 12 }
const chips: CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' }

const days: CSSProperties = { display: 'flex', gap: 6, marginTop: 10 }
const dayBox: CSSProperties = { flex: 1, textAlign: 'center', padding: 6, background: '#020617', borderRadius: 6 }

const filters: CSSProperties = { display: 'flex', gap: 10 }

const row: CSSProperties = { display: 'flex', justifyContent: 'space-between' }

const actions: CSSProperties = { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }

const input: CSSProperties = { padding: 10, borderRadius: 8, border: '1px solid #1e293b', background: '#020617', color: 'white' }

const primaryBtn: CSSProperties = { padding: 10, borderRadius: 8, background: '#2563eb', border: 'none', color: 'white' }
const ghostBtn: CSSProperties = { padding: '6px 10px', borderRadius: 8, border: '1px solid #1e293b', background: 'transparent', color: '#9ca3af' }

const badgeGood: CSSProperties = { background: '#16a34a', padding: '2px 6px', borderRadius: 6 }
const badgeBad: CSSProperties = { background: '#dc2626', padding: '2px 6px', borderRadius: 6 }
const badgeWarn: CSSProperties = { background: '#f59e0b', padding: '2px 6px', borderRadius: 6 }

const divider: CSSProperties = { height: 1, background: '#1e293b', margin: '10px 0' }

const comment: CSSProperties = { color: '#9ca3af' }

const groupLabel: CSSProperties = { margin: '24px 0 8px', color: '#6b7280' }

const loginWrap: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }
const loginCard: CSSProperties = { width: 320, padding: 24, background: '#0f172a', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8 }

const error: CSSProperties = { color: '#ef4444' }

function Stat({ label, value, danger }: any) {
  return (
    <div>
      <div style={{ fontSize: 12 }}>{label}</div>
      <div style={{ color: danger ? '#ef4444' : 'white' }}>{value}</div>
    </div>
  )
}
