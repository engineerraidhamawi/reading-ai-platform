'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [passages, setPassages] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  
  const [newPassage, setNewPassage] = useState('')
  const [q1, setQ1] = useState('')
  const [o1a, setO1a] = useState(''); const [o1b, setO1b] = useState(''); const [o1c, setO1c] = useState(''); const [a1, setA1] = useState('')
  const [q2, setQ2] = useState('')
  const [o2a, setO2a] = useState(''); const [o2b, setO2b] = useState(''); const [o2c, setO2c] = useState(''); const [a2, setA2] = useState('')
  
  const [showPassageForm, setShowPassageForm] = useState(false)
  const [showPassageList, setShowPassageList] = useState(false)

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

  const fetchPassages = useCallback(async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/api/passages', { headers: { Authorization: `Bearer ${token}` } })
      setPassages(res.data)
    } catch (err) { console.error("Failed to fetch passages") }
  }, [])

  useEffect(() => {
    fetchSessions()
    fetchPassages()
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [fetchSessions, fetchPassages])

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
      const formData = new FormData()
      formData.append('text', newPassage)
      formData.append('level', 'متوسط')
      formData.append('question1', q1); formData.append('option1a', o1a); formData.append('option1b', o1b); formData.append('option1c', o1c); formData.append('answer1', a1)
      formData.append('question2', q2); formData.append('option2a', o2a); formData.append('option2b', o2b); formData.append('option2c', o2c); formData.append('answer2', a2)

      await axios.post('https://reading-ai-platform.onrender.com/api/passages', formData, { headers: { Authorization: `Bearer ${token}` } })
      
      setNewPassage(''); setQ1(''); setO1a(''); setO1b(''); setO1c(''); setA1(''); setQ2(''); setO2a(''); setO2b(''); setO2c(''); setA2('')
      setShowPassageForm(false)
      alert('تم إضافة النص والأسئلة بنجاح!')
      fetchPassages()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add passage')
    }
  }

  const handleDeletePassage = async (id: number) => {
    if (!confirm('Are you sure you want to delete this passage?')) return
    const token = localStorage.getItem('token')
    try {
      await axios.delete(`https://reading-ai-platform.onrender.com/api/passages/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchPassages()
    } catch (err) { alert('Failed to delete passage') }
  }

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return
    const token = localStorage.getItem('token')
    try {
      await axios.delete(`https://reading-ai-platform.onrender.com/api/sessions/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      fetchSessions()
    } catch (err) { alert('Failed to delete session') }
  }

  // NEW: Generate Printable PDF Report
  const handlePrintReport = (studentName: string) => {
    const studentSessions = sessions.filter((s: any) => s.student_username === studentName);
    
    const avgAccuracy = studentSessions.length > 0 ? (studentSessions.reduce((acc: number, s: any) => acc + s.accuracy_percent, 0) / studentSessions.length).toFixed(1) : 0;
    const avgWpm = studentSessions.length > 0 ? Math.round(studentSessions.reduce((acc: number, s: any) => acc + s.wpm, 0) / studentSessions.length) : 0;
    
    const errorCounts: { [key: string]: number } = {};
    studentSessions.forEach((s: any) => {
      if (s.error_tags && s.error_tags !== "لا توجد أخطاء") {
        s.error_tags.split(';').forEach((word: string) => {
          const trimmed = word.trim();
          if (trimmed) errorCounts[trimmed] = (errorCounts[trimmed] || 0) + 1;
        });
      }
    });
    const topErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([word, count]) => `<li>${word} (${count} مرة)</li>`).join('');

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير طالب: ${studentName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
          h1 { color: #7e22ce; border-bottom: 2px solid #e9d5ff; padding-bottom: 10px; }
          .stats { display: flex; gap: 20px; margin-bottom: 20px; }
          .stat-box { background: #f8f5ff; padding: 15px; border-radius: 8px; border: 1px solid #e9d5ff; flex: 1; text-align: center; }
          .stat-box h3 { margin: 0; color: #6b21a8; font-size: 14px; }
          .stat-box p { margin: 5px 0 0; font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; font-size: 12px; }
          th { background: #f8f5ff; color: #6b21a8; }
          .errors { margin-top: 20px; }
          .errors ul { list-style: none; padding: 0; }
          .errors li { background: #fef2f2; color: #b91c1c; padding: 5px 10px; margin-bottom: 5px; border-radius: 4px; display: inline-block; margin-left: 10px; }
        </style>
      </head>
      <body>
        <h1>تقرير تقدم الطالب: ${studentName}</h1>
        <div class="stats">
          <div class="stat-box">
            <h3>إجمالي الجلسات</h3>
            <p>${studentSessions.length}</p>
          </div>
          <div class="stat-box">
            <h3>متوسط الدقة</h3>
            <p>${avgAccuracy}%</p>
          </div>
          <div class="stat-box">
            <h3>متوسط السرعة</h3>
            <p>${avgWpm} WPM</p>
          </div>
        </div>
        
        ${topErrors ? `<div class="errors"><h3>أكثر الأخطاء شيوعاً:</h3><ul>${topErrors}</ul></div>` : ''}
        
        <h3>سجل الجلسات:</h3>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الدقة</th>
              <th>السرعة</th>
              <th>الفهم</th>
              <th>الأخطاء</th>
            </tr>
          </thead>
          <tbody>
            ${studentSessions.map((s: any) => `
              <tr>
                <td>${new Date(s.session_date).toLocaleDateString()}</td>
                <td>${s.accuracy_percent}%</td>
                <td>${s.wpm}</td>
                <td>${s.comprehension_score}</td>
                <td>${s.error_tags}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
    }
  };

  const chartData = sessions.map((s: any) => ({ name: s.student_username, accuracy: s.accuracy_percent, wpm: s.wpm }))
  
  const studentProgressData = sessions
    .filter((s: any) => s.student_username === selectedStudent)
    .map((s: any) => ({ name: new Date(s.session_date).toLocaleDateString(), accuracy: s.accuracy_percent, wpm: s.wpm }))
    .reverse()

  const errorCounts: { [key: string]: number } = {}
  sessions.forEach((s: any) => {
    if (s.error_tags && s.error_tags !== "لا توجد أخطاء") {
      s.error_tags.split(';').forEach((word: string) => {
        const trimmed = word.trim()
        if (trimmed) errorCounts[trimmed] = (errorCounts[trimmed] || 0) + 1
      })
    }
  })
  const pieData = Object.entries(errorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    
  const PIE_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981']

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 tracking-tight">لوحة تحكم الدكتورة</h1>
          <p className="text-purple-500 text-xs font-medium">نظرة شاملة على أداء الطلاب</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setShowPassageForm(!showPassageForm); setShowPassageList(false) }} className="bg-white/50 border border-white/60 text-purple-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-white/80 transition">➕ إضافة نص</button>
          <button onClick={() => { setShowPassageList(!showPassageList); setShowPassageForm(false) }} className="bg-white/50 border border-white/60 text-purple-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-white/80 transition">📄 إدارة النصوص</button>
          <button onClick={handleExport} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow hover:scale-105 transition">⬇️ Excel</button>
        </div>
      </header>

      {showPassageForm && (
        <div className="bg-white/80 border border-purple-200 p-4 rounded-xl shadow-lg mb-4">
          <h3 className="text-base font-bold text-purple-900 mb-3">إضافة نص قرائي وأسئلة</h3>
          <form onSubmit={handleAddPassage} className="flex flex-col gap-3">
            <textarea value={newPassage} onChange={(e) => setNewPassage(e.target.value)} placeholder="اكتب النص هنا..." className="p-2 rounded-lg bg-white border border-purple-100 focus:ring-1 focus:ring-purple-400 h-16 text-xs text-gray-900" required />
            <div className="border-t pt-2">
              <h4 className="font-bold text-purple-800 text-sm mb-2">السؤال الأول</h4>
              <input value={q1} onChange={(e) => setQ1(e.target.value)} placeholder="نص السؤال" className="w-full p-2 mb-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input value={o1a} onChange={(e) => setO1a(e.target.value)} placeholder="الخيار 1" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                <input value={o1b} onChange={(e) => setO1b(e.target.value)} placeholder="الخيار 2" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                <input value={o1c} onChange={(e) => setO1c(e.target.value)} placeholder="الخيار 3" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                <input value={a1} onChange={(e) => setA1(e.target.value)} placeholder="الإجابة الصحيحة" className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-gray-900" required />
              </div>
            </div>
            <div className="border-t pt-2">
              <h4 className="font-bold text-purple-800 text-sm mb-2">السؤال الثاني</h4>
              <input value={q2} onChange={(e) => setQ2(e.target.value)} placeholder="نص السؤال" className="w-full p-2 mb-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input value={o2a} onChange={(e) => setO2a(e.target.value)} placeholder="الخيار 1" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                <input value={o2b} onChange={(e) => setO2b(e.target.value)} placeholder="الخيار 2" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                <input value={o2c} onChange={(e) => setO2c(e.target.value)} placeholder="الخيار 3" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                <input value={a2} onChange={(e) => setA2(e.target.value)} placeholder="الإجابة الصحيحة" className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-gray-900" required />
              </div>
            </div>
            <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold w-fit text-xs hover:bg-purple-700 transition mt-2">حفظ النص والأسئلة</button>
          </form>
        </div>
      )}

      {showPassageList && (
        <div className="bg-white/80 border border-purple-200 p-4 rounded-xl shadow-lg mb-4">
          <h3 className="text-base font-bold text-purple-900 mb-3">إدارة النصوص القرائية</h3>
          <div className="flex flex-col gap-2">
            {passages.length === 0 ? <p className="text-xs text-gray-500">لا توجد نصوص.</p> : (
              passages.map((p: any) => (
                <div key={p.id} className="flex justify-between items-center border-b border-purple-50 py-2">
                  <span className="text-xs text-gray-800 font-medium max-w-[80%] truncate">{p.text}</span>
                  <button onClick={() => handleDeletePassage(p.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">🗑️ حذف</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white/80 p-3 rounded-xl shadow-sm">
          <h3 className="text-[10px] font-bold text-purple-700 uppercase">إجمالي الجلسات</h3>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">{sessions.length}</p>
        </div>
        <div className="bg-white/80 p-3 rounded-xl shadow-sm">
          <h3 className="text-[10px] font-bold text-pink-700 uppercase">متوسط الدقة</h3>
          <p className="text-xl font-extrabold text-pink-600 mt-1">{sessions.length > 0 ? (sessions.reduce((acc: number, s: any) => acc + s.accuracy_percent, 0) / sessions.length).toFixed(1) : 0}%</p>
        </div>
        <div className="bg-white/80 p-3 rounded-xl shadow-sm">
          <h3 className="text-[10px] font-bold text-cyan-700 uppercase">متوسط السرعة</h3>
          <p className="text-xl font-extrabold text-cyan-600 mt-1">{sessions.length > 0 ? Math.round(sessions.reduce((acc: number, s: any) => acc + s.wpm, 0) / sessions.length) : 0} <span className="text-[10px] text-purple-400">WPM</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white/80 p-4 rounded-xl shadow-sm">
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
        
        <div className="bg-white/80 p-4 rounded-xl shadow-sm">
          <h2 className="text-sm font-bold mb-2 text-purple-900">أكثر الكلمات التي يخطئ فيها الطلاب</h2>
          <div className="w-full h-40" dir="rtl">
            {pieData.length === 0 ? (
              <p className="text-center text-gray-400 text-xs mt-16">لا توجد أخطاء مسجلة بعد.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} fill="#8884d8">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #d8b4fe', borderRadius: '8px', fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white/80 p-4 rounded-xl shadow-sm">
        <h2 className="text-sm font-bold mb-2 text-purple-900">سجل جلسات الطلاب</h2>
        <div className="overflow-x-auto w-full" dir="rtl">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-purple-100">
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">الطالب</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">الدقة</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">السرعة</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">الفهم</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">الأخطاء</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">النص والصوت</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-purple-400 text-xs">لا توجد بيانات حالياً.</td></tr>
              ) : (
                sessions.map((session: any) => {
                  const accColor = session.accuracy_percent > 85 ? 'bg-emerald-100 text-emerald-700' : session.accuracy_percent > 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                  return (
                    <tr key={session.session_id} className="border-b border-purple-50 hover:bg-white/60 align-top">
                      <td className="py-2 px-2 font-bold text-purple-900 text-xs whitespace-nowrap">
                        <button onClick={() => setSelectedStudent(session.student_username)} className="hover:underline">
                          {session.student_username}
                        </button>
                      </td>
                      <td className="py-2 px-2"><span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${accColor}`}>{session.accuracy_percent}%</span></td>
                      <td className="py-2 px-2 text-purple-600 font-bold text-xs whitespace-nowrap">{session.wpm} WPM</td>
                      <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">{session.comprehension_score}</span></td>
                      <td className="py-2 px-2 text-red-500 max-w-[120px] text-[10px] leading-relaxed">{session.error_tags}</td>
                      <td className="py-2 px-2 text-purple-500 max-w-[250px] text-[10px] leading-relaxed">
                        <div className="bg-white/60 rounded-md p-1.5 border border-purple-50">
                          <p className="italic mb-1">"{session.asr_transcript}"</p>
                          {session.audio_file_id && (<audio controls src={session.audio_file_id} className="w-full h-6 mt-1">Your browser does not support the audio element.</audio>)}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button onClick={() => handleDeleteSession(session.session_id)} className="text-red-500 hover:text-red-700 text-lg">🗑️</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-purple-900">تقدم الطالب: {selectedStudent}</h3>
              <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600">✖️</button>
            </div>
            
            <div className="w-full h-64 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentProgressData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#7e22ce', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7e22ce', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #d8b4fe', borderRadius: '8px', fontSize: '10px' }} />
                  <Line type="monotone" dataKey="accuracy" stroke="#8b5cf6" name="الدقة %" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="wpm" stroke="#ec4899" name="السرعة" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* NEW: Print PDF Button */}
            <div className="flex justify-center mt-4">
              <button onClick={() => handlePrintReport(selectedStudent)} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition">
                🖨️ طباعة تقرير PDF
              </button>
            </div>
            
            <p className="text-xs text-gray-400 text-center mt-4">اضغط خارج النافذة للإغلاق</p>
          </div>
        </div>
      )}
    </div>
  )
}