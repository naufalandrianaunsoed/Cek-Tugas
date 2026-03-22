require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const username = process.env.KORI_USER;
  const password = process.env.KORI_PASS;

  console.log("🔐 Login sebagai:", username);

  // LOGIN KORI
  await page.goto('https://kori.unsoed.ac.id/login');
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.press('input[name="password"]', 'Enter');

  await page.waitForLoadState('networkidle');
  console.log("✅ Login KORI berhasil");

  // MASUK ELDIRU
  await page.goto('https://eldiru.unsoed.ac.id/login/index.php?authCAS=CAS');
  await page.waitForURL('**eldiru.unsoed.ac.id**');

  await page.goto('https://eldiru.unsoed.ac.id/my/');
  await page.waitForLoadState('networkidle');
  console.log("✅ Masuk ELDIRU");

  // 🔥 AMBIL SESSKEY
  const sesskey = await page.evaluate(() => M.cfg.sesskey);

  // 🔥 AMBIL COOKIE (FILTER ELDIRU AJA)
  const allCookies = await context.cookies();
  const cookies = allCookies.filter(c =>
    c.domain.includes('eldiru.unsoed.ac.id')
  );

  // 🔥 SIMPAN DENGAN INFO WAKTU LOGIN LENGKAP
  const now = new Date();

  const datePart = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timePart = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace('.', ':');

  const sessionData = {
    sesskey: sesskey,
    cookies: cookies,
    last_login: now.toISOString(),
    last_login_formatted: `${datePart} • ${timePart}`,
  };

  // Pastikan folder data ada
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Simpan ke file
  fs.writeFileSync(path.join(dataDir, 'session.json'), JSON.stringify(sessionData, null, 2));

  console.log("✅ Session + Cookie disimpan!");
  console.log(`📅 Terakhir login: ${sessionData.last_login_formatted}`);

  await browser.close();
})();