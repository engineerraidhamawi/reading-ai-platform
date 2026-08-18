"use client"
import './globals.css'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(localStorage.getItem('role'))
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="font-sans antialiased text-slate-800" suppressHydrationWarning>
        <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
          
          <aside className="w-64 bg-white/40 backdrop-blur-xl border-l border-white/60 p-6 flex flex-col gap-6 shadow-xl fixed right-0 top-0 bottom-0 z-50 overflow-y-auto">
            <div className="border-b border-white/40 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-500/30 text-white">
                  AI
                </div>
                <div>
                  <h1 className="text-lg font-bold text-purple-900">منصة القراءة الذكية</h1>
                  <p className="text-xs text-purple-600">نظام التشخيص والعلاج</p>
                </div>
              </div>
            </div>
            
            {role ? (
              <nav className="flex flex-col gap-3 flex-1">
                {role === 'admin' && (
                  <>
                    <Link href="/admin" className="flex items-center gap-3 text-purple-900 bg-white/60 p-4 rounded-2xl shadow-sm transition-all hover:bg-white/80">
                      <span className="text-xl">🛡️</span>
                      <div>
                        <span className="font-bold block">لوحة الأدمن</span>
                        <span className="text-xs text-purple-500">إدارة المستخدمين</span>
                      </div>
                    </Link>
                    <Link href="/register" className="flex items-center gap-3 text-purple-700 hover:bg-white/40 hover:text-purple-900 p-4 rounded-2xl transition-all">
                      <span className="text-xl">✨</span>
                      <div>
                        <span className="font-semibold block">تسجيل مستخدم جديد</span>
                        <span className="text-xs text-purple-400">إضافة دكتورة أو طالب</span>
                      </div>
                    </Link>
                  </>
                )}
                
                {role === 'doctor' && (
                  <Link href="/" className="flex items-center gap-3 text-purple-900 bg-white/60 p-4 rounded-2xl shadow-sm transition-all hover:bg-white/80">
                    <span className="text-xl">📊</span>
                    <div>
                      <span className="font-bold block">لوحة تحكم الدكتورة</span>
                      <span className="text-xs text-purple-500">التقارير والإحصائيات</span>
                    </div>
                  </Link>
                )}
                
                {role !== 'admin' && (
                  <Link href="/student" className="flex items-center gap-3 text-purple-700 hover:bg-white/40 hover:text-purple-900 p-4 rounded-2xl transition-all">
                    <span className="text-xl">🎤</span>
                    <div>
                      <span className="font-semibold block">حصة الطالب</span>
                      <span className="text-xs text-purple-400">تسجيل واختبار القراءة</span>
                    </div>
                  </Link>
                )}

                <button onClick={handleLogout} className="flex items-center gap-3 text-red-600 hover:bg-red-50 p-4 rounded-2xl transition-all mt-auto">
                  <span className="text-xl">🚪</span>
                  <span className="font-semibold">تسجيل الخروج</span>
                </button>
              </nav>
            ) : (
              <nav className="flex flex-col gap-3">
                <Link href="/login" className="flex items-center gap-3 text-purple-900 bg-white/60 p-4 rounded-2xl shadow-sm transition-all hover:bg-white/80">
                  <span className="text-xl">🔐</span>
                  <span className="font-bold">تسجيل الدخول</span>
                </Link>
              </nav>
            )}
          </aside>

          {/* Main Content Area - adjusted for fixed sidebar */}
          <main className="flex-1 mr-64 p-6 overflow-y-auto h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}