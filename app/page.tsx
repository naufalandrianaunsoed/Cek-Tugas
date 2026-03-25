"use client";

import { useEffect, useState } from "react";
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Moon, 
  Sun,
  Menu,
  X,
  Hourglass,
  CalendarDays,
  UserLock
} from "lucide-react";
import { useTheme } from "next-themes";

interface Tugas {
  id: string;
  task: string;
  course: string;
  deadline: string;
  overdue: boolean;
  completed?: boolean;
}

interface LoginInfo {
  last_login: string | null;
  last_login_formatted: string;
}

export default function Home() {
  const [tugas, setTugas] = useState<Tugas[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Fetch data
    fetch("/api/tugas")
      .then(res => res.json())
      .then(data => {
        setTimeout(() => {

          // ✅ SELALU SET LOGIN INFO (kunci utama)
          if (data.loginInfo) {
            setLoginInfo(data.loginInfo);
          }

          // ❗ baru handle error
          if (data.error) {
            setError(data.error);
            setLoading(false);
            return;
          }

          const activeTasks = (data.tugas || []).filter((t: Tugas) => !t.completed);

          const sortedTasks = activeTasks.sort((a: Tugas, b: Tugas) => {
            return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          });

          setTugas(sortedTasks);
          setLoading(false);

        }, 800);
      })
      .catch(err => {
        console.error("Gagal mengambil data:", err);
        setError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
        setLoading(false);
      });
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Fungsi untuk memformat tanggal dengan aman
  const formatDate = (deadlineDate: string) => {
    try {
      const date = new Date(deadlineDate);
      if (isNaN(date.getTime())) return deadlineDate;
      
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return deadlineDate;
    }
  };

  // Pelindung anti-NaN dan kalkulator sisa hari
  const calculateDaysLeft = (deadlineDate: string) => {
    try {
      const dueDate = new Date(deadlineDate);
      
      if (isNaN(dueDate.getTime())) return "Format Error";

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) return `${diffDays} hari lagi`;
      if (diffDays === 0) return "Hari ini!";
      return `Terlewat ${Math.abs(diffDays)} hari`;
    } catch (error) {
      return "Format Error";
    }
  };

  // Fungsi untuk mendapatkan nama Bulan + Tahun
  const getMonthYear = (deadlineDate: string) => {
    try {
      const date = new Date(deadlineDate);
      if (isNaN(date.getTime())) return "Bulan Tidak Diketahui";
      
      return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch (error) {
      return "Bulan Tidak Diketahui";
    }
  };

  // Mengelompokkan tugas berdasarkan bulan
  const groupedTasks = tugas.reduce((acc: Record<string, Tugas[]>, task) => {
    const monthYear = getMonthYear(task.deadline);
    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(task);
    return acc;
  }, {});

  const ongoingTasks = tugas.filter(t => !t.overdue).length;
  const overdueTasks = tugas.filter(t => t.overdue).length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f7f9fc] dark:bg-[#0f1115] transition-colors duration-500 font-poppins selection:bg-blue-500/30">
      
      {/* Liquid Ambient Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Navbar - iOS Liquid Glass */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl bg-white/40 dark:bg-[#15171c]/40 border-b border-white/40 dark:border-white/5 shadow-sm saturate-150">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 bg-black dark:bg-white rounded-[14px] flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900 dark:text-white">
                Cek Tugas.
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button onClick={toggleTheme} className="p-2.5 rounded-full bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all duration-300 shadow-sm border border-white/40 dark:border-white/5 backdrop-blur-md">
                {theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2.5 rounded-full bg-white/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 transition-all duration-300 border border-white/40 dark:border-white/5 backdrop-blur-md">
                {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative max-w-5xl mx-auto px-6 lg:px-8 py-10 md:py-10">
        {(error || loginInfo) && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 animate-fade-in
            ${error 
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' 
              : 'bg-white/60 dark:bg-[#1a1d24]/60 border-white/50 dark:border-white/5'
            }`}
          >
            
            {/* ICON (cuma muncul kalau gak error) */}
            {!error && (
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <UserLock className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            )}

            <div className="flex-1">
              
              {/* ERROR MODE */}
              {error ? (
                <>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    {error}
                  </p>

                  {loginInfo && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Terakhir login: {loginInfo.last_login_formatted}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {/* NORMAL MODE */}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Terakhir login
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {loginInfo?.last_login_formatted}
                  </p>
                </>
              )}
            </div>
            
            {/* BUTTON REFRESH (hanya saat error) */}
            {error && (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800"
              >
                Refresh
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}     
        {/* Header Section */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
            Tugas Kamu
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-16 animate-fade-in-up">
            <div className="relative overflow-hidden bg-white/60 dark:bg-[#1a1d24]/80 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-transform hover:-translate-y-1">
              <div className="absolute top-0 right-0 p-6 opacity-10 dark:opacity-30">
                <Clock className="w-24 h-24 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-300 mb-2">ONGOING</p>
              <p className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white">{ongoingTasks}</p>
            </div>

            <div className="relative overflow-hidden bg-red-50/60 dark:bg-red-950/30 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 border border-red-100/50 dark:border-red-800/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-transform hover:-translate-y-1">
              <div className="absolute top-0 right-0 p-6 opacity-10 dark:opacity-30">
                <AlertCircle className="w-24 h-24 text-red-500 dark:text-red-400" />
              </div>
              <p className="text-sm font-semibold text-red-500 dark:text-red-400 mb-2">OVERDUE</p>
              <p className="text-4xl sm:text-5xl font-bold text-red-600 dark:text-red-400">{overdueTasks}</p>
            </div>
          </div>
        )}
        {/* Tasks List Grouped by Month */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {loading ? (
            // Skeleton Group Loaders
            <div className="space-y-8">
              <div className="h-8 w-40 bg-gray-200 dark:bg-gray-800/50 rounded-lg animate-pulse mb-4"></div>
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-white/40 dark:bg-gray-800/20 rounded-[1.5rem] border border-white/20 dark:border-white/5 animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium mb-2">
                {error.includes("Session") ? "Session tidak valid" : "Terjadi kesalahan"}
              </p>
              
            </div>
          ) : Object.keys(groupedTasks).length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">✨ Kosong. Bebas dari beban tugas.</p>
            </div>
          ) : (
            // Render Per Bulan
            Object.entries(groupedTasks).map(([monthYear, tasksInMonth]) => (
              <div key={monthYear} className="mb-12 last:mb-0">
                
                {/* Header Section per Bulan ala Notion */}
                <div className="flex items-center gap-3 mb-5 pl-2">
                  <CalendarDays className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {monthYear}
                  </h2>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-800 to-transparent ml-4"></div>
                </div>

                {/* List Tugas di Bulan Tersebut */}
                <div className="space-y-4">
                  {tasksInMonth.map((t, i) => {
                    const daysLeftStr = calculateDaysLeft(t.deadline);
                    const isToday = daysLeftStr === "Hari ini!";
                    const isError = daysLeftStr === "Format Error";
                    
                    return (
                      <div
                        key={t.id || i}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/60 dark:bg-[#1a1d24]/60 backdrop-blur-xl rounded-[1.5rem] p-5 sm:p-6 shadow-sm hover:shadow-md border border-white/50 dark:border-white/5 transition-all duration-300"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#252830] text-gray-600 dark:text-gray-300">
                              {t.course}
                            </span>
                            {t.overdue && (
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {t.task}
                          </h3>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-6 mt-2 sm:mt-0">
                          {/* Badge Sisa Waktu */}
                          <div className={`flex items-center text-sm font-medium px-3 py-1.5 rounded-xl border ${
                            isError 
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500'
                              : t.overdue 
                              ? 'bg-red-50/50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
                              : isToday
                              ? 'bg-orange-50/50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400'
                              : 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400'
                          }`}>
                            <Hourglass className="w-4 h-4 mr-1.5" />
                            {daysLeftStr}
                          </div>

                          <div className="hidden sm:block text-sm font-medium text-gray-400 dark:text-gray-500 min-w-[100px] text-right">
                            {formatDate(t.deadline)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Global Fonts & Animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}