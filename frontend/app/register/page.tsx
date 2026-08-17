'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [doctorUsername, setDoctorUsername] = useState('')
  const [doctors, setDoctors] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.get('https://reading-ai-platform.onrender.com/auth/doctors')
        .then(res => setDoctors(res.data))
        .catch(err => console.error("Failed to fetch doctors", err))
    }
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const token = localStorage.getItem('token')
    if (!token) {
      setError('You must be logged in as Admin to register users.')
      return
    }

    if (role === 'student' && !doctorUsername) {
      setError('Please select a doctor for the student.')
      return
    }

    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('password', password)
      formData.append('role', role)
      if (role === 'student') {
        formData.append('doctor_username', doctorUsername)
      }

      await axios.post('https://reading-ai-platform.onrender.com/auth/register', formData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setSuccess('Account created successfully! Redirecting to Admin Panel...')
      setTimeout(() => router.push('/admin'), 2000)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred during registration')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-10">
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 text-center mb-8">Register New User</h1>
        
        {error && <p className="text-red-500 text-center mb-4 font-semibold">{error}</p>}
        {success && <p className="text-emerald-500 text-center mb-4 font-semibold">{success}</p>}

        <form onSubmit={handleRegister} className="flex flex-col gap-6">
          <div>
            <label className="block text-purple-800 font-bold mb-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/70 border border-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
          </div>
          <div>
            <label className="block text-purple-800 font-bold mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/70 border border-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
              required
            />
          </div>
          
          <div>
            <label className="block text-purple-800 font-bold mb-2">Role</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/70 border border-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="student">Student</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          {role === 'student' && (
            <div>
              <label className="block text-purple-800 font-bold mb-2">Assign to Doctor</label>
              <select 
                value={doctorUsername}
                onChange={(e) => setDoctorUsername(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/70 border border-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-400"
                required
              >
                <option value="" disabled>Select a doctor...</option>
                {doctors.map((doc: any) => (
                  <option key={doc.id} value={doc.username}>{doc.username}</option>
                ))}
              </select>
            </div>
          )}

          <button 
            type="submit"
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/30 hover:scale-105 transition-transform"
          >
            Create Account ✨
          </button>
        </form>
      </div>
    </div>
  )
}