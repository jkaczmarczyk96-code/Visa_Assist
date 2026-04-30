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
    max_stay: ''
  })

  // 🔥 audit log
  const [auditLog, setAuditLog] = useState<Record<string, any>>({})

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
    if (user) {
      fetchData()
      fetchAudit()
    }
  }, [user, showNegative])

  // 🔥 LOAD AUDIT (1. verze – ponecháno)
  const fetchAudit = async () => {
    const { data } = await supabase
      .from('visa_cache')
      .select('*')
      .order('updated_at', { ascending: false })

    const map: Record<string, any> = {}

    data?.forEach((row: any) => {
      const key = `${row.passport}-${row.country}`
      if (!map[key]) map[key] = row
    })

    setAuditLog(map)
  }

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

  const isFlagged = (item: Feedback) => {
    const key = `${item.passport}-${item.country}`
    return flagged[key] >= 3
  }

  const startEdit = (item: Feedback) => {
    setEditingId(item.id)

    const key = `${item.passport}-${item.country}`
    const audit = auditLog[key]

    setForm({
      status: audit?.data?.status || '',
      max_stay: audit?.data?.max_stay || ''
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
    fetchAudit()
  }

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

  if (loading) {
    return <div style={{ padding: 40, color: 'white' }}>Načítám...</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', color: 'white', padding: 40 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <h1>Admin Dashboard</h1>

        {Object.entries(
          groupByDate(
            data.filter(item => !showFlagged || isFlagged(item))
          )
        ).map(([group, items]) => {
          return (
            <div key={group}>

              <div style={{ color: '#9ca3af', margin: '10px 0 6px' }}>
                {group}
              </div>

              {items.map((item) => {

                const key = `${item.passport}-${item.country}`
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

                      <div style={{ display: 'flex', gap: 8 }}>

                        {audit?.data?.override === true && (
                          <span style={{
                            fontSize: 11,
                            background: '#2563eb',
                            padding: '2px 6px',
                            borderRadius: 6
                          }}>
                            override
                          </span>
                        )}

                        <span style={{
                          fontSize: 12,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: item.rating === 1 ? '#16a34a' : '#dc2626',
                          color: 'white'
                        }}>
                          {item.rating === 1 ? '👍' : '👎'}
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: 8, color: '#9ca3af' }}>
                      {item.comment || '—'}
                    </div>

                    {audit?.updated_at && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        Override: {new Date(audit.updated_at).toLocaleString('cs-CZ')}
                      </div>
                    )}

                    {editingId === item.id ? (
                      <div style={{ marginTop: 10 }}>
                        <select
                          value={form.status}
                          onChange={e => setForm({ ...form, status: e.target.value })}
                        >
                          <option value="">Status</option>
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>

                        <input
                          placeholder="Max stay"
                          value={form.max_stay}
                          onChange={e => setForm({ ...form, max_stay: e.target.value })}
                        />

                        <button onClick={() => saveOverride(item)}>Uložit</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(item)}>
                        Upravit override
                      </button>
                    )}

                  </div>
                )
              })}

            </div>
          )
        })}

      </div>
    </div>
  )
}
