'use client'

import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

export default function StudentReadingPage() {
  const [phase, setPhase] = useState<'select' | 'reading' | 'quiz' | 'done' | 'practice' | 'dictionary'>('select')
  const [passages, setPassages] = useState([])
  const [selectedPassage, setSelectedPassage] = useState<any>(null)
  
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // State for accurate WPM
  const [recordingDuration, setRecordingDuration] = useState(0)
  const startTimeRef = useRef<number | null>(null)

  const [ans1, setAns1] = useState('')
  const [ans2, setAns2] = useState('')
  const [wordAnalysis, setWordAnalysis] = useState<any[]>([])
  const [earnedStars, setEarnedStars] = useState(0)
  
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([])
  const [practiceAnswers, setPracticeAnswers] = useState<string[]>([])
  const [errorWords, setErrorWords] = useState<string[]>([])

  // Gamification Stats
  const [stats, setStats] = useState<any>(null)

  // Font Size State
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')

  // NEW: Word Bank State
  const [wordbank, setWordbank] = useState<any>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('https://reading-ai-platform.onrender.com/api/passages', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setPassages(res.data))
        .catch(err => console.error(err))

      axios.get('https://reading-ai-platform.onrender.com/api/student/stats', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setStats(res.data))
        .catch(err => console.error(err))

      // NEW: Fetch Wordbank
      axios.get('https://reading-ai-platform.onrender.com/api/student/wordbank', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setWordbank(res.data))
        .catch(err => console.error(err))
    }
  }, [])

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        let options = { mimeType: 'audio/webm' };
        if (!MediaRecorder.isTypeSupported('audio/webm')) { options = { mimeType: 'audio/mp4' }; }
        const mediaRecorder = new MediaRecorder(stream, options)
        mediaRecorderRef.current = mediaRecorder
        chunksRef.current = []
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType })
          setAudioBlob(blob)
          setStatus('تم التسجيل. اضغط "التالي" للانتقال إلى الاختبار')
          stream.getTracks().forEach(track => track.stop())
          
          if (startTimeRef.current) {
            const durationInSec = (Date.now() - startTimeRef.current) / 1000
            setRecordingDuration(durationInSec)
          }
        }
        startTimeRef.current = Date.now()
        mediaRecorder.start(1000)
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
    if (!audioBlob || isSubmitting || !selectedPassage) return
    const token = localStorage.getItem('token')
    setIsSubmitting(true)
    setStatus('جارٍ الإرسال والتقييم...')
    
    let correct = 0
    if (ans1 === selectedPassage.answer1) correct++
    if (ans2 === selectedPassage.answer2) correct++
    const score = `${correct}/2`

    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('passage', selectedPassage.text)
    formData.append('comprehension_score', score)
    formData.append('duration_seconds', recordingDuration.toString())

    try {
      const res = await axios.post('https://reading-ai-platform.onrender.com/api/sessions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${token}` }
      })
      setStatus(`تم التقييم! الدقة: ${res.data.accuracy}%`)
      setWordAnalysis(res.data.word_analysis)
      setEarnedStars(res.data.stars)
      
      const mistakes = res.data.word_analysis.filter((w: any) => w.status !== 'correct').map((w: any) => w.word)
      setErrorWords(mistakes)
      
      // Refresh wordbank after evaluation
      axios.get('https://reading-ai-platform.onrender.com/api/student/wordbank', { headers: { Authorization: `Bearer ${token}` } })
        .then(res2 => setWordbank(res2.data))
        .catch(err => console.error(err))

      setPhase('done')
    } catch (err) {
      setStatus('حدث خطأ أثناء الإرسال.')
      setIsSubmitting(false)
    }
  }

  const startPractice = () => {
    if (errorWords.length === 0) {
      alert('أحسنت! ليس لديك أخطاء للتدرب عليها.')
      return
    }
    
    const allWords = wordAnalysis.map((w: any) => w.word)
    const questions = errorWords.slice(0, 3).map((targetWord) => {
      const distractors = allWords.filter(w => w !== targetWord).sort(() => 0.5 - Math.random()).slice(0, 2)
      const options = [targetWord, ...distractors].sort(() => 0.5 - Math.random())
      
      return {
        question: "استمع جيداً واختر الكلمة الصحيحة",
        audioWord: targetWord,
        options: options,
        answer: targetWord
      }
    })
    
    setPracticeQuestions(questions)
    setPracticeAnswers([])
    setPhase('practice')
  }

  const speakWord = async (word: string) => {
    try {
      const formData = new FormData()
      formData.append('text', word)
      
      const res = await axios.post('https://reading-ai-platform.onrender.com/api/tts', formData, {
        responseType: 'blob'
      })
      
      const audioUrl = URL.createObjectURL(res.data)
      const audio = new Audio(audioUrl)
      audio.play()
    } catch (err) {
      console.error("TTS Error, falling back to browser voice", err)
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word)
        utterance.lang = 'ar-SA'
        utterance.rate = 0.8
        window.speechSynthesis.speak(utterance)
      }
    }
  }

  const handleGoHome = () => {
    setPhase('select')
    setSelectedPassage(null)
    setAudioBlob(null)
    setStatus('')
    setAns1('')
    setAns2('')
    setWordAnalysis([])
    setEarnedStars(0)
    setErrorWords([])
    setPracticeQuestions([])
    setPracticeAnswers([])
    setRecordingDuration(0)
  }

  return (
    <div className="p-10 flex flex-col items-center w-full">
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl max-w-2xl w-full">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 text-center mb-4">حصة القراءة</h1>
        
        {/* Font Size Adjuster */}
        <div className="flex justify-end gap-1 mb-4">
          <button 
            onClick={() => setFontSize('small')} 
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${fontSize === 'small' ? 'bg-purple-600 text-white' : 'bg-white/60 text-purple-600 border border-purple-200'}`}
          >
            أ-
          </button>
          <button 
            onClick={() => setFontSize('medium')} 
            className={`px-3 py-1 rounded-lg text-sm font-bold transition ${fontSize === 'medium' ? 'bg-purple-600 text-white' : 'bg-white/60 text-purple-600 border border-purple-200'}`}
          >
            أ
          </button>
          <button 
            onClick={() => setFontSize('large')} 
            className={`px-3 py-1 rounded-lg text-base font-bold transition ${fontSize === 'large' ? 'bg-purple-600 text-white' : 'bg-white/60 text-purple-600 border border-purple-200'}`}
          >
            أ+
          </button>
        </div>

        {phase === 'select' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-center text-gray-900">اختر النص للقراءة</h2>
            
            {/* Gamification Stats UI */}
            {stats && (
              <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl mb-4">
                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div>
                    <p className="text-2xl font-extrabold text-purple-600">{stats.streak}</p>
                    <p className="text-[10px] text-gray-500 font-bold">أيام متتالية 🔥</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-pink-600">{stats.max_wpm}</p>
                    <p className="text-[10px] text-gray-500 font-bold">أعلى سرعة 🚀</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-emerald-600">{stats.max_accuracy}%</p>
                    <p className="text-[10px] text-gray-500 font-bold">أعلى دقة 🎯</p>
                  </div>
                </div>
                
                <h3 className="text-sm font-bold text-gray-900 mb-2 text-center">إنجازاتك 🏆</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {stats.badges.length > 0 ? (
                    stats.badges.map((badge: any, idx: number) => (
                      <div key={idx} className="bg-white p-2 rounded-xl shadow-sm border border-yellow-100 flex flex-col items-center w-20">
                        <span className="text-2xl">{badge.icon}</span>
                        <span className="text-[10px] font-bold text-gray-800 mt-1 text-center">{badge.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 text-center">لا توجد أوسمة بعد. استمر في القراءة لكسب الأوسمة!</p>
                  )}
                </div>
              </div>
            )}

            {/* NEW: Dictionary Button */}
            <button onClick={() => setPhase('dictionary')} className="bg-white/60 border border-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold text-xs hover:bg-white/80 transition mb-4">
              📚 قاموسي (My Dictionary)
            </button>

            {passages.map((p: any) => (
              <button key={p.id} onClick={() => { setSelectedPassage(p); setPhase('reading') }} className="bg-white hover:bg-gray-50 border border-purple-100 p-4 rounded-2xl text-right transition">
                <span className="text-xs text-purple-600 block font-bold">{p.level}</span>
                <span className="text-gray-900 font-medium">{p.text.substring(0, 50)}...</span>
              </button>
            ))}
            {passages.length === 0 && <p className="text-center text-gray-500 font-medium">لا توجد نصوص متاحة حالياً.</p>}
          </div>
        )}

        {/* NEW: Dictionary Phase */}
        {phase === 'dictionary' && (
          <div className="flex flex-col gap-4">
            <button onClick={() => setPhase('select')} className="text-purple-600 text-xs font-bold self-start hover:underline mb-2">
              ⬅️ رجوع لاختيار النص
            </button>
            <h2 className="text-xl font-bold text-center text-gray-900">قاموسي 📚</h2>
            
            {wordbank && (
              <>
                {/* Mastered Words */}
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                  <h3 className="text-sm font-bold text-emerald-700 mb-3">كلمات أتقنتها ✅ ({wordbank.mastered.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {wordbank.mastered.length > 0 ? (
                      wordbank.mastered.map((w: any, idx: number) => (
                        <span key={idx} className="bg-white px-3 py-1 rounded-lg text-sm font-bold text-emerald-600 border border-emerald-200">{w.word}</span>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">لم تتقن أي كلمات بعد. اقرأ بشكل صحيح 3 مرات لتتقن الكلمة!</p>
                    )}
                  </div>
                </div>

                {/* Practicing Words */}
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                  <h3 className="text-sm font-bold text-amber-700 mb-3">كلمات أتدرب عليها 🔄 ({wordbank.practicing.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {wordbank.practicing.length > 0 ? (
                      wordbank.practicing.map((w: any, idx: number) => (
                        <span key={idx} className="bg-white px-3 py-1 rounded-lg text-sm font-bold text-amber-600 border border-amber-200">{w.word}</span>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">لا توجد كلمات قيد التدرب حالياً.</p>
                    )}
                  </div>
                </div>

                {/* Struggling Words */}
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                  <h3 className="text-sm font-bold text-red-700 mb-3">كلمات أحتاج لمساعدة فيها ❌ ({wordbank.struggling.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {wordbank.struggling.length > 0 ? (
                      wordbank.struggling.map((w: any, idx: number) => (
                        <span key={idx} className="bg-white px-3 py-1 rounded-lg text-sm font-bold text-red-600 border border-red-200">{w.word}</span>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">أحسنت! لا توجد كلمات صعبة حالياً.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {phase === 'reading' && selectedPassage && (
          <>
            <div className="bg-purple-50 border border-purple-100 p-6 rounded-2xl mb-8 text-center">
              <p className={`${fontSize === 'small' ? 'text-lg' : fontSize === 'medium' ? 'text-2xl' : 'text-4xl'} leading-loose text-gray-900 font-medium`}>{selectedPassage.text}</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <p className="text-purple-700 font-bold">{status}</p>
              {!isRecording ? (
                <button onClick={startRecording} className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition">ابدأ التسجيل 🎤</button>
              ) : (
                <button onClick={stopRecording} className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg animate-pulse transition">إيقاف التسجيل ⏹️</button>
              )}
              {audioBlob && !isRecording && (
                <button onClick={() => setPhase('quiz')} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-700 transition">التالي: اختبار الفهم 📝</button>
              )}
            </div>
          </>
        )}

        {phase === 'quiz' && selectedPassage && (
          <>
            <h2 className="text-xl font-bold mb-6 text-center text-gray-900">اختبار الفهم القرائي</h2>
            <div className="flex flex-col gap-8">
              <div>
                <p className={`${fontSize === 'small' ? 'text-base' : fontSize === 'medium' ? 'text-xl' : 'text-3xl'} font-bold mb-3 text-gray-900`}>1. {selectedPassage.question1}</p>
                <div className="flex gap-4 flex-wrap">
                  <button onClick={() => setAns1(selectedPassage.option1a)} className={`px-5 py-2 rounded-xl border font-bold ${ans1===selectedPassage.option1a ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border-purple-200'}`}>{selectedPassage.option1a}</button>
                  <button onClick={() => setAns1(selectedPassage.option1b)} className={`px-5 py-2 rounded-xl border font-bold ${ans1===selectedPassage.option1b ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border-purple-200'}`}>{selectedPassage.option1b}</button>
                  <button onClick={() => setAns1(selectedPassage.option1c)} className={`px-5 py-2 rounded-xl border font-bold ${ans1===selectedPassage.option1c ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border-purple-200'}`}>{selectedPassage.option1c}</button>
                </div>
              </div>
              <div>
                <p className={`${fontSize === 'small' ? 'text-base' : fontSize === 'medium' ? 'text-xl' : 'text-3xl'} font-bold mb-3 text-gray-900`}>2. {selectedPassage.question2}</p>
                <div className="flex gap-4 flex-wrap">
                  <button onClick={() => setAns2(selectedPassage.option2a)} className={`px-5 py-2 rounded-xl border font-bold ${ans2===selectedPassage.option2a ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border-purple-200'}`}>{selectedPassage.option2a}</button>
                  <button onClick={() => setAns2(selectedPassage.option2b)} className={`px-5 py-2 rounded-xl border font-bold ${ans2===selectedPassage.option2b ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border-purple-200'}`}>{selectedPassage.option2b}</button>
                  <button onClick={() => setAns2(selectedPassage.option2c)} className={`px-5 py-2 rounded-xl border font-bold ${ans2===selectedPassage.option2c ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border-purple-200'}`}>{selectedPassage.option2c}</button>
                </div>
              </div>
              <button onClick={sendForEvaluation} disabled={isSubmitting} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition disabled:opacity-50">
                {isSubmitting ? 'جارٍ الإرسال...' : 'إرسال الإجابات والتقييم ✅'}
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">أحسنت! لقد أكملت الحصة</h2>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map((i) => (
                <span key={i} className={`text-4xl transition-all duration-500 ${i <= earnedStars ? 'opacity-100 scale-100' : 'opacity-20 scale-90'}`}>
                  ⭐
                </span>
              ))}
            </div>

            <p className="text-pink-600 font-bold mb-8">{status}</p>
            <div className="bg-purple-50 border border-purple-100 p-6 rounded-2xl mb-6 text-right" dir="rtl">
              <h3 className="font-bold text-gray-900 mb-3 text-center">مراجعة الكلمات:</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {wordAnalysis.map((item, idx) => (
                  <button key={idx} onClick={() => speakWord(item.word)} className={`px-3 py-1 rounded-lg text-lg font-bold transition hover:scale-105 ${item.status === 'correct' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>{item.word} 🔊</button>
                ))}
              </div>
            </div>
            
            {errorWords.length > 0 && (
              <button onClick={startPractice} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition mt-4">
                🧠 تدرب على أخطائك
              </button>
            )}
            
            <button onClick={handleGoHome} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-700 transition mt-4">
              العودة لاختيار نص جديد 🏠
            </button>
          </div>
        )}

        {phase === 'practice' && (
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">تمرين العلاج الذكي 🤖</h2>
            <div className="flex flex-col gap-8 text-right">
              {practiceQuestions.map((q, idx) => (
                <div key={idx} className="text-center">
                  <p className="font-bold mb-3 text-gray-900">{idx + 1}. {q.question}</p>
                  <button 
                    onClick={() => speakWord(q.audioWord)} 
                    className="bg-purple-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 transition mb-4 animate-pulse"
                  >
                    🔊 استمع للكلمة
                  </button>
                  <div className="flex gap-4 flex-wrap justify-center">
                    {q.options.map((opt: string, i: number) => (
                      <button 
                        key={i} 
                        onClick={() => {
                          const newAnswers = [...practiceAnswers]
                          newAnswers[idx] = opt
                          setPracticeAnswers(newAnswers)
                        }} 
                        className={`px-5 py-2 rounded-xl border font-bold ${practiceAnswers[idx] === opt ? 'bg-purple-600 text-white' : 'bg-white text-gray-900 border-purple-200'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {practiceAnswers[idx] && (
                    <p className={`mt-2 text-sm font-bold ${practiceAnswers[idx] === q.answer ? 'text-emerald-600' : 'text-red-500'}`}>
                      {practiceAnswers[idx] === q.answer ? '✅ إجابة صحيحة!' : `❌ الإجابة الصحيحة: ${q.answer}`}
                    </p>
                  )}
                </div>
              ))}
              <button onClick={handleGoHome} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold hover:bg-slate-700 transition mt-4 self-center">
                إنهاء التمرين والعودة للرئيسية 🏠
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
