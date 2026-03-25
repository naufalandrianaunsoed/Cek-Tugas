require('dotenv').config();
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Supabase menggunakan Service Role Key agar bisa menembus RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Launch browser (headless: true agar tidak muncul jendela browser)
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const username = process.env.KORI_USER;
  const password = process.env.KORI_PASS;

  try {
    console.log("🔐 Mencoba login sebagai:", username);

    // 1. LOGIN KORI
    await page.goto('https://kori.unsoed.ac.id/login');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.press('input[name="password"]', 'Enter');
    await page.waitForLoadState('networkidle');
    console.log("✅ Login KORI Berhasil");

    // 2. MASUK ELDIRU (Bridge CAS)
    await page.goto('https://eldiru.unsoed.ac.id/login/index.php?authCAS=CAS');
    await page.waitForURL('**/eldiru.unsoed.ac.id/**');
    
    // Pastikan masuk ke dashboard
    await page.goto('https://eldiru.unsoed.ac.id/my/');
    await page.waitForLoadState('networkidle');
    console.log("✅ Masuk ELDIRU Berhasil");

    // 3. AMBIL DATA SESSION
    const sesskey = await page.evaluate(() => M.cfg.sesskey);
    const allCookies = await context.cookies();
    const cookies = allCookies.filter(c => c.domain.includes('eldiru.unsoed.ac.id'));

    // Format Waktu
    const now = new Date();
    const datePart = now.toLocaleDateString('id-ID', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const timePart = now.toLocaleTimeString('id-ID', { 
      hour: '2-digit', minute: '2-digit', hour12: false 
    }).replace('.', ':');

    console.log("🚀 Mengirim session ke Supabase...");

    // 4. UPDATE KE SUPABASE (ID: 1)
    const { error } = await supabase
      .from('sesi_moodle')
      .update({
        sesskey: sesskey,
        cookies: cookies, // Disimpan sebagai JSONB
        last_login: now.toISOString(),
        last_login_formatted: `${datePart} • ${timePart}`
      })
      .eq('id', 1);

    if (error) throw error;

    console.log("✅ SESSION SUPABASE BERHASIL DIPERBARUI!");
    console.log(`📅 Terakhir Login: ${datePart} pukul ${timePart}`);

  } catch (err) {
    console.error("❌ Terjadi Kesalahan:", err.message);
  } finally {
    await browser.close();
  }
})();