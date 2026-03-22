import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// ==========================
// 🔌 INIT SUPABASE CLIENT
// ==========================
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // ==========================
    // 🔐 BACA SESSION
    // ==========================
    const sessionPath = path.join(process.cwd(), "data/session.json");
    
    if (!fs.existsSync(sessionPath)) {
      return Response.json({ 
        error: "Session tidak ditemukan. Silakan login terlebih dahulu",
        sessionStatus: "missing"
      }, { status: 401 });
    }
    
    let session;
    try {
      session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
    } catch (err) {
      return Response.json({ error: "File session.json rusak.", sessionStatus: "corrupted" }, { status: 401 });
    }
    
    if (!session.sesskey || !session.cookies) {
      return Response.json({ error: "File tidak sesuai.", sessionStatus: "invalid" }, { status: 401 });
    }
    
    const loginInfo = {
      last_login: session.last_login || null,
      last_login_formatted: session.last_login_formatted || "Tidak diketahui"
    };
    
    const sesskey = session.sesskey;
    const cookie = session.cookies.map((c: any) => `${c.name}=${c.value}`).join("; ");
    
    // ==========================
    // 🌐 API MOODLE
    // ==========================
    const url = `https://eldiru.unsoed.ac.id/lib/ajax/service.php?sesskey=${sesskey}&info=core_calendar_get_action_events_by_timesort`;
    const payload = [{ index: 0, methodname: "core_calendar_get_action_events_by_timesort", args: {} }];
    
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Cookie": cookie
      },
      body: JSON.stringify(payload)
    });
    
    const responseText = await res.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return Response.json({ error: "Response server tidak valid.", sessionStatus: "invalid_response" }, { status: 401 });
    }
    
    if (data?.error === "require_login" || responseText.includes("login")) {
      return Response.json({ error: "Session expired.", sessionStatus: "invalid" }, { status: 401 });
    }
    
    // ==========================
    // 🔍 FILTER TUGAS DARI MOODLE
    // ==========================
    const moodleTugas: any[] = [];
    const nowTimestamp = Date.now() / 1000;
    
    const excludedTasks = [
      "Test 1 Sub CPMK01 di Kelas",
      "Test 1 Sub CPMK01 di Rumah",
      "Tugas Sub CPMK01",
      "Materi ke-3"
    ];
    
    const events = data?.[0]?.data?.events || [];
    
    for (const event of events) {
      const taskName = event.activityname || event.name || event.eventtype || "";
      if (excludedTasks.includes(taskName)) continue;
      
      const timestamp = event.timestart ? event.timestart * 1000 : null;
      const date = timestamp ? new Date(timestamp) : null;
      
      let formattedDeadline = "";
      let overdue = false;
      
      if (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedDeadline = `${year}-${month}-${day}`;
        overdue = event.timestart < nowTimestamp;
      }
      
      moodleTugas.push({
        id: event.id?.toString() || `${event.course?.id || Math.random()}-${event.timestart || Date.now()}`,
        course: event.course?.fullname?.replace("Arsip: ", "") || "Mata Kuliah",
        task: taskName,
        deadline: formattedDeadline,
        overdue: overdue,
        completed: false, // Default belum kelar
        hasDeadline: !!date,
        timestamp: timestamp
      });
    }
    
    // ==========================
    // 🧠 OPERASI DATABASE (SUPABASE)
    // ==========================
    
    // 1. MASUKIN DATA KE SUPABASE (UPSERT)
    if (moodleTugas.length > 0) {
      const { error: upsertError } = await supabase
        .from('tugas')
        .upsert(moodleTugas, { onConflict: 'id' }); 
        
      if (upsertError) console.error("❌ Gagal Upsert ke Supabase:", upsertError.message);
    }

    // 2. TUKANG SAPU: Hapus tugas yang umurnya udah lewat 30 hari
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const { error: deleteError } = await supabase
      .from('tugas')
      .delete()
      .lt('timestamp', thirtyDaysAgo); 

    if (deleteError) console.error("❌ Gagal hapus data lama:", deleteError.message);

    // 3. AMBIL SEMUA DATA FINAL DARI DATABASE
    // Supaya kalau di Eldiru udah ilang (karena lo kerjain), di web/bot tetep muncul!
    const { data: finalTugas, error: fetchError } = await supabase
      .from('tugas')
      .select('*');

    if (fetchError) {
      console.error("❌ Gagal ngambil data dari Supabase:", fetchError.message);
      throw new Error("Gagal load database");
    }

    // Update status overdue dari database secara real-time
    const currentMs = Date.now();
    const processedTugas = (finalTugas || []).map(t => {
      if (t.timestamp) {
        t.overdue = t.timestamp < currentMs;
      }
      return t;
    });

    // ==========================
    // 📊 SORTING & RETURN API
    // ==========================
    const tasksWithDeadline = processedTugas.filter(t => t.hasDeadline);
    const tasksWithoutDeadline = processedTugas.filter(t => !t.hasDeadline);
    
    tasksWithDeadline.sort((a, b) => {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    
    const sortedTugas = [...tasksWithDeadline, ...tasksWithoutDeadline];
    
    return Response.json({ 
      tugas: sortedTugas,
      loginInfo: loginInfo
    });
    
  } catch (err: any) {
    console.error("Gagal proses API:", err.message);
    return Response.json({ error: "Terjadi kesalahan server", sessionStatus: "error" }, { status: 500 });
  }
}