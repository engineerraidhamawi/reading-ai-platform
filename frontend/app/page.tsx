'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [newPassage, setNewPassage] = useState('')
  const [showPassageForm, setShowPassageForm] = useState(false)

  const fetchSessions = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return window.location.href = '/login'
    setLoading(true)
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/api/sessions', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
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
    } catch (err) {
      alert('Failed to export data')
    }
  }

  const handleAddPassage = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const params = new URLSearchParams()
      params.append('text', newPassage)
      params.append('level', 'متوسط')

      await axios.post('https://reading-ai-platform.onrender.com/api/passages', params, { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      setNewPassage('')
      setShowPassageForm(false)
      alert('تم إضافة النص بنجاح!')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to add passage'
      alert(errorMessage)
    }
  }

  const chartData = sessions.map((s: any) => ({ name: s.student_username, accuracy: s.accuracy_percent, wpm: s.wpm }))

  return (
    <div className="p-6 md:p-8">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 tracking-tight">لوحة تحكم الدكتورة</h1>
          <p className="text-purple-500 mt-1 text-sm font-medium">نظرة شاملة على أداء الطلاب</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPassageForm(!showPassageForm)} className="bg-white/50 border border-white/60 text-purple-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-white/80 transition">
            ➕ إضافة نص
          </button>
          <button onClick={handleExport} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition">
            ⬇️ تصدير Excel
          </button>
        </div>
      </header>

      {showPassageForm && (
        <div className="bg-white/50 border border-white/60 p-4 rounded-2xl shadow-xl mb-6">
          <h3 className="text-lg font-bold text-purple-900 mb-3">إضافة نص قرائي جديد</h3>
          <form onSubmit={handleAddPassage} className="flex flex-col gap-3">
            <textarea 
              value={newPassage}
              onChange={(e) => setNewPassage(e.target.value)}
              placeholder="اكتب النص هنا..."
              className="p-3 rounded-xl bg-white/70 border border-purple-100 focus:ring-2 focus:ring-purple-400 h-24 text-sm"
              required
            />
            <button type="submit" className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold w-fit text-sm">حفظ النص</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-md">
          <h3 className="text-xs font-bold text-purple-700 uppercase">إجمالي الجلسات</h3>
          <p className="text-3xl font-extrabold text-indigo-600 mt-2">{sessions.length}</p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-md">
          <h3 className="text-xs font-bold text-pink-700 uppercase">متوسط الدقة</h3>
          <p className="text-3xl font-extrabold text-pink-600 mt-2">{sessions.length > 0 ? (sessions.reduce((acc: number, s: any) => acc + s.accuracy_percent, 0) / sessions.length).toFixed(1) : 0}%</p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-md">
          <h3 className="text-xs font-bold text-cyan-700 uppercase">متوسط السرعة</h3>
          <p className="text-3xl font-extrabold text-cyan-600 mt-2">{sessions.length > 0 ? Math.round(sessions.reduce((acc: number, s: any) => acc + s.wpm, 0) / sessions.length) : 0} <span className="text-sm text-purple-300">WPM</span></p>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-md mb-6" dir="rtl">
        <h2 className="text-lg font-bold mb-4 text-purple-900">رسم بياني لأداء الطلاب</h2>
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#7e22ce', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7e22ce', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #d8b4fe', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="accuracy" fill="#8b5cf6" name="الدقة %" radius={[6, 6, 0, 0]} />
              <Bar dataKey="wpm" fill="#ec4899" name="السرعة" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-md">
        <h2 className="text-lg font-bold mb-4 text-purple-900">سجل جلسات الطلاب</h2>
        <div className="overflow-x-auto" dir="rtl">
          <table className="min-w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-purple-100">
                <th className="py-3 px-3 text-xs font-bold text-purple-700">الطالب</th>
                <th className="py-3 px-3 text-xs font-bold text-purple-700">الدقة</th>
                <th className="py-3 px-3 text-xs font-bold text-purple-700">السرعة</th>
                <th className="py-3 px-3 text-xs font-bold text-purple-700">الفهم</th>
                <th className="py-3 px-3 text-xs font-bold text-purple-700">الأخطاء</th>
                <th className="py-3 px-3 text-xs font-bold text-purple-700">النص المقروء (AI)</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-purple-400 text-sm">لا توجد بيانات حالياً.</td></tr>
              ) : (
                sessions.map((session: any) => (
                  <tr key={session.session_id} className="border-b border-purple-50 hover:bg-white/60 align-top">
                    <td className="py-3 px-3 font-bold text-purple-900 text-sm">{session.student_username}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${session.accuracy_percent > 85 ? 'bg-emerald-100 text-emerald-700' : session.accuracy_percent > 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{session.accuracy_percent}%</span>
                    </td>
                    <td className="py-3 px-3 text-purple-600 font-bold text-sm">{session.wpm} <span className="text-xs text-purple-300">WPM</span></td>
                    <td className="py-3 px-3"><span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">{session.comprehension_score}</span></td>
                    <td className="py-3 px-3 text-red-500 max-w-[150px] text-xs leading-relaxed">{session.error_tags}</td>
                    <td className="py-3 px-3 text-purple-500 max-w-[250px] text-xs leading-relaxed">
                      <div className="bg-white/40 rounded-lg p-2 border border-white/60">
                        <p className="italic mb-2">"{session.asr_transcript}"</p>
                        {session.audio_file_id && (
                          <audio controls className="w-full h-8">
                            <source src={`https://reading-ai-platform.onrender.com/api/audio/${session.audio_file_id}?t=${localStorage.getItem('token')}`} type="audio/webm" />
                            متصفحك لا يدعم تشغيل الصوت.
                          </audio>
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