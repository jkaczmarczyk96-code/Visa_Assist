'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { createClient } from '@supabase/supabase-js'
import { toApiFormat, getCountryByIso } from '../../lib/countries'

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

function Stat({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: 18, color: danger ? '#ef4444' : 'white' }}>{value}</div>
    </div>
  )
}

export default function AdminPage() {

  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const PAGE_SIZE = 20
  const [feedbackPage, setFeedbackPage] = useState(0)
  const [dbPage, setDbPage] = useState(0)

  const [feedbackCount, setFeedbackCount] = useState(0)
  const feedbackTotalPages = Math.max(1, Math.ceil(feedbackCount / PAGE_SIZE))

  const [tab, setTab] = useState<'feedback' | 'db'>('feedback')
  const [records, setRecords] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const [tbEnabled, setTbEnabled] = useState(false)

  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [data, setData] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)

  const [showNegative, setShowNegative] = useState(false)
  const [showFlagged, setShowFlagged] = useState(false)

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [passportFilter, setPassportFilter] = useState<"ALL" | "CZ" | "SK">("ALL")
  const [onlyIssues, setOnlyIssues] = useState(false)

  const [flagged, setFlagged] = useState<Record<string, number>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [countryFilter, setCountryFilter] = useState<string>("ALL")

  const isOverrideActive = (item: Feedback) => {
  const key = `${item.passport}-${toApiFormat(item.country)}`;
  return !!overrides[key];
  };

  const [form, setForm] = useState({
    status: '',
    visa_type: '',
    max_stay: ''
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const login = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    setErrorMsg(error.message)
    return
  }

  // 👇 KLÍČOVÉ: reálná navigace
  window.location.href = '/admin'
}

  const logout = async () => {
  await supabase.auth.signOut()
  location.reload()
}

  useEffect(() => {
    if (user) fetchData()
  }, [user, showNegative, feedbackPage, dbPage, passportFilter, onlyIssues, countryFilter])

  useEffect(() => {
    setFeedbackPage(0)
  }, [countryFilter, passportFilter, onlyIssues])

  const fetchData = async () => {
    setLoading(true)

    let query = supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (showNegative) {
      query = query.eq('rating', 0)
    }

    if (passportFilter !== "ALL") {
      query = query.eq('passport', passportFilter)
    }

    if (countryFilter !== "ALL") {
      query = query.eq('country', countryFilter)
    }

    const { data, error, count: feedbackCountValue  } = await query
      .range(
        feedbackPage * PAGE_SIZE,
        feedbackPage * PAGE_SIZE + PAGE_SIZE - 1
      )

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    const fb = (data || []) as Feedback[]
    setData(fb)
    setFeedbackCount(feedbackCountValue || 0)

    const counts: Record<string, number> = {}

    fb.forEach(item => {
      if (item.rating === 0) {
        const key = `${item.passport}-${item.country}`
        counts[key] = (counts[key] || 0) + 1
      }
    })

      setFlagged(counts)

    const { data: cacheData } = await supabase
      .from("visa_cache")
      .select("passport, country, data");
    
      const map: Record<string, boolean> = {};
      
      (cacheData || []).forEach((row: any) => {
        if (row.data?.override === true) {
          const key = `${row.passport}-${row.country}`;
          map[key] = true;
        }
      });
      
      setOverrides(map);

    // DB records
    let dbQuery = supabase
      .from('visa_records')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })

      if (passportFilter !== "ALL") {
        dbQuery = dbQuery.eq('passport', passportFilter)
      }
      if (onlyIssues) {
        dbQuery = dbQuery.eq('needs_review', true)
      }

      const { data: dbData, count: dbCount } = await dbQuery
        .range(
          dbPage * PAGE_SIZE,
          dbPage * PAGE_SIZE + PAGE_SIZE - 1
        )

      setRecords(dbData || [])
      setTotalCount(dbCount || 0)

    // TB toggle
    const { data: cfg } = await supabase
      .from('app_config')
      .select('*')
      .eq('key', 'tb_refresh_enabled')
      .single()

    setTbEnabled(cfg?.value === 'true')
      
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

    setSavedMsg("Uloženo ✔");

    setTimeout(() => {
      setSavedMsg(null);
    }, 2000);
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
    data.reduce((acc: Record<string, number>, item) => {
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
          method="post"
          onSubmit={login}
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

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button style={ghostBtn} onClick={() => setTab('feedback')}>
              Feedback
            </button>
            <button style={ghostBtn} onClick={() => setTab('db')}>
              DB
            </button>
          </div>
        
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => (window.location.href = '/')}
              style={ghostBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e293b'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.border = '1px solid #3b82f6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#cbd5f5'
                e.currentTarget.style.border = '1px solid #475569'
              }}
            >
              Domů
            </button>
        
            <button
              onClick={logout}
              style={ghostBtn}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e293b'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.border = '1px solid #3b82f6'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#cbd5f5'
                e.currentTarget.style.border = '1px solid #475569'
              }}
            >
              Odhlásit
            </button>
          </div>
                     {savedMsg && (
              <div style={{
                background: "#16a34a",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 14
              }}>
                {savedMsg}
              </div>
            )}
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
          <select
            style={input}
            value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)}
          >
            <option value="ALL">Všechny státy</option>

            {[...new Set(data.map(d => d.country))]
              .sort()
              .map(c => (
                <option key={c} value={c}>
                  {getCountryByIso(c)?.name || c}
                </option>
              ))}
          </select>

          <button
            style={ghostBtn}
            onClick={() => setOnlyIssues(!onlyIssues)}
          >
            ⚠️ Issues only
          </button>
          
          <select
            style={input}
            value={passportFilter}
            onChange={e => setPassportFilter(e.target.value as any)}
          >
            <option value="ALL">Vše</option>
            <option value="CZ">CZ</option>
            <option value="SK">SK</option>
          </select>

          <button
            style={ghostBtn}
            onClick={() => setShowNegative(!showNegative)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.border = '1px solid #3b82f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#cbd5f5'
              e.currentTarget.style.border = '1px solid #475569'
            }}
          >
            👎 Negativní
          </button>
          
          <button
            style={ghostBtn}
            onClick={() => setShowFlagged(!showFlagged)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1e293b'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.border = '1px solid #3b82f6'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#cbd5f5'
              e.currentTarget.style.border = '1px solid #475569'
            }}
          >
            🚨 Flagged
          </button>
        </div>

        
            {/* LIST */}
              {tab === 'feedback' && (
                <>
                 {Object.entries(
                     groupByDate(
                        
                          data.filter(item => {
                            const matchesFlagged = !showFlagged || isFlagged(item)
                            const matchesIssues = !onlyIssues || isFlagged(item)

                            return (
                              matchesFlagged &&
                              matchesIssues
                            )
                          })
                        )
                    
                  ).map(([group, items]) => {
                    return (
                      <div key={group}>
                        <div style={groupLabel}>{group}</div>

                        {items.map((item: Feedback) => (
                          <div key={item.id} style={card}>

                            <div style={row}>
                              <strong>{item.passport} → {item.country}</strong>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {isOverrideActive(item) && (
                                  <span style={{
                                    background: "#32cd32",
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 600
                                  }}>
                                    OR Active
                                  </span>
                                )}
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
                                  <select
                                    style={input}
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                  >
                                    <option value="">Vyber</option>
                                    {STATUS_OPTIONS.map(s => (
                                      <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                  </select>

                                  <label style={label}>Max stay</label>
                                  <input
                                    style={input}
                                    value={form.max_stay}
                                    onChange={e => setForm({ ...form, max_stay: e.target.value })}
                                  />

                                  <button style={primaryBtn} onClick={() => saveOverride(item)}>
                                    Uložit
                                  </button>
                                </>
                              ) : (
                                <button
                                  style={ghostBtn}
                                  onClick={() => startEdit(item)}
                                >
                                  Upravit
                                </button>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>
                    )
                  })}
                  
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
                  <button
                    style={ghostBtn}
                    onClick={() => setFeedbackPage(p => Math.max(0, p - 1))}
                    disabled={feedbackPage === 0}
                  >
                    ← Předchozí
                  </button>

                  <div>
                    Stránka {feedbackPage + 1} / {feedbackTotalPages}
                  </div>

                  <button
                    style={ghostBtn}
                    onClick={() => setFeedbackPage(p => Math.min(feedbackTotalPages - 1, p + 1))}
                    disabled={feedbackPage >= feedbackTotalPages - 1}
                  >
                    Další →
                  </button>
                </div>
              </>
              )}

              {tab === 'db' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* TB TOGGLE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label>Travel Buddy</label>
                    <input
                      type="checkbox"
                      checked={tbEnabled}
                      onChange={async (e) => {
                        const val = e.target.checked ? 'true' : 'false'

                        await supabase
                          .from('app_config')
                          .update({ value: val })
                          .eq('key', 'tb_refresh_enabled')

                        setTbEnabled(e.target.checked)
                      }}
                    />
                  </div>

                  {/* RECORDS */}
                  {records
                    .map(r => (
                    <div key={`${r.passport}-${r.destination}`} style={card}>

                      <div style={row}>
                        <strong>
                          {r.passport} → {getCountryByIso(r.destination)?.name || r.destination}
                        </strong>

                        <div style={{ display: 'flex', gap: 6 }}>
                          {r.needs_review && <span style={badgeWarn}>⚠️</span>}

                          <span style={{
                            background: '#1e293b',
                            padding: '2px 6px',
                            borderRadius: 6,
                            fontSize: 11
                          }}>
                            {r.source}
                          </span>
                        </div>
                      </div>

                      <div style={divider} />

                      <div>{r.visa_name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>
                        {r.visa_duration || '—'}
                      </div>

                      <div style={actions}>
                        <button
                          style={ghostBtn}
                          onClick={async () => {
                            await fetch(
                              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/refresh`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
                                },
                                body: JSON.stringify({
                                  passport: r.passport,
                                  destination: r.destination
                                })
                              }
                            )

                            fetchData()
                          }}
                        >
                          🔄 Refresh
                        </button>
                        
                        </div>
                    </div>
                  ))}
                  {records.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: 20 }}>
                      Žádná data
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20 }}>
                        <button
                          style={ghostBtn}
                          onClick={() => setDbPage(p => Math.max(0, p - 1))}
                          disabled={dbPage === 0}
                        >
                          ← Předchozí
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          Stránka {dbPage + 1} / {totalPages}
                        </div>

                        <button
                          style={ghostBtn}
                          onClick={() => setDbPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled= {dbPage >= totalPages - 1}
                        >
                          Další →
                        </button>
                      </div>
                </div>
              )}
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
