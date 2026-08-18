'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  
  const [newPassage, setNewPassage] = useState('')
  const [q1, setQ1] = useState('')
  const [o1a, setO1a] = useState(''); const [o1b, setO1b] = useState(''); const [o1c, setO1c] = useState(''); const [a1, setA1] = useState('')
  const [q2, setQ2] = useState('')
  const [o2a, setO2a] = useState(''); const [o2b, setO2b] = useState(''); const [o2c, setO2c] = useState(''); const [a2, setA2] = useState('')
  
  const [showPassageForm, setShowPassageForm] = useState(false)

  const fetchSessions = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return window.location.href = '/login'
    setLoading(true)
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/api/sessions', { headers: { Authorization: `Bearer ${token}` } })
      setSessions(res.data)
    } catch (err: any) {
      if (err.response?.status === 401) window.location.href = '/login'
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  const handleExport = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/api/sessions/export', { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'research_data.csv')
      document.body.appendChild(link)
      link.click(); link.remove()
    } catch (err) { alert('Failed to export data') }
  }

  const handleAddPassage = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const params = new URLSearchParams()
      params.append('text', newPassage)
      params.append('level', 'متوسط')
      params.append('question1', q1); params.append('option1a', o1a); params.append('option1b', o1b); params.append('option1c', o1c); params.append('answer1', a1)
      params.append('question2', q2); params.append('option2a', o2a); params.append('option2b', o2b); params.append('option2c', o2c); params.append('answer2', a2)

      await axios.post('https://reading-ai-platform.onrender.com/api/passages', params, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } })
      
      setNewPassage(''); setQ1(''); setO1a(''); setO1b(''); setO1c(''); setA1(''); setQ2(''); setO2a(''); setO2b(''); setO2c(''); setA2('')
      setShowPassageForm(false)
      alert('تم إضافة النص والأسئلة بنجاح!')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add passage')
    }
  }

  const chartData = sessions.map((s: any) => ({ name: s.student_username, accuracy: s.accuracy_percent, wpm: s.wpm }))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 tracking-tight">لوحة تحكم الدكتورة</h1>
          <p className="text-purple-500 text-xs font-medium">نظرة شاملة على أداء الطلاب</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPassageForm(!showPassageForm)} className="bg-white/50 border border-white/60 text-purple-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-white/80 transition">➕ إضافة نص</button>
          <button onClick={handleExport} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow hover:scale-105 transition">⬇️ Excel</button>
        </div>
      </header>

      {showPassageForm && (
        <div className="bg-white/70 border border-purple-200 p-4 rounded-xl shadow-lg mb-4">
          <h3 className="text-base font-bold text-purple-900 mb-3">إضافة نص قرائي وأسئلة</h3>
          <form onSubmit={handleAddPassage} className="flex flex-col gap-3">
            <textarea value={newPassage} onChange={(e) => setNewPassage(e.target.value)} placeholder="اكتب النص هنا..." className="p-2 rounded-lg bg-white border border-purple-100 focus:ring-1 focus:ring-purple-400 h-16 text-xs" required />
            
            <div className="border-t pt-2">
              <h4 className="font-bold text-purple-800 text-sm mb-2">السؤال الأول</h4>
              <input value={q1} onChange={(e) => setQ1(e.target.value)} placeholder="نص السؤال" className="w-full p-1.5 mb-2 rounded-md bg-white border border-purple-100 text-xs" required />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input value={o1a} onChange={(e) => setO1a(e.target.value)} placeholder="الخيار 1" className="p-1.5 rounded-md bg-white border border-purple-100 text-xs" required />
                <input value={o1b} onChange={(e) => setO1b(e.target.value)} placeholder="الخيار 2" className="p-1.5 rounded-md bg-white border border-purple-100 text-xs" required />
                <input value={o1c} onChange={(e) => setO1c(e.target.value)} placeholder="الخيار 3" className="p-1.5 rounded-md bg-white border border-purple-100 text-xs" required />
                <input value={a1} onChange={(e) => setA1(e.target.value)} placeholder="الإجابة الصحيحة" className="p-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs" required />
              </div>
            </div>

            <div className="border-t pt-2">
              <h4 className="font-bold text-purple-800 text-sm mb-2">السؤال الثاني</h4>
              <input value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="نص السؤال" className="w-full p-1.5 mb-2 rounded-md bg-white border border-purple-100 text-xs" required />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input value={o2a} onChange={(e) => setO2a(e.target.value)} placeholder="الخيار 1" className="p-1.5 rounded-md bg-white border border-purple-100 text-xs" required />
                <input value={o2b} onChange={(e) => setO2b(e.target.value)} placeholder="الخيار 2" className="p-1.5 rounded-md bg-white border border-purple-100 text-xs" required />
                <input value={o2c} onChange={(e) => setO2c(e.target.value)} placeholder="الخيار 3" className="p-1.5 rounded-md bg-white border border-purple-100 text-xs" required />
                <input value={a2} onChange={(e) => setA2(e.target.value)} placeholder="الإجابة الصحيحة" className="p-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs" required />
              </div>
            </div>

            <button type="submit" className="bg-purple-600 text-white px-4 py-1.5 rounded-lg font-bold w-fit text-xs hover:bg-purple-700 transition">حفظ</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/70 p-3 rounded-xl shadow-sm">
          <h3 className="text-[10px] font-bold text-purple-700 uppercase">إجمالي الجلسات</h3>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">{sessions.length}</p>
        </div>
        <div className="bg-white/70 p-3 rounded-xl shadow-sm">
          <h3 className="text-[10px] font-bold text-pink-700 uppercase">متوسط الدقة</h3>
          <p className="text-xl font-extrabold text-pink-600 mt-1">{sessions.length > 0 ? (sessions.reduce((acc: number, s: any) => acc + s.accuracy_percent, 0) / sessions.length).toFixed(1) : 0}%</p>
        </div>
        <div className="bg-white/70 p-3 rounded-xl shadow-sm">
          <h3 className="text-[10px] font-bold text-cyan-700 uppercase">متوسط السرعة</h3>
          <p className="text-xl font-extrabold text-cyan-600 mt-1">{sessions.length > 0 ? Math.round(sessions.reduce((acc: number, s: any) => acc + s.wpm, 0) / sessions.length) : 0} <span className="text-[10px] text-purple-400">WPM</span></p>
        </div>
      </div>

      <div className="bg-white/70 p-4 rounded-xl shadow-sm mb-4">
        <h2 className="text-sm font-bold mb-2 text-purple-900">رسم بياني لأداء الطلاب</h2>
        <div className="w-full h-40" dir="rtl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#7e22ce', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7e22ce', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #d8b4fe', borderRadius: '8px', fontSize: '10px' }} />
              <Bar dataKey="accuracy" fill="#8b5cf6" name="الدقة %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="wpm" fill="#ec4899" name="السرعة" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/70 p-4 rounded-xl shadow-sm">
        <h2 className="text-sm font-bold mb-2 text-purple-900">سجل جلسات الطلاب</h2>
       <div className="overflow-x-hidden w-full" dir="rtl">
          <table className="w-full text-right border-collapse table-fixed">
                  <thead>
              <tr className="border-b border-purple-100">
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">الطالب</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">الدقة</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">السرعة</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">الفهم</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">الأخطاء</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">النص والصوت</th>
              </tr>
            </thead>
                    <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-purple-400 text-xs">لا توجد بيانات حالياً.</td>
                </tr>
              ) : (
                sessions.map((session: any) => (
                  <tr key={session.session_id} className="border-b border-purple-50 hover:bg-white/60 align-top">
                    <td className="py-2 px-2 font-bold text-purple-900 text-xs whitespace-nowrap">{session.student_username}</td>
                    <td className="py-2 px-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${session.accuracy_percent > 85 ? 'bg-emerald-100 text-emerald-700' : session.accuracy_percent > 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {session.accuracy_percent}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-purple-600 font-bold text-xs whitespace-nowrap">{session.wpm} <span className="text-[10px] text-purple-300">WPM</span></td>
                    <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">{session.comprehension_score}</span></td>
                    <td className="py-2 px-2 text-red-500 max-w-[120px] text-[10px] leading-relaxed break-words">{session.error_tags}</td>
                    <td className="py-2 px-2 text-purple-500 max-w-[250px] text-[10px] leading-relaxed break-words">
                      <div className="bg-white/60 rounded-md p-1.5 border border-purple-50">
                        <p className="italic mb-1">"{session.asr_transcript}"</p>
                        {session.audio_file_id && (
                          <audio controls src={session.audio_file_id} className="w-full h-6 mt-1">Your browser does not support the audio element.</audio>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}