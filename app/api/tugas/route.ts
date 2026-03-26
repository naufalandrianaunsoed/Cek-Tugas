import { createClient } from '@supabase/supabase-js';

// Inisialisasi client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // 1. AMBIL SESSION DARI SUPABASE (ID: 1)
    const { data: session, error: dbError } = await supabase
      .from('sesi_moodle')
      .select('*')
      .eq('id', 1)
      .single();

    if (dbError || !session) {
      return Response.json({ 
        error: "Session tidak ditemukan di database. Jalankan login.js di lokal." 
      }, { status: 401 });
    }

    // Bangun string cookie untuk header fetch
    const cookieHeader = session.cookies
      .map((c: any) => `${c.name}=${c.value}`)
      .join("; ");

    // 2. REQUEST KE API MOODLE
    const moodleUrl = `https://eldiru.unsoed.ac.id/lib/ajax/service.php?sesskey=${session.sesskey}&info=core_calendar_get_action_events_by_timesort`;
    
    const payload = [
      {
        index: 0,
        methodname: "core_calendar_get_action_events_by_timesort",
        args: {}
      }
    ];
    
    const res = await fetch(moodleUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": cookieHeader
      },
      body: JSON.stringify(payload)
    });
    
    const responseData = await res.json();
    
    // Cek jika session expired (FIX)
    if (responseData?.[0]?.error || responseData?.[0]?.exception === "require_login_exception") {
      return Response.json({ 
        error: "Session di database sudah expired. Tunggu admin memperbarui session",
        loginInfo: {
        last_login: session.last_login,
        last_login_formatted: session.last_login_formatted
      } 
      }, { status: 401 });
    }

    // 3. FILTER & FORMAT DATA TUGAS
    const rawEvents = responseData?.[0]?.data?.events || [];
    const nowTimestamp = Date.now() / 1000;
    const startOfThisMonth = new Date();
    startOfThisMonth.setDate(1);
    startOfThisMonth.setHours(0, 0, 0, 0);

    // Daftar tugas yang ingin diabaikan (sesuai kodingan awal lo)
    const excludedTasks = ["Test 1 Sub CPMK01 di Kelas", "Test 1 Sub CPMK01 di Rumah", "Tugas Sub CPMK01", "Materi ke-3"];

    const filteredTasks = rawEvents
      .filter((event: any) => {
        const taskName = event.activityname || event.name || "";
        const eventDate = event.timestart ? new Date(event.timestart * 1000) : null;
        
        // Cek apakah tugas dikecualikan atau sudah lewat bulan sebelumnya
        if (excludedTasks.includes(taskName)) return false;
        if (eventDate && eventDate < startOfThisMonth) return false;
        return true;
      })
      .map((event: any) => {
        const timestamp = event.timestart || null;
        const date = timestamp ? new Date(timestamp * 1000) : null;

        return {
          id: event.id?.toString(),
          course: event.course?.fullname?.replace("Arsip: ", "") || "Mata Kuliah",
          task: event.activityname || event.name,
          deadline: date ? date.toISOString() : null,
          history: date ? date.getTime() < Date.now() : false,
          completed: false,
          hasDeadline: !!timestamp,
          timestamp: timestamp
        };
      });
      for (const task of filteredTasks) {
        await supabase
          .from("tugas")
          .upsert({
            id: task.id,
            task: task.task,
            course: task.course,
            deadline: task.deadline,
            history: task.history,
            completed: task.completed || false
          });
      }
    for (const task of filteredTasks) {
      await supabase
        .from("tugas")
        .upsert(task, { onConflict: "id" });
    }
    // Urutkan berdasarkan deadline terdekat
    filteredTasks.sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    // 🔥 AMBIL DARI DATABASE
    const { data: tugasDb, error: dbErrorTugas } = await supabase
      .from("tugas")
      .select("*")
      .order("timestamp", { ascending: true });

    if (dbErrorTugas) {
      console.error("AMBIL DB ERROR:", dbErrorTugas);
    }

    // ✨ FIX: Hitung ulang 'history' secara dinamis berdasarkan jam saat ini
    const finalTugas = (tugasDb || []).map((t: any) => {
      const isHistory = t.deadline ? new Date(t.deadline).getTime() < Date.now() : t.history;
      return {
        ...t,
        history: isHistory
      };
    });

    return Response.json({ 
      tugas: finalTugas, // <-- Gunakan finalTugas yang udah dihitung ulang
      loginInfo: {
        last_login: session.last_login,
        last_login_formatted: session.last_login_formatted
      }
    });

  } catch (err) {
    console.error("API Error:", err);
    return Response.json({ error: "Gagal mengambil data dari Moodle" }, { status: 500 });
  }
}
