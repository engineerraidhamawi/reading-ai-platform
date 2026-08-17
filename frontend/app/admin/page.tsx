'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const fetchUsers = async () => {
    const token = localStorage.getItem('token')
    if (!token) return window.location.href = '/login'
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data)
    } catch (err) {
      alert('Access Denied: Admins only.')
      window.location.href = '/'
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    const token = localStorage.getItem('token')
    await axios.delete(`https://reading-ai-platform.onrender.com/api/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchUsers()
  }

  const handleResetPassword = async (id: number) => {
    const token = localStorage.getItem('token')
    const formData = new URLSearchParams()
    formData.append('new_password', newPassword)
    
    await axios.put(`https://reading-ai-platform.onrender.com/api/users/${id}/reset-password`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    })
    setResetUserId(null)
    setNewPassword('')
    alert('Password updated successfully!')
  }

  if (loading) return <div className="p-10 text-purple-700">Loading Admin Panel...</div>

  return (
    <div className="p-10">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-8">Admin Control Panel</h1>
      
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl">
        <h2 className="text-xl font-bold mb-6 text-purple-900">System Users</h2>
        
        <div className="overflow-x-auto" dir="rtl">
          <table className="min-w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-purple-100">
                <th className="py-4 px-4 text-sm font-bold text-purple-700">ID</th>
                <th className="py-4 px-4 text-sm font-bold text-purple-700">Username</th>
                <th className="py-4 px-4 text-sm font-bold text-purple-700">Role</th>
                <th className="py-4 px-4 text-sm font-bold text-purple-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-purple-50 hover:bg-white/60">
                  <td className="py-4 px-4 text-purple-600">{user.id}</td>
                  <td className="py-4 px-4 font-bold text-purple-900">{user.username}</td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' : 
                      user.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 flex gap-2">
                    {resetUserId === user.id ? (
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          placeholder="New password" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="p-1 rounded border border-purple-200"
                        />
                        <button onClick={() => handleResetPassword(user.id)} className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-sm">Save</button>
                        <button onClick={() => setResetUserId(null)} className="bg-gray-300 text-black px-3 py-1 rounded-lg text-sm">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => setResetUserId(user.id)} 
                          className="bg-amber-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-amber-600"
                        >
                          Reset Password
                        </button>
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handleDelete(user.id)} 
                            className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}