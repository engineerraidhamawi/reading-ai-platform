'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [newPassage, setNewPassage] = useState('')
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
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  const handleExport = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/api/sessions/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'research_data.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err: any) {
      alert('Failed to export data')
    }
  }

  const handleAddPassage = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await axios.post('https://reading-ai-platform.onrender.com/api/passages', 
        new URLSearchParams({ text: newPassage, level: 'متوسط' }), 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNewPassage('')
      setShowPassageForm(false)
      alert('Passage added successfully!')
    } catch (err: any) {
      alert('Failed to add passage')
    }
  }

  const chartData = sessions.map((s: any) => ({ name: s.student_username, accuracy: s.accuracy_percent, wpm: s.wpm }))

  return (
    <div className="p-10">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 tracking-tight">لوحة تحكم الدكتورة</h1>
          <p className="text-purple-500 mt-2 font-medium">نظرة شاملة على أداء الطلاب وتحليلات الذكاء الاصطناعي</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowPassageForm(!showPassageForm)} className="bg-white/50 border border-white/60 text-purple-700 px-5 py-2 rounded-xl font-bold hover:bg-white/80 transition">
            ➕ إضافة نص
          </button>
          <button onClick={handleExport} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-5 py-2 rounded-xl font-bold shadow-lg hover:scale-105 transition">
            ⬇️ تصدير Excel
          </button>
        </div>
      </header>

      {showPassageForm && (
        <div className="bg-white/50 border border-white/60 p-6 rounded-3xl shadow-xl mb-8">
          <h3 className="text-xl font-bold text-purple-900 mb-4">إضافة نص قرائي جديد</h3>
          <form onSubmit={handleAddPassage} className="flex flex-col gap-4">
            <textarea 
              value={newPassage}
              onChange={(e) => setNewPassage(e.target.value)}
              placeholder="اكتب النص هنا..."
              className="p-3 rounded-xl bg-white/70 border border-purple-100 focus:ring-2 focus:ring-purple-400 h-32"
              required
            />
            <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold w-fit">حفظ النص</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-xl">
          <h3 className="text-sm font-bold text-purple-700 uppercase">إجمالي الجلسات</h3>
          <p className="text-5xl font-extrabold text-indigo-600 mt-3">{sessions.length}</p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-xl">
          <h3 className="text-sm font-bold text-pink-700 uppercase">متوسط الدقة</h3>
          <p className="text-5xl font-extrabold text-pink-600 mt-3">{sessions.length > 0 ? (sessions.reduce((acc, s) => acc + s.accuracy_percent, 0) / sessions.length).toFixed(1) : 0}%</p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-xl">
          <h3 className="text-sm font-bold text-cyan-700 uppercase">متوسط السرعة</h3>
          <p className="text-5xl font-extrabold text-cyan-600 mt-3">{sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => acc + s.wpm, 0) / sessions.length) : 0} WPM</p>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl mb-8" dir="rtl">
        <h2 className="text-xl font-bold mb-6 text-purple-900">رسم بياني لأداء الطلاب</h2>
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#7e22ce', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7e22ce', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #d8b4fe', borderRadius: '16px' }} />
              <Bar dataKey="accuracy" fill="#8b5cf6" name="الدقة %" radius={[8, 8, 0, 0]} />
              <Bar dataKey="wpm" fill="#ec4899" name="السرعة" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-purple-900">سجل جلسات الطلاب</h2>
        <div className="overflow-x-auto" dir="rtl">
          <table className="min-w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-purple-100">
                <th className="py-4 px-4 text-sm font-bold text-purple-700">الطالب</th>
                <th className="py-4 px-4 text-sm font-bold text-purple-700">الدقة</th>
                <th className="py-4 px-4 text-sm font-bold text-purple-700">السرعة</th>
                <th className="py-4 px-4 text-sm font-bold text-purple-700">الفهم</th>
                <th className="py-4 px-4 text-sm font-bold text-purple-700">الأخطاء</th>
                <th className="py-4 px-4 text-sm font-bold text-purple-700">النص المقروء (AI)</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-purple-400">لا توجد بيانات حالياً.</td></tr>
              ) : (
                sessions.map((session: any) => (
                  <tr key={session.session_id} className="border-b border-purple-50 hover:bg-white/60 align-top">
                    <td className="py-4 px-4 font-bold text-purple-900">{session.student_username}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${session.accuracy_percent > 85 ? 'bg-emerald-100 text-emerald-700' : session.accuracy_percent > 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{session.accuracy_percent}%</span>
                    </td>
                    <td className="py-4 px-4 text-purple-600 font-bold">{session.wpm} WPM</td>
                    <td className="py-4 px-4"><span className="px-3 py-1 rounded-full text-sm font-bold bg-purple-100 text-purple-700">{session.comprehension_score}</span></td>
                    <td className="py-4 px-4 text-red-500 max-w-[200px] text-sm">{session.error_tags}</td>
                    <td className="py-4 px-4 text-purple-500 max-w-[250px] text-sm italic bg-white/40 rounded-lg p-3 border border-white/60">"{session.asr_transcript}"</td>
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