'use client'

import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import WaveformPlayer from './WaveformPlayer'

const buildEmptyQuestions = (count: number) => {
  return Array.from({ length: count }, () => ({ q: '', o1: '', o2: '', o3: '', ans: '' }))
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<any[]>([])
  const [passages, setPassages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [view, setView] = useState<'overview' | 'student' | 'passages'>('overview')
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null)
  
  const [newPassage, setNewPassage] = useState('')
  const [newGrade, setNewGrade] = useState('الصف الأول')
  const [questions, setQuestions] = useState<any[]>(buildEmptyQuestions(4))
  
  const [showPassageForm, setShowPassageForm] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Readability Score States
  const [readabilityScore, setReadabilityScore] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // AI Feedback States
  const [feedback, setFeedback] = useState<{ [key: string]: string }>({})
  const [generatingFeedback, setGeneratingFeedback] = useState<string | null>(null)

  // NEW: Assignment States
  const [doctorStudents, setDoctorStudents] = useState<any[]>([])
  const [assignedTo, setAssignedTo] = useState<string>("")

  const fetchSessions = useCallback(async () => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (!token) return window.location.href = '/login'
    if (role === 'student') return window.location.href = '/student'
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

  // NEW: Fetch Doctor's Students
  const fetchDoctorStudents = useCallback(async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/api/doctor/students', { headers: { Authorization: `Bearer ${token}` } })
      setDoctorStudents(res.data)
    } catch (err) { console.error("Failed to fetch students") }
  }, [])

  useEffect(() => {
    fetchSessions()
    fetchPassages()
    fetchDoctorStudents() // Fetch students on load
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [fetchSessions, fetchPassages, fetchDoctorStudents])

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

  const handleGradeChange = (grade: string) => {
    setNewGrade(grade)
    if (grade === 'الصف الأول' || grade === 'الصف الثاني') setQuestions(buildEmptyQuestions(4))
    else if (grade === 'الصف الثالث' || grade === 'الصف الرابع') setQuestions(buildEmptyQuestions(5))
    else if (grade === 'الصف الخامس' || grade === 'الصف السادس') setQuestions(buildEmptyQuestions(6))
  }

  const handleQuestionChange = (index: number, field: string, value: string) => {
    const newQuestions = [...questions]
    newQuestions[index][field] = value
    setQuestions(newQuestions)
  }

  const handleGenerateAI = async () => {
    setIsGenerating(true)
    try {
      const token = localStorage.getItem('token')
      const payload = { grade_level: newGrade, num_questions: questions.length }
      const res = await axios.post('https://reading-ai-platform.onrender.com/api/passages/generate', payload, { headers: { Authorization: `Bearer ${token}` } })
      setNewPassage(res.data.text)
      setQuestions(res.data.questions)
    } catch (err: any) {
      console.error("AI Generation Error:", err.response?.data)
      alert('Failed to generate passage. Check console for details.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAnalyzeReadability = async () => {
    if (!newPassage) return alert('Please type a passage first.')
    setIsAnalyzing(true)
    const token = localStorage.getItem('token')
    try {
      const formData = new FormData()
      formData.append('text', newPassage)
      const res = await axios.post('https://reading-ai-platform.onrender.com/api/analyze-readability', formData, { headers: { Authorization: `Bearer ${token}` } })
      setReadabilityScore(res.data)
    } catch (err) {
      alert('Failed to analyze text.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAddPassage = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const formData = new FormData()
      formData.append('text', newPassage)
      formData.append('level', newGrade)
      formData.append('questions_data', JSON.stringify(questions))
      
      // NEW: Append assigned_to
      if (assignedTo) {
        formData.append('assigned_to', assignedTo)
      }

      await axios.post('https://reading-ai-platform.onrender.com/api/passages', formData, { headers: { Authorization: `Bearer ${token}` } })
      
      setNewPassage(''); setNewGrade('الصف الأول'); setQuestions(buildEmptyQuestions(4))
      setShowPassageForm(false)
      setReadabilityScore(null) 
      setAssignedTo("") // Reset assignment
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

  const handleGenerateFeedback = async (sessionId: string) => {
    setGeneratingFeedback(sessionId)
    const token = localStorage.getItem('token')
    try {
      const res = await axios.post(`https://reading-ai-platform.onrender.com/api/sessions/${sessionId}/feedback`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setFeedback({ ...feedback, [sessionId]: res.data.feedback })
    } catch (err) {
      alert('Failed to generate feedback.')
    } finally {
      setGeneratingFeedback(null)
    }
  }

  const handlePrintReport = (studentName: string) => {
    const studentSessions = sessions.filter((s: any) => s.student_username === studentName);
    const avgAccuracy = studentSessions.length > 0 ? (studentSessions.reduce((acc: number, s: any) => acc + s.accuracy_percent, 0) / studentSessions.length).toFixed(1) : 0;
    const avgWpm = studentSessions.length > 0 ? Math.round(studentSessions.reduce((acc: number, s: any) => acc + s.wpm, 0) / studentSessions.length) : 0;
    
    const reportHtml = `
      <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير طالب: ${studentName}</title>
      <style>body{font-family:'Segoe UI',Tahoma,sans-serif;padding:40px;color:#333}h1{color:#7e22ce;border-bottom:2px solid #e9d5ff;padding-bottom:10px}.stats{display:flex;gap:20px;margin-bottom:20px}.stat-box{background:#f8f5ff;padding:15px;border-radius:8px;border:1px solid #e9d5ff;flex:1;text-align:center}.stat-box h3{margin:0;color:#6b21a8;font-size:14px}.stat-box p{margin:5px 0 0;font-size:24px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:right;font-size:12px}th{background:#f8f5ff;color:#6b21a8}</style>
      </head><body><h1>تقرير تقدم الطالب: ${studentName}</h1>
      <div class="stats"><div class="stat-box"><h3>إجمالي الجلسات</h3><p>${studentSessions.length}</p></div><div class="stat-box"><h3>متوسط الدقة</h3><p>${avgAccuracy}%</p></div><div class="stat-box"><h3>متوسط السرعة</h3><p>${avgWpm} WPM</p></div></div>
      <h3>سجل الجلسات:</h3><table><thead><tr><th>التاريخ</th><th>الدقة</th><th>السرعة</th><th>الفهم</th><th>الأخطاء</th></tr></thead><tbody>
      ${studentSessions.map((s: any) => `<tr><td>${new Date(s.session_date).toLocaleDateString()}</td><td>${s.accuracy_percent}%</td><td>${s.wpm}</td><td>${s.comprehension_score}</td><td>${s.error_tags}</td></tr>`).join('')}
      </tbody></table><script>window.onload=function(){window.print()}</script></body></html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(reportHtml); printWindow.document.close(); }
  };

  const uniqueStudents = [...new Set(sessions.map((s: any) => s.student_username))]
  const filteredSessions = selectedStudent ? sessions.filter((s: any) => s.student_username === selectedStudent) : sessions
  const chartData = filteredSessions.map((s: any) => ({ name: s.student_username, accuracy: s.accuracy_percent, wpm: s.wpm }))
  
  const studentProgressData = sessions
    .filter((s: any) => s.student_username === selectedStudent)
    .map((s: any) => ({ name: new Date(s.session_date).toLocaleDateString(), accuracy: s.accuracy_percent, wpm: s.wpm }))
    .reverse()

  const errorTypeCounts: { [key: string]: number } = { "حذف": 0, "إبدال": 0, "إضافة": 0 }
  filteredSessions.forEach((s: any) => {
    if (s.error_tags && s.error_tags !== "لا توجد أخطاء") {
      s.error_tags.split(';').forEach((item: string) => {
        const type = item.split(':')[0]
        if (type && errorTypeCounts.hasOwnProperty(type)) {
          errorTypeCounts[type]++
        }
      })
    }
  })
  const pieData = Object.entries(errorTypeCounts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
  const PIE_COLORS = ['#ef4444', '#f59e0b', '#3b82f6'] 

  const grades = ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس']

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 tracking-tight">لوحة تحكم الدكتورة</h1>
          <p className="text-purple-500 text-xs font-medium">
            {view === 'overview' ? 'نظرة شاملة على أداء الطلاب' : view === 'student' ? `تقدم الطالب: ${selectedStudent}` : 'إدارة النصوص القرائية'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {view !== 'overview' && (
            <button onClick={() => { setView('overview'); setSelectedStudent(null) }} className="bg-white/50 border border-white/60 text-purple-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-white/80 transition">
              ⬅️ رجوع للقائمة
            </button>
          )}
          <button onClick={() => { setView('passages'); setShowPassageForm(false) }} className="bg-white/50 border border-white/60 text-purple-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-white/80 transition">📄 النصوص</button>
          <button onClick={handleExport} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow hover:scale-105 transition">⬇️ Excel</button>
        </div>
      </header>

      {view === 'overview' && (
        <>
          {/* Student Smart Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {uniqueStudents.length === 0 ? (
              <p className="text-purple-400 text-sm col-span-full text-center py-8">لا يوجد طلاب مسجلون بعد.</p>
            ) : (
              uniqueStudents.map((student: any) => {
                const studentSessions = sessions.filter((s: any) => s.student_username === student)
                const avgAcc = (studentSessions.reduce((acc: number, s: any) => acc + s.accuracy_percent, 0) / studentSessions.length).toFixed(0)
                return (
                  <button key={student} onClick={() => { setSelectedStudent(student); setView('student') }} className="bg-white/80 p-4 rounded-xl shadow-sm hover:scale-105 transition text-right border border-purple-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-purple-900">{student}</span>
                      <span className="text-2xl">👤</span>
                    </div>
                    <p className="text-[10px] text-gray-500">الجلسات: {studentSessions.length}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">متوسط الدقة: {avgAcc}%</p>
                  </button>
                )
              })
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white/80 p-4 rounded-xl shadow-sm">
              <h2 className="text-sm font-bold mb-2 text-purple-900">رسم بياني عام لأداء الطلاب</h2>
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
              <h2 className="text-sm font-bold mb-2 text-purple-900">تحليل أنواع الأخطاء (Miscue Analysis)</h2>
              <div className="w-full h-40" dir="rtl">
                {pieData.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs mt-16">لا توجد أخطاء مسجلة بعد.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} fill="#8884d8">
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #d8b4fe', borderRadius: '8px', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Student Deep Dive View (Evaluations) */}
      {view === 'student' && selectedStudent && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => handlePrintReport(selectedStudent)} className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow hover:scale-105 transition">
              🖨️ طباعة تقرير PDF
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/80 p-3 rounded-xl shadow-sm">
              <h3 className="text-[10px] font-bold text-purple-700 uppercase">جلسات الطالب</h3>
              <p className="text-xl font-extrabold text-indigo-600 mt-1">{filteredSessions.length}</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl shadow-sm">
              <h3 className="text-[10px] font-bold text-pink-700 uppercase">متوسط الدقة</h3>
              <p className="text-xl font-extrabold text-pink-600 mt-1">{filteredSessions.length > 0 ? (filteredSessions.reduce((acc: number, s: any) => acc + s.accuracy_percent, 0) / filteredSessions.length).toFixed(1) : 0}%</p>
            </div>
            <div className="bg-white/80 p-3 rounded-xl shadow-sm">
              <h3 className="text-[10px] font-bold text-cyan-700 uppercase">متوسط السرعة</h3>
              <p className="text-xl font-extrabold text-cyan-600 mt-1">{filteredSessions.length > 0 ? Math.round(filteredSessions.reduce((acc: number, s: any) => acc + s.wpm, 0) / filteredSessions.length) : 0} <span className="text-[10px] text-purple-400">WPM</span></p>
            </div>
          </div>

          <div className="bg-white/80 p-4 rounded-xl shadow-sm mb-4">
            <h2 className="text-sm font-bold mb-2 text-purple-900">تقدم الطالب</h2>
            <div className="w-full h-56" dir="rtl">
              {studentProgressData.length === 0 ? (
                <p className="text-center text-gray-400 text-xs mt-20">لا توجد بيانات كافية لرسم التقدم.</p>
              ) : (
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
              )}
            </div>
          </div>

          {/* Evaluation Table */}
          <div className="bg-white/80 p-4 rounded-xl shadow-sm mb-4">
            <h2 className="text-sm font-bold mb-4 text-purple-900">سجل جلسات {selectedStudent}</h2>
            <div className="overflow-x-auto w-full" dir="rtl">
              <table className="w-full text-right border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-purple-100">
                    <th className="w-[10%] py-3 px-3 text-xs font-bold text-purple-700">الدقة</th>
                    <th className="w-[10%] py-3 px-3 text-xs font-bold text-purple-700">السرعة</th>
                    <th className="w-[10%] py-3 px-3 text-xs font-bold text-purple-700">الفهم</th>
                    <th className="w-[20%] py-3 px-3 text-xs font-bold text-purple-700">الأخطاء</th>
                    <th className="w-[40%] py-3 px-3 text-xs font-bold text-purple-700">النص والصوت</th>
                    <th className="w-[10%] py-3 px-3 text-xs font-bold text-purple-700">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-purple-400 text-xs">لا توجد جلسات لهذا الطالب.</td></tr>
                  ) : (
                    filteredSessions.map((session: any) => {
                      const accColor = session.accuracy_percent > 85 ? 'bg-emerald-100 text-emerald-700' : session.accuracy_percent > 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                      return (
                        <tr key={session.session_id} className="border-b border-purple-50 hover:bg-white/60 align-top">
                          <td className="py-3 px-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${accColor}`}>{session.accuracy_percent}%</span></td>
                          <td className="py-3 px-3 text-purple-600 font-bold text-xs whitespace-nowrap">{session.wpm} WPM</td>
                          <td className="py-3 px-3"><span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">{session.comprehension_score}</span></td>
                          <td className="py-3 px-3 text-red-500 text-xs leading-relaxed break-words">{session.error_tags}</td>
                          <td className="py-3 px-3 text-purple-500 text-xs leading-relaxed">
                            <div className="bg-white/60 rounded-md p-2 border border-purple-50 break-words">
                              <p className="italic mb-2 block">"{session.asr_transcript}"</p>
                              {session.audio_file_id && (<WaveformPlayer audioUrl={session.audio_file_id} />)}
                              
                              {feedback[session.session_id] && (
                                <div className="mt-2 bg-indigo-50 p-2 rounded-md border border-indigo-100 text-indigo-800 text-[10px] leading-relaxed">
                                  <span className="font-bold">تقرير الذكاء الاصطناعي: </span>
                                  {feedback[session.session_id]}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col gap-2 items-center">
                              <button onClick={() => handleGenerateFeedback(session.session_id)} disabled={generatingFeedback === session.session_id} className="bg-indigo-500 text-white px-2 py-1 rounded-lg text-[10px] hover:bg-indigo-600 disabled:opacity-50 w-full">
                                {generatingFeedback === session.session_id ? '⏳...' : '🤖 تقرير AI'}
                              </button>
                              <button onClick={() => handleDeleteSession(session.session_id)} className="text-red-500 hover:text-red-700 text-lg">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Passages View with Interactive Grade Folders */}
      {view === 'passages' && (
        <div className="bg-white/80 border border-purple-200 p-4 rounded-xl shadow-lg mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-purple-900">إدارة النصوص حسب الصف</h3>
            <button onClick={() => setShowPassageForm(!showPassageForm)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-purple-700 transition">➕ إضافة نص جديد</button>
          </div>

          {showPassageForm && (
            <div className="border border-purple-100 p-3 rounded-lg mb-4 bg-purple-50/50">
              <form onSubmit={handleAddPassage} className="flex flex-col gap-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-purple-800 mb-1">الصف الدراسي</label>
                    <select value={newGrade} onChange={(e) => handleGradeChange(e.target.value)} className="w-full p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required>
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  
                  {/* NEW: Assignment Dropdown */}
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-purple-800 mb-1">إرسال إلى</label>
                    <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900">
                      <option value="">الجميع (Everyone)</option>
                      {doctorStudents.map((s) => (
                        <option key={s.id} value={s.id}>{s.username}</option>
                      ))}
                    </select>
                  </div>

                  <button type="button" onClick={handleGenerateAI} disabled={isGenerating} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-md font-bold text-xs hover:scale-105 transition disabled:opacity-50">
                    {isGenerating ? '⏳ جارٍ التوليد...' : '✨ توليد بالذكاء الاصطناعي'}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-800 mb-1">نص القراءة</label>
                  <textarea value={newPassage} onChange={(e) => setNewPassage(e.target.value)} placeholder="اكتب النص هنا أو اضغط توليد بالذكاء الاصطناعي..." className="p-2 rounded-lg bg-white border border-purple-100 focus:ring-1 focus:ring-purple-400 h-20 text-xs text-gray-900 w-full" required />
                  
                  {/* Readability Analysis UI */}
                  <div className="flex items-center gap-2 mt-2">
                    <button type="button" onClick={handleAnalyzeReadability} disabled={isAnalyzing} className="bg-cyan-600 text-white px-3 py-1.5 rounded-md font-bold text-[10px] hover:bg-cyan-700 transition disabled:opacity-50">
                      {isAnalyzing ? '⏳ جارٍ التحليل...' : '🔍 تحليل صعوبة النص'}
                    </button>
                    {readabilityScore && (
                      <div className="flex items-center gap-3 bg-cyan-50 p-2 rounded-md border border-cyan-100 flex-1">
                        <div className="text-center">
                          <p className="text-xl font-extrabold text-cyan-700 leading-none">{readabilityScore.score}/10</p>
                          <p className="text-[8px] text-gray-500 font-bold">درجة الصعوبة</p>
                        </div>
                        <div className="border-r border-cyan-200 pr-3">
                          <p className="text-[10px] font-bold text-cyan-800">{readabilityScore.level}</p>
                          <p className="text-[8px] text-gray-500">كلمات: {readabilityScore.stats.word_count} | جمل: {readabilityScore.stats.sentence_count}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {questions.map((q, idx) => (
                  <div key={idx} className="border-t pt-2">
                    <h4 className="font-bold text-purple-800 text-sm mb-2">السؤال {idx + 1}</h4>
                    <input value={q.q} onChange={(e) => handleQuestionChange(idx, 'q', e.target.value)} placeholder="نص السؤال" className="w-full p-2 mb-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input value={q.o1} onChange={(e) => handleQuestionChange(idx, 'o1', e.target.value)} placeholder="الخيار 1" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                      <input value={q.o2} onChange={(e) => handleQuestionChange(idx, 'o2', e.target.value)} placeholder="الخيار 2" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                      <input value={q.o3} onChange={(e) => handleQuestionChange(idx, 'o3', e.target.value)} placeholder="الخيار 3" className="p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
                      <input value={q.ans} onChange={(e) => handleQuestionChange(idx, 'ans', e.target.value)} placeholder="الإجابة الصحيحة" className="p-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-gray-900" required />
                    </div>
                  </div>
                ))}
                
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold w-fit text-xs hover:bg-purple-700 transition mt-2">حفظ النص والأسئلة</button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {grades.map(grade => {
              const count = passages.filter(p => p.level === grade).length;
              const isExpanded = expandedGrade === grade;
              return (
                <div key={grade} className={`border rounded-xl overflow-hidden shadow-sm transition-all ${isExpanded ? 'border-purple-400 md:col-span-3' : 'border-purple-100 bg-white'}`}>
                  <button 
                    onClick={() => setExpandedGrade(isExpanded ? null : grade)} 
                    className={`w-full flex justify-between items-center p-3 transition ${isExpanded ? 'bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{isExpanded ? '📂' : '📁'}</span>
                      <span className="font-bold text-sm text-purple-800">{grade}</span>
                    </div>
                    <span className="text-[10px] bg-purple-200 text-purple-800 rounded-full px-2 py-0.5 font-bold">{count} نص</span>
                  </button>
                  
                  {isExpanded && (
                    <div className="divide-y divide-purple-50 p-2 bg-white">
                      {count === 0 ? (
                        <p className="text-xs text-gray-400 p-3 text-center">لا توجد نصوص في هذا الصف بعد.</p>
                      ) : (
                        passages.filter(p => p.level === grade).map(p => (
                          <div key={p.id} className="flex justify-between items-center p-2 bg-white hover:bg-purple-50/30 transition">
                            <div className="flex flex-col">
                              <span className="text-xs text-gray-800 font-medium max-w-[80%] truncate">{p.text}</span>
                              {p.assigned_to && (
                                <span className="text-[10px] text-indigo-500 font-bold mt-1">مخصص لطالب معين</span>
                              )}
                            </div>
                            <button onClick={() => handleDeletePassage(p.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">🗑️ حذف</button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
