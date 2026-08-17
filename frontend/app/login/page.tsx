'use client'

import { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      const formData = new URLSearchParams()
      formData.append('username', username)
      formData.append('password', password)

      const response = await axios.post('https://reading-ai-platform.onrender.com/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      // حفظ بيانات المستخدم في المتصفح
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('role', response.data.role)
      localStorage.setItem('username', response.data.username)

        // توجيه المستخدم حسب صلاحيته
      if (response.data.role === 'student') {
        router.push('/student')
      } else if (response.data.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-10">
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 text-center mb-8">تسجيل الدخول</h1>
        
        {error && <p className="text-red-500 text-center mb-4 font-semibold">{error}</p>}

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div>
            <label className="block text-purple-800 font-bold mb-2">اسم المستخدم</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/70 border border-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 text-purple-900"
              required
            />
          </div>
          <div>
            <label className="block text-purple-800 font-bold mb-2">كلمة المرور</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/70 border border-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400 text-purple-900"
              required
            />
          </div>
          <button 
            type="submit"
            className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform"
          >
            دخول 🔐
          </button>
        </form>
      </div>
    </div>
  )
}