'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

export default function StudentReadingPage() {
  const [phase, setPhase] = useState<'select' | 'reading' | 'quiz' | 'done'>('select')
  const [passages, setPassages] = useState([])
  const [selectedPassage, setSelectedPassage] = useState('')
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('https://reading-ai-platform.onrender.com/api/passages', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setPassages(res.data))
        .catch(err => console.error(err))
    }
  }, [])

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        mediaRecorder.onstop = () => {
          setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
          setStatus('تم التسجيل. اضغط "التالي" للانتقال إلى الاختبار')
        }
        mediaRecorder.start()
        setIsRecording(true)
        setStatus('جارٍ التسجيل... اقرأ النص بصوت واضح')
      })
      .catch(() => setStatus('خطأ: لا يمكن الوصول إلى الميكروفون'))
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const sendForEvaluation = async () => {
    if (!audioBlob || isSubmitting) return
    const token = localStorage.getItem('token')
    setIsSubmitting(true)
    setStatus('جارٍ الإرسال والتقييم...')
    
    let correct = 0
    if (q1 === 'الحديقة') correct++ // Mock quiz answers based on default passage
    if (q2 === 'أحمد') correct++
    const score = `${correct}/2`

    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('passage', selectedPassage)
    formData.append('comprehension_score', score)

    try {
      const res = await axios.post('https://reading-ai-platform.onrender.com/api/sessions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
      })
      setStatus(`تم التقييم! الدقة: ${res.data.accuracy}%`)
      setPhase('done')
    } catch (err) {
      setStatus('حدث خطأ أثناء الإرسال.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-10 flex flex-col items-center w-full">
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl max-w-2xl w-full">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 text-center mb-8">حصة القراءة</h1>
        
        {phase === 'select' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-center text-purple-900">اختر النص للقراءة</h2>
            {passages.map((p: any) => (
              <button key={p.id} onClick={() => { setSelectedPassage(p.text); setPhase('reading') }} className="bg-white/70 hover:bg-white border border-purple-100 p-4 rounded-2xl text-right transition">
                <span className="text-xs text-purple-500 block">{p.level}</span>
                <span className="text-purple-800 font-medium">{p.text.substring(0, 50)}...</span>
              </button>
            ))}
            {passages.length === 0 && <p className="text-center text-purple-400">لا توجد نصوص متاحة حالياً.</p>}
          </div>
        )}

        {phase === 'reading' && (
          <>
            <div className="bg-purple-50/60 border border-purple-100 p-6 rounded-2xl mb-8 text-center">
              <p className="text-xl leading-loose text-purple-900 font-medium">{selectedPassage}</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <p className="text-purple-700 font-bold">{status}</p>
              {!isRecording ? (
                <button onClick={startRecording} className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition">ابدأ التسجيل 🎤</button>
              ) : (
                <button onClick={stopRecording} className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg animate-pulse transition">إيقاف التسجيل ⏹️</button>
              )}
              {audioBlob && !isRecording && (
                <button onClick={() => setPhase('quiz')} className="bg-slate-800/80 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-700 transition">التالي: اختبار الفهم 📝</button>
              )}
            </div>
          </>
        )}

        {phase === 'quiz' && (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-purple-900">اختبار الفهم القرائي</h2>
            <div className="flex flex-col gap-8">
              <div>
                <p className="font-bold mb-3 text-purple-800">1. أين ذهب أحمد؟</p>
                <div className="flex gap-4 flex-wrap">
                  <button onClick={() => setQ1('المدرسة')} className={`px-5 py-2 rounded-xl border ${q1==='المدرسة' ? 'bg-purple-600 text-white' : 'bg-white/50'}`}>المدرسة</button>
                  <button onClick={() => setQ1('الحديقة')} className={`px-5 py-2 rounded-xl border ${q1==='الحديقة' ? 'bg-purple-600 text-white' : 'bg-white/50'}`}>الحديقة</button>
                  <button onClick={() => setQ1('المنزل')} className={`px-5 py-2 rounded-xl border ${q1==='المنزل' ? 'bg-purple-600 text-white' : 'bg-white/50'}`}>المنزل</button>
                </div>
              </div>
              <div>
                <p className="font-bold mb-3 text-purple-800">2. من هو بطل القصة؟</p>
                <div className="flex gap-4 flex-wrap">
                  <button onClick={() => setQ2('أحمد')} className={`px-5 py-2 rounded-xl border ${q2==='أحمد' ? 'bg-purple-600 text-white' : 'bg-white/50'}`}>أحمد</button>
                  <button onClick={() => setQ2('خالد')} className={`px-5 py-2 rounded-xl border ${q2==='خالد' ? 'bg-purple-600 text-white' : 'bg-white/50'}`}>خالد</button>
                  <button onClick={() => setQ2('علي')} className={`px-5 py-2 rounded-xl border ${q2==='علي' ? 'bg-purple-600 text-white' : 'bg-white/50'}`}>علي</button>
                </div>
              </div>
              <button onClick={sendForEvaluation} disabled={isSubmitting} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition disabled:opacity-50">
                {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الإجابات والتقييم ✅'}
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-purple-700 mb-4">أحسنت! لقد أكملت الحصة</h2>
            <p className="text-pink-600 font-semibold mb-6">{status}</p>
          </div>
        )}
      </div>
    </div>
  )
}