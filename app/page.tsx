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
  history: boolean;
  completed?: boolean;
}

interface LoginInfo {
  last_login: string | null;
  last_login_formatted: string;
}

export default function Home() {
  const [tugas, setTugas] = useState<Tugas[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ongoing' | 'history' | null>(null);

  useEffect(() => {
    setMounted(true);
    fetch("/api/tugas")
      .then(res => res.json())
      .then(data => {
        setTimeout(() => {
          if (data.loginInfo) setLoginInfo(data.loginInfo);
          if (data.error) {
            setError(data.error);
            setLoading(false);
            return;
          }
          const activeTasks = (data.tugas || []).filter((t: Tugas) => !t.completed);
          const sortedTasks = activeTasks.sort((a: Tugas, b: Tugas) =>
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          );
          setTugas(sortedTasks);
          setLoading(false);
        }, 800);
      })
      .catch(() => {
        setError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
        setLoading(false);
      });
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const handleFilterToggle = (filter: 'ongoing' | 'history') => {
    setActiveFilter(prev => (prev === filter ? null : filter));
  };

  const formatDate = (deadlineDate: string) => {
    try {
      const date = new Date(deadlineDate);
      if (isNaN(date.getTime())) return deadlineDate;
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return deadlineDate; }
  };

  const formatDateShort = (deadlineDate: string) => {
    try {
      const date = new Date(deadlineDate);
      if (isNaN(date.getTime())) return deadlineDate;
      return date.toLocaleDateString('id-ID', { 
        day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return deadlineDate; }
  };

  const calcTimeLeft = (deadlineDate: string) => {
    try {
      const dueDate = new Date(deadlineDate);
      const now = new Date();
      if (isNaN(dueDate.getTime())) return "Format Error";
      const diffMs = dueDate.getTime() - now.getTime();
      if (diffMs <= 0) return "Waktu habis";
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;
      let result = "";
      if (days > 0) result += `${days} hari `;
      if (hours > 0) result += `${hours} jam `;
      if (minutes > 0 && days === 0) result += `${minutes} mnt`;
      return result.trim() || "< 1 mnt";
    } catch { return "Format Error"; }
  };

  const getMonthYear = (deadlineDate: string) => {
    try {
      const date = new Date(deadlineDate);
      if (isNaN(date.getTime())) return "Bulan Tidak Diketahui";
      return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch { return "Bulan Tidak Diketahui"; }
  };

  const ongoingTasks = tugas.filter(t => !t.history).length;
  const historyTasks = tugas.filter(t => t.history).length;

  const filteredByTab = activeFilter === null
    ? tugas
    : tugas.filter(t => activeFilter === 'ongoing' ? !t.history : t.history);

  const groupedTasks = filteredByTab.reduce((acc: Record<string, Tugas[]>, task) => {
    const monthYear = getMonthYear(task.deadline);
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(task);
    return acc;
  }, {});

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f7f9fc] dark:bg-[#0f1115] transition-colors duration-500 font-poppins selection:bg-blue-500/30">

      {/* Ambient Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-white/70 dark:bg-[#15171c]/70 border-b border-white/40 dark:border-white/5 shadow-sm saturate-150">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-[72px]">

            {/* Logo + nama */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-black dark:bg-white rounded-[11px] sm:rounded-[13px] flex items-center justify-center shadow-md flex-shrink-0">
                <BookOpen className="w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] text-white dark:text-black" />
              </div>
              <span className="font-bold text-[15px] sm:text-lg md:text-xl tracking-tight text-gray-900 dark:text-white">
                Cek Tugas
              </span>
            </div>

            {/* Tombol tema */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-all duration-300 shadow-sm border border-white/50 dark:border-white/10 backdrop-blur-md"
            >
              {theme === "dark"
                ? <Sun className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
                : <Moon className="w-[17px] h-[17px] sm:w-[18px] sm:h-[18px]" />
              }
            </button>

          </div>
        </div>
      </nav>

      {/* Spacer navbar — sama persis dengan tinggi nav */}
      <div className="h-14 sm:h-16 md:h-[72px]" />

      {/* ─── MAIN ─── */}
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 md:pt-10 pb-16">

        {/* Login / Error Banner */}
        {(error || loginInfo) && (
          <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border flex items-center gap-2.5 sm:gap-3 animate-fade-in
            ${error
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
              : 'bg-white/60 dark:bg-[#1a1d24]/60 border-white/50 dark:border-white/5'
            }`}
          >
            {!error && (
              <div className="w-7 h-7 flex-shrink-0 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <UserLock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {error ? (
                <>
                  <p className="text-xs sm:text-sm font-medium text-red-800 dark:text-red-300 leading-snug">{error}</p>
                  {loginInfo && (
                    <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5">
                      Terakhir login: {loginInfo.last_login_formatted}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Terakhir login</p>
                  <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                    {loginInfo?.last_login_formatted}
                  </p>
                </>
              )}
            </div>
            {error && (
              <button
                onClick={() => window.location.reload()}
                className="flex-shrink-0 flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1.5 text-[11px] sm:text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800 transition-colors duration-200"
              >
                Refresh <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="mb-5 sm:mb-7 md:mb-10 animate-fade-in">
          <h1 className="text-[26px] sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-1.5 sm:mb-2">
            Tugas Tekkom B
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </p>
        </div>

        {/* ─── STATS CARDS ─── */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-5 sm:mb-8 md:mb-14 animate-fade-in-up">

            {/* ONGOING */}
            <div
              onClick={() => handleFilterToggle('ongoing')}
              className={`relative overflow-hidden backdrop-blur-xl rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border transition-all duration-300 ease-out cursor-pointer select-none active:scale-95
                ${activeFilter === 'ongoing'
                  ? 'bg-white/90 dark:bg-[#1a1d24]/90 border-blue-300 dark:border-blue-500/50 shadow-[0_12px_40px_rgba(59,130,246,0.25)] -translate-y-0.5 sm:-translate-y-1 scale-[1.02]'
                  : activeFilter === 'history'
                  ? 'bg-white/25 dark:bg-[#1a1d24]/25 border-white/15 dark:border-white/5 opacity-35 scale-[0.97]'
                  : 'bg-white/60 dark:bg-[#1a1d24]/80 border-white/50 dark:border-white/10 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_10px_40px_rgba(59,130,246,0.18)]'
                }`}
            >
              <div className="absolute top-0 right-0 p-3 sm:p-5 opacity-10 dark:opacity-20 pointer-events-none">
                <Clock className="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 text-blue-500 dark:text-blue-400" />
              </div>
              <p className={`text-[11px] sm:text-xs md:text-sm font-semibold mb-1 sm:mb-2 tracking-wide transition-colors duration-300
                ${activeFilter === 'ongoing' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                ONGOING
              </p>
              <p className={`text-3xl sm:text-4xl md:text-5xl font-bold transition-colors duration-300
                ${activeFilter === 'ongoing' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                {ongoingTasks}
              </p>
              <p className={`text-[10px] sm:text-xs mt-1.5 font-medium transition-all duration-300
                ${activeFilter === 'ongoing' ? 'text-blue-400 dark:text-blue-500' : 'text-gray-400 dark:text-gray-600'}`}>
                {activeFilter === 'ongoing' ? '✦ tap untuk reset' : 'tap untuk filter'}
              </p>
            </div>

            {/* HISTORY */}
            <div
              onClick={() => handleFilterToggle('history')}
              className={`relative overflow-hidden backdrop-blur-xl rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border transition-all duration-300 ease-out cursor-pointer select-none active:scale-95
                ${activeFilter === 'history'
                  ? 'bg-orange-50/90 dark:bg-orange-950/60 border-orange-400 dark:border-orange-500/50 shadow-[0_12px_40px_rgba(249,115,22,0.3)] -translate-y-0.5 sm:-translate-y-1 scale-[1.02]'
                  : activeFilter === 'ongoing'
                  ? 'bg-orange-50/20 dark:bg-orange-950/10 border-orange-100/15 dark:border-orange-800/10 opacity-35 scale-[0.97]'
                  : 'bg-orange-50/60 dark:bg-orange-950/30 border-orange-100/50 dark:border-orange-800/30 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_10px_40px_rgba(249,115,22,0.18)]'
                }`}
            >
              <div className="absolute top-0 right-0 p-3 sm:p-5 opacity-10 dark:opacity-20 pointer-events-none">
                <AlertCircle className="w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 text-orange-500 dark:text-orange-400" />
              </div>
              <p className={`text-[11px] sm:text-xs md:text-sm font-semibold mb-1 sm:mb-2 tracking-wide transition-colors duration-300
                ${activeFilter === 'history' ? 'text-orange-500 dark:text-orange-400' : 'text-orange-400 dark:text-orange-500'}`}>
                HISTORY
              </p>
              <p className={`text-3xl sm:text-4xl md:text-5xl font-bold transition-colors duration-300
                ${activeFilter === 'history' ? 'text-orange-600 dark:text-orange-400' : 'text-orange-500 dark:text-orange-400'}`}>
                {historyTasks}
              </p>
              <p className={`text-[10px] sm:text-xs mt-1.5 font-medium transition-all duration-300
                ${activeFilter === 'history' ? 'text-orange-400 dark:text-orange-500' : 'text-orange-300 dark:text-orange-600'}`}>
                {activeFilter === 'history' ? '✦ tap untuk reset' : 'tap untuk filter'}
              </p>
            </div>

          </div>
        )}

        {/* Label filter aktif */}
        {!loading && !error && activeFilter && (
          <div className="flex items-center gap-2 mb-4 animate-slide-down">
            <span className={`text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full border
              ${activeFilter === 'ongoing'
                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400'
                : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400'
              }`}>
              Menampilkan: {activeFilter === 'ongoing' ? 'Ongoing' : 'History'}
            </span>
            <button
              onClick={() => setActiveFilter(null)}
              className="text-[11px] sm:text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 underline underline-offset-2"
            >
              Reset
            </button>
          </div>
        )}

        {/* ─── TASK LIST ─── */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {loading ? (
            <div className="space-y-3 sm:space-y-5">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800/50 rounded-lg animate-pulse mb-3" />
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[88px] sm:h-28 bg-white/40 dark:bg-gray-800/20 rounded-2xl border border-white/20 dark:border-white/5 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 sm:py-16">
              <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
                {error.includes("Session") ? "Session tidak valid" : "Terjadi kesalahan"}
              </p>
            </div>
          ) : Object.keys(groupedTasks).length === 0 ? (
            <div className="text-center py-12 sm:py-16 animate-fade-in">
              <p className="text-3xl mb-2">{activeFilter === 'history' ? '📭' : '🎉'}</p>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
                {activeFilter === 'history'
                  ? 'Belum ada tugas yang lewat deadline.'
                  : activeFilter === 'ongoing'
                  ? 'Kosong. Bebas dari beban tugas.'
                  : 'Belum ada tugas sama sekali.'}
              </p>
            </div>
          ) : (
            Object.entries(groupedTasks).map(([monthYear, tasksInMonth]) => (
              <div key={monthYear} className="mb-7 sm:mb-10 last:mb-0">

                {/* Header bulan */}
                <div className="flex items-center gap-2 mb-3 sm:mb-4 pl-0.5">
                  <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                  <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {monthYear}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-800 to-transparent ml-1 sm:ml-3" />
                </div>

                {/* Kartu tugas */}
                <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
                  {tasksInMonth.map((t, i) => {
                    const timeLeftStr = calcTimeLeft(t.deadline);
                    const isError = timeLeftStr === "Format Error";
                    const deadlineDate = new Date(t.deadline);
                    const now = new Date();
                    const isDeadlineToday =
                      !t.history &&
                      deadlineDate.getFullYear() === now.getFullYear() &&
                      deadlineDate.getMonth() === now.getMonth() &&
                      deadlineDate.getDate() === now.getDate();

                    return (
                      <div
                        key={t.id || i}
                        className="flex flex-col gap-2.5 sm:gap-3 bg-white/60 dark:bg-[#1a1d24]/60 backdrop-blur-xl rounded-2xl sm:rounded-[1.5rem] p-3.5 sm:p-5 md:p-6 shadow-sm hover:shadow-lg border border-white/50 dark:border-white/5 transition-all duration-300 ease-out hover:-translate-y-0.5 sm:hover:-translate-y-1 hover:scale-[1.005] sm:hover:scale-[1.01]"
                      >
                        {/* Baris atas: badge matkul + nama tugas */}
                        <div>
                          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                            <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-md sm:rounded-lg bg-gray-100 dark:bg-[#252830] text-gray-600 dark:text-gray-300 truncate max-w-[80%]">
                              {t.course}
                            </span>
                            {isDeadlineToday && (
                              <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 relative flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-full w-full bg-orange-500" />
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm sm:text-base md:text-lg text-gray-900 dark:text-white leading-snug">
                            {t.task}
                          </h3>
                        </div>

                        {/* Baris bawah: sisa waktu + tanggal deadline */}
                        <div className="flex items-center justify-between gap-2">
                          {/* Badge sisa waktu */}
                          <div className={`flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs md:text-sm font-medium px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg sm:rounded-xl border flex-shrink-0
                            ${isError
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500'
                              : t.history
                              ? 'bg-red-50/50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-orange-600 dark:text-orange-400'
                              : 'bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400'
                            }`}>
                            <Hourglass className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">{timeLeftStr}</span>
                          </div>

                          {/* Tanggal deadline */}
                          <div className="flex items-center gap-1 min-w-0">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                            <span className="block sm:hidden text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate">
                              {formatDateShort(t.deadline)}
                            </span>
                            <span className="hidden sm:block text-xs md:text-sm font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap">
                              {formatDate(t.deadline)}
                            </span>
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

      {/* Fonts & Animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

        .font-poppins { font-family: 'Poppins', sans-serif; }

        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in      { animation: fade-in      0.5s  cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-up   { animation: fade-in-up   0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down   { animation: slide-down   0.3s  cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
