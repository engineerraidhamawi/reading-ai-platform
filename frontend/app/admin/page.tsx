'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [resetUserId, setResetUserId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')
  
  // Bulk Upload state
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [bulkMessage, setBulkMessage] = useState('')
  
  // NEW: Manual Add User state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [newRole, setNewRole] = useState('student')
  const [doctorUsername, setDoctorUsername] = useState('')
  const [doctors, setDoctors] = useState([])
  const [addUserMessage, setAddUserMessage] = useState('')

  const fetchUsers = async () => {
    const token = localStorage.getItem('token')
    if (!token) return window.location.href = '/login'
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/api/users', { headers: { Authorization: `Bearer ${token}` } })
      setUsers(res.data)
    } catch (err) {
      alert('Access Denied: Admins only.')
      window.location.href = '/'
    }
    setLoading(false)
  }

  const fetchDoctors = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await axios.get('https://reading-ai-platform.onrender.com/auth/doctors', { headers: { Authorization: `Bearer ${token}` } })
      setDoctors(res.data)
    } catch (err) { console.error("Failed to fetch doctors") }
  }

  useEffect(() => {
    fetchUsers()
    fetchDoctors()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    const token = localStorage.getItem('token')
    await axios.delete(`https://reading-ai-platform.onrender.com/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    fetchUsers()
  }

  const handleResetPassword = async (id: number) => {
    const token = localStorage.getItem('token')
    const formData = new URLSearchParams()
    formData.append('new_password', newPassword)
    
    await axios.put(`https://reading-ai-platform.onrender.com/api/users/${id}/reset-password`, formData, { headers: { Authorization: `Bearer ${token}` } })
    setResetUserId(null)
    setNewPassword('')
    alert('Password updated successfully!')
  }

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkFile) return alert('Please select a CSV file first.')
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', bulkFile)

    try {
      setBulkMessage('Uploading and creating accounts...')
      const res = await axios.post('https://reading-ai-platform.onrender.com/auth/register/bulk', formData, { headers: { Authorization: `Bearer ${token}` } })
      setBulkMessage(res.data.message)
      if (res.data.errors.length > 0) {
        alert(`Completed with errors:\n${res.data.errors.join('\n')}`)
      }
      fetchUsers()
    } catch (err: any) {
      setBulkMessage('Failed to upload file.')
      alert(err.response?.data?.detail || 'Upload failed')
    }
  }

  // NEW: Handle Manual User Creation
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('username', newUsername)
    formData.append('password', newPasswordInput)
    formData.append('role', newRole)
    if (newRole === 'student') {
      formData.append('doctor_username', doctorUsername)
    }

    try {
      setAddUserMessage('Creating account...')
      await axios.post('https://reading-ai-platform.onrender.com/auth/register', formData, { headers: { Authorization: `Bearer ${token}` } })
      setAddUserMessage('Account created successfully!')
      setNewUsername(''); setNewPasswordInput(''); setNewRole('student'); setDoctorUsername('')
      setShowAddForm(false)
      fetchUsers()
    } catch (err: any) {
      setAddUserMessage(err.response?.data?.detail || 'Failed to create account')
    }
  }

  if (loading) return <div className="p-10 text-purple-700">Loading Admin Panel...</div>

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-6">Admin Control Panel</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Manual Add User Section */}
        <div className="bg-white/80 border border-purple-200 p-4 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold text-purple-900">Add Single User</h3>
            <button onClick={() => setShowAddForm(!showAddForm)} className="text-purple-600 text-xs font-bold hover:underline">
              {showAddForm ? 'Cancel' : '+ Add New'}
            </button>
          </div>
          {showAddForm ? (
            <form onSubmit={handleAddUser} className="flex flex-col gap-3">
              <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className="w-full p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
              <input type="password" value={newPasswordInput} onChange={(e) => setNewPasswordInput(e.target.value)} placeholder="Password" className="w-full p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900">
                <option value="student">Student</option>
                <option value="doctor">Doctor</option>
              </select>
              {newRole === 'student' && (
                <select value={doctorUsername} onChange={(e) => setDoctorUsername(e.target.value)} className="w-full p-2 rounded-md bg-white border border-purple-100 text-xs text-gray-900" required>
                  <option value="" disabled>Select Doctor...</option>
                  {doctors.map((doc: any) => (
                    <option key={doc.id} value={doc.username}>{doc.username}</option>
                  ))}
                </select>
              )}
              <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-purple-700 transition w-fit">Create Account</button>
              {addUserMessage && <p className="text-xs text-emerald-600 mt-1 font-medium">{addUserMessage}</p>}
            </form>
          ) : (
            <p className="text-xs text-gray-500">Manually create a student or doctor account.</p>
          )}
        </div>

        {/* Bulk Upload Section */}
        <div className="bg-white/80 border border-purple-200 p-4 rounded-xl shadow-lg">
          <h3 className="text-base font-bold text-purple-900 mb-2">Bulk Upload Students (CSV)</h3>
          <p className="text-xs text-gray-600 mb-3">CSV format: username, password, doctor_username</p>
          <form onSubmit={handleBulkUpload} className="flex flex-col gap-3">
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => setBulkFile(e.target.files?.[0] || null)} 
              className="text-xs text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            <button type="submit" className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow hover:scale-105 transition w-fit">
              Upload & Create
            </button>
            {bulkMessage && <p className="text-xs text-emerald-600 mt-1 font-medium">{bulkMessage}</p>}
          </form>
        </div>
      </div>

      <div className="bg-white/80 p-4 rounded-xl shadow-sm">
        <h2 className="text-sm font-bold mb-2 text-purple-900">System Users</h2>
        <div className="overflow-x-auto w-full" dir="rtl">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-purple-100">
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">ID</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">Username</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">Role</th>
                <th className="py-2 px-2 text-[10px] font-bold text-purple-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b border-purple-50 hover:bg-white/60">
                  <td className="py-2 px-2 text-purple-600 text-xs">{user.id}</td>
                  <td className="py-2 px-2 font-bold text-purple-900 text-xs">{user.username}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.role === 'admin' ? 'bg-red-100 text-red-700' : user.role === 'doctor' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2 px-2 flex gap-2">
                    {resetUserId === user.id ? (
                      <div className="flex gap-2">
                        <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="p-1 rounded border border-purple-200 text-xs" />
                        <button onClick={() => handleResetPassword(user.id)} className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-[10px]">Save</button>
                        <button onClick={() => setResetUserId(null)} className="bg-gray-300 text-black px-3 py-1 rounded-lg text-[10px]">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setResetUserId(user.id)} className="bg-amber-500 text-white px-3 py-1 rounded-lg text-[10px] hover:bg-amber-600">Reset</button>
                        {user.role !== 'admin' && (
                          <button onClick={() => handleDelete(user.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] hover:bg-red-600">Delete</button>
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