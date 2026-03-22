require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Inisialisasi bot dengan token dari file .env
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true
});

console.log("🤖 Bot Telegram jalan... Siap melayani!");

// ==========================
// 🛠️ HELPER FUNCTIONS
// ==========================
// Hitung sisa hari persis kayak di web
const calculateDaysLeft = (deadlineDate) => {
  if (!deadlineDate) return "⏳ Tidak ada tenggat";
  
  const dueDate = new Date(deadlineDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 0) return `⏳ ${diffDays} hari lagi`;
  if (diffDays === 0) return "🔥 Hari ini!";
  return `❌ Terlewat ${Math.abs(diffDays)} hari`;
};

// Format tanggal ke gaya Indo (25 Mar 2026)
const formatDate = (deadlineDate) => {
  if (!deadlineDate) return "";
  const date = new Date(deadlineDate);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ==========================
// 💬 HANDLE CHAT
// ==========================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  
  // Ambil teks asli buat di-reply, dan versi lowercase buat divalidasi
  const originalText = msg.text || "";
  const text = originalText.toLowerCase();

  // Kalau yang dikirim bukan teks (misal foto/stiker/dokumen), cuekin aja
  if (!originalText) return;

  // --- 1. COMMAND: /start ---
  if (text === "/start") {
    return bot.sendMessage(chatId, "👋 Halo! Ketik *cek tugas* buat lihat deadline kamu hari ini.", {
      parse_mode: "Markdown"
    });
  }

  // --- 2. COMMAND: cek tugas ---
  if (text === "cek tugas") {
    try {
      // Tembak API Next.js (pakai 127.0.0.1 untuk hindari issue localhost Node.js)
      const res = await axios.get("http://127.0.0.1:3000/api/tugas");
      
      // Ambil array tugas dari response JSON
      const allTasks = res.data.tugas || [];

      // Filter tugas yang belum selesai aja (sesuai logic di web lo)
      const activeTasks = allTasks.filter(t => !t.completed);

      // Kalau beneran kosong
      if (activeTasks.length === 0) {
        return bot.sendMessage(chatId, "✨ *Kosong. Bebas dari beban tugas!* Santai dulu gih.", {
          parse_mode: "Markdown"
        });
      }

      // Urutkan dari deadline terdekat
      activeTasks.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

      // Hitung statistik ongoing & overdue
      const ongoingTasks = activeTasks.filter(t => !t.overdue).length;
      const overdueTasks = activeTasks.filter(t => t.overdue).length;

      // Ambil tanggal hari ini untuk header
      const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
      
      // Mulai susun pesan Telegram
      let message = `📚 *TASKFLOW | REKAP TUGAS*\n`;
      message += `📅 ${todayStr}\n\n`;
      message += `📊 *Status:* ${ongoingTasks} Ongoing | ${overdueTasks} Overdue\n`;
      message += `➖➖➖➖➖➖➖➖➖➖\n\n`;

      // Looping daftar tugas ke dalam teks
      activeTasks.forEach((t, index) => {
        const daysLeftStr = calculateDaysLeft(t.deadline);
        const dateStr = formatDate(t.deadline);
        
        message += `*${index + 1}. ${t.course}*\n`;
        message += `📝 ${t.task}\n`;
        message += `⏰ ${dateStr} (${daysLeftStr})\n\n`;
      });

      // Kirim hasil akhir ke Telegram
      return bot.sendMessage(chatId, message, {
        parse_mode: "Markdown"
      });

    } catch (err) {
      console.log("Error Detail:", err.message);
      
      // Tangkap error khusus (misal session habis dari Next.js/Moodle)
      if (err.response && err.response.data && err.response.data.error) {
        return bot.sendMessage(chatId, `⚠️ *Peringatan Sistem:*\n${err.response.data.error}`, { parse_mode: "Markdown" });
      } else {
        // Error server mati atau koneksi putus
        return bot.sendMessage(chatId, "❌ *Gagal ambil data tugas.*\nPastikan server Next.js (npm run dev) lagi jalan ya!", { parse_mode: "Markdown" });
      }
    }
  }

  // --- 3. FALLBACK: Kalau ngetik ngasal ---
  return bot.sendMessage(chatId, `Maaf "${originalText}" tidak valid/terdaftar.\nKetik *cek tugas* untuk melihat tugas.`, {
    parse_mode: "Markdown"
  });
});