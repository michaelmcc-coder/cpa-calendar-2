'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Clock, Mail, Plus, Trash2, Edit3, Save, Monitor, Settings, Lock, RefreshCw, Wand2 } from 'lucide-react'

type Reminder = { id: number; title: string; category: string; dueDate: string; dueTime: string; source: string; notes: string }

const STORAGE_KEY = 'cpa_staff_calendar_reminders_v2'
const UPDATED_KEY = 'cpa_staff_calendar_last_updated_v2'
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '2468'

const starter: Reminder[] = [
  { id: 1, title: 'Year 11 assessment data deadline', category: 'Assessment', dueDate: '2026-05-01', dueTime: '16:00', source: 'SLT weekly broader email', notes: 'Upload final data before 4pm.' },
  { id: 2, title: 'Faculty meeting preparation', category: 'Meeting', dueDate: '2026-05-04', dueTime: '08:30', source: 'SLT weekly broader email', notes: 'Bring intervention updates and key student concerns.' },
  { id: 3, title: 'CPD reflection submission', category: 'CPD', dueDate: '2026-05-08', dueTime: '15:30', source: 'SLT weekly broader email', notes: 'Complete short reflection form.' },
]

const emptyForm = { title: '', category: 'Assessment', dueDate: new Date().toISOString().slice(0,10), dueTime: '16:00', source: 'SLT weekly broader email', notes: '' }

function dueDateTime(item: Reminder) { return new Date(`${item.dueDate}T${item.dueTime || '00:00'}:00`) }
function formatDate(item: Reminder) { return dueDateTime(item).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
function countdown(item: Reminder) {
  const diff = dueDateTime(item).getTime() - Date.now(); const abs = Math.abs(diff)
  const days = Math.floor(abs / 86400000); const hours = Math.floor((abs / 3600000) % 24); const mins = Math.floor((abs / 60000) % 60)
  if (diff < 0) return days === 0 ? 'Overdue today' : `${days} day${days === 1 ? '' : 's'} overdue`
  if (days === 0 && hours === 0) return `${mins} min left`
  if (days === 0) return `${hours} hour${hours === 1 ? '' : 's'} left`
  return `${days} day${days === 1 ? '' : 's'} left`
}
function urgency(item: Reminder) { const d = (dueDateTime(item).getTime() - Date.now()) / 86400000; return d < 0 ? 'overdue' : d <= 1 ? 'today' : d <= 7 ? 'soon' : 'later' }
function classes(level: string) { return level === 'overdue' ? 'bg-red-100 border-red-600 text-red-950' : level === 'today' ? 'bg-red-50 border-red-500 text-red-950' : level === 'soon' ? 'bg-amber-50 border-amber-500 text-amber-950' : 'bg-emerald-50 border-emerald-500 text-emerald-950' }
function todayLong() { return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
function categoryFrom(text: string) { const s = text.toLowerCase(); if (s.includes('assessment') || s.includes('data')) return 'Assessment'; if (s.includes('meeting')) return 'Meeting'; if (s.includes('cpd') || s.includes('training')) return 'CPD'; if (s.includes('report')) return 'Reports'; if (s.includes('event')) return 'Event'; return 'General' }
function parseSltEmail(text: string): Reminder[] {
  const dateRegex = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b|\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i
  const monthMap: Record<string,string> = { jan:'01', feb:'02', mar:'03', apr:'04', may:'05', jun:'06', jul:'07', aug:'08', sep:'09', oct:'10', nov:'11', dec:'12' }
  return text.split('\n').map(x => x.trim()).filter(Boolean).map((line, idx) => {
    const m = line.match(dateRegex); if (!m) return null
    let date = new Date().toISOString().slice(0,10)
    if (m[1]) { const y = m[3].length === 2 ? `20${m[3]}` : m[3]; date = `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` }
    else if (m[4]) { const y = new Date().getFullYear(); date = `${y}-${monthMap[m[5].slice(0,3).toLowerCase()]}-${m[4].padStart(2,'0')}` }
    const time = line.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
    let dueTime = '16:00'; if (time) { let h = Number(time[1]); const min = time[2] || '00'; if (time[3].toLowerCase() === 'pm' && h < 12) h += 12; if (time[3].toLowerCase() === 'am' && h === 12) h = 0; dueTime = `${String(h).padStart(2,'0')}:${min}` }
    return { id: Date.now() + idx, title: line.replace(dateRegex, '').replace(/\s+/g, ' ').slice(0, 90) || 'SLT reminder', category: categoryFrom(line), dueDate: date, dueTime, source: 'Pasted SLT weekly broader email', notes: line }
  }).filter(Boolean) as Reminder[]
}

function Button({ children, className='', ...props }: any) { return <button className={`rounded-2xl px-5 py-3 font-bold transition active:scale-95 ${className}`} {...props}>{children}</button> }

export default function Page() {
  const [items, setItems] = useState<Reminder[]>(starter)
  const [view, setView] = useState<'display'|'admin'>('display')
  const [form, setForm] = useState<any>(emptyForm)
  const [editingId, setEditingId] = useState<number|null>(null)
  const [lastUpdated, setLastUpdated] = useState('Wednesday 29 April 2026')
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [emailText, setEmailText] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => { const saved = localStorage.getItem(STORAGE_KEY); const upd = localStorage.getItem(UPDATED_KEY); if (saved) setItems(JSON.parse(saved)); if (upd) setLastUpdated(upd) }, [])
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) }, [items])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t) }, [])

  const sorted = useMemo(() => [...items].sort((a,b) => dueDateTime(a).getTime() - dueDateTime(b).getTime()), [items, now])
  const next = sorted[0]

  function save() { if (!form.title.trim() || !form.dueDate) return; const item = { ...form, id: editingId || Date.now() }; setItems(cur => editingId ? cur.map(x => x.id === editingId ? item : x) : [...cur, item]); const upd = todayLong(); setLastUpdated(upd); localStorage.setItem(UPDATED_KEY, upd); setEditingId(null); setForm(emptyForm) }
  function edit(item: Reminder) { setForm(item); setEditingId(item.id); setView('admin'); setUnlocked(true) }
  function addExtracted() { const extracted = parseSltEmail(emailText); if (!extracted.length) return; setItems(cur => [...cur, ...extracted]); const upd = todayLong(); setLastUpdated(upd); localStorage.setItem(UPDATED_KEY, upd); setEmailText('') }

  return <main className="min-h-screen bg-slate-950 text-white p-5 md:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-4xl md:text-7xl font-black tracking-tight">CPA Staff Calendar</h1><p className="mt-2 text-xl md:text-2xl text-slate-300">Deadlines and countdowns from weekly SLT updates</p></div>
        <div className="flex gap-3"><Button onClick={() => setView('display')} className="bg-white text-slate-950"><Monitor className="inline mr-2"/>Display</Button><Button onClick={() => setView('admin')} className="bg-slate-700"><Settings className="inline mr-2"/>Admin</Button></div>
      </header>

      {view === 'display' && <section className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-[2rem] bg-white p-8 text-slate-950 shadow-2xl">
            <div className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-500"><Clock/>Next key deadline</div>
            {next ? <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}><h2 className="text-5xl md:text-7xl font-black leading-tight">{next.title}</h2><div className="mt-6 flex flex-wrap items-center gap-4"><span className="text-4xl font-black text-red-700">{countdown(next)}</span><span className="rounded-full bg-slate-100 px-5 py-2 text-2xl">{formatDate(next)}</span></div><p className="mt-6 text-2xl text-slate-700">{next.notes}</p></motion.div> : <p className="text-3xl">No upcoming deadlines.</p>}
          </div>
          <div className="rounded-[2rem] bg-slate-800 p-8 shadow-2xl"><div className="mb-4 flex items-center gap-3 text-xl font-bold text-slate-300"><CalendarDays/>Today</div><div className="text-5xl font-black">{new Date().toLocaleDateString('en-GB',{weekday:'long'})}</div><div className="mt-3 text-3xl text-slate-300">{new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div><div className="mt-8 flex items-center gap-2 text-lg text-slate-400"><Mail/>Last updated: {lastUpdated}</div><div className="mt-3 flex items-center gap-2 text-lg text-slate-400"><RefreshCw/>Auto-refreshes every minute</div></div>
        </div>
        {sorted.map(item => <motion.div key={item.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={`rounded-[2rem] border-l-8 p-6 shadow-xl ${classes(urgency(item))}`}><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="mb-2 flex flex-wrap items-center gap-3"><span className="rounded-full bg-white/70 px-4 py-1 text-lg font-bold">{item.category}</span><span className="text-lg opacity-80">{formatDate(item)}</span></div><h3 className="text-3xl md:text-5xl font-black">{item.title}</h3><p className="mt-2 text-xl opacity-80">{item.notes}</p></div><div className="md:text-right"><div className="whitespace-nowrap text-4xl md:text-5xl font-black">{countdown(item)}</div><div className="mt-2 text-lg opacity-70">{item.source}</div></div></div></motion.div>)}
      </section>}

      {view === 'admin' && !unlocked && <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-slate-950 shadow-2xl"><Lock className="mb-4 h-10 w-10"/><h2 className="text-3xl font-black">Admin PIN</h2><p className="mt-2 text-slate-600">Enter the PIN to edit reminders.</p><input className="mt-5 w-full rounded-2xl border p-4 text-2xl" type="password" value={pin} onChange={e=>setPin(e.target.value)} placeholder="PIN"/><Button onClick={()=> setUnlocked(pin === ADMIN_PIN)} className="mt-4 w-full bg-slate-950 text-white">Unlock</Button>{pin && pin !== ADMIN_PIN && <p className="mt-3 text-red-600">Incorrect PIN.</p>}</section>}

      {view === 'admin' && unlocked && <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[2rem] bg-white p-7 text-slate-950 shadow-2xl"><h2 className="mb-5 text-3xl font-black">{editingId ? 'Edit reminder' : 'Add reminder'}</h2><div className="space-y-4"><input className="w-full rounded-2xl border p-3 text-lg" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Title"/><div className="grid grid-cols-2 gap-3"><input type="date" className="rounded-2xl border p-3 text-lg" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/><input type="time" className="rounded-2xl border p-3 text-lg" value={form.dueTime} onChange={e=>setForm({...form,dueTime:e.target.value})}/></div><select className="w-full rounded-2xl border p-3 text-lg" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Assessment','Meeting','CPD','Reports','Event','General'].map(x=><option key={x}>{x}</option>)}</select><input className="w-full rounded-2xl border p-3 text-lg" value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/><textarea className="min-h-24 w-full rounded-2xl border p-3 text-lg" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes"/><Button onClick={save} className="w-full bg-slate-950 text-white"><Save className="inline mr-2"/>Save reminder</Button></div></div>
          <div className="rounded-[2rem] bg-white p-7 text-slate-950 shadow-2xl"><h2 className="mb-2 text-3xl font-black"><Wand2 className="inline mr-2"/>Paste SLT email</h2><p className="mb-4 text-slate-600">Paste the weekly broader email. Lines containing dates will be converted into reminders.</p><textarea className="min-h-44 w-full rounded-2xl border p-3 text-lg" value={emailText} onChange={e=>setEmailText(e.target.value)} placeholder="Paste email text here..."/><Button onClick={addExtracted} className="mt-3 w-full bg-emerald-700 text-white">Extract and add reminders</Button></div>
        </div>
        <div className="lg:col-span-3 rounded-[2rem] bg-slate-800 p-7 shadow-2xl"><h2 className="mb-5 text-3xl font-black">Current reminders</h2><div className="space-y-3">{sorted.map(item => <div key={item.id} className="rounded-[2rem] bg-slate-900 p-5"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="text-lg text-slate-400">{item.category} · {formatDate(item)} · {countdown(item)}</div><div className="text-2xl font-black">{item.title}</div><div className="mt-1 text-slate-300">{item.notes}</div></div><div className="flex gap-2"><Button onClick={()=>edit(item)} className="bg-white text-slate-950"><Edit3 className="inline mr-2"/>Edit</Button><Button onClick={()=>setItems(cur=>cur.filter(x=>x.id!==item.id))} className="bg-red-700"><Trash2 className="inline mr-2"/>Delete</Button></div></div></div>)}</div></div>
      </section>}
    </div>
  </main>
}
