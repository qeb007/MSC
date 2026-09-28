import { chromium } from "playwright";

const HOTEL_NAME = "アワーズイン阪急 / OURS INN HANKYU";
const CHECKIN = process.env.HOTEL_CHECKIN || "20270326";
const CHECKOUT = process.env.HOTEL_CHECKOUT || "20270327";
const DISPLAY_DATE_PATTERN = process.env.HOTEL_DISPLAY_DATE_PATTERN || "3/26.*3/27";
const GUEST_PATTERN = process.env.HOTEL_GUEST_PATTERN || "大人\\s*2名.*子供\\s*1名.*1室";
const DATE_LABEL = process.env.HOTEL_DATE_LABEL || "2027/03/26–2027/03/27（1 晚）";
const GUEST_LABEL = process.env.HOTEL_GUEST_LABEL || "2 位成人＋1 位小學生，1 間房";
const SEARCH_URL =
  `https://go-oursinn-hankyu.reservation.jp/ja/rooms?checkin_date=${CHECKIN}&checkout_date=${CHECKOUT}` +
  "&adults=2&child1=1&child2=0&child3=0&child4=0&child5=0&children=1&rooms=1" +
  "&dayuseFlg=0&sort=1&dateUndecidedFlg=0";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "1787219860";

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram API returned HTTP ${response.status}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "ja-JP" });

try {
  await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(5_000);

  const body = await page.locator("body").innerText();
  const expectedSearch = new RegExp(DISPLAY_DATE_PATTERN).test(body) && new RegExp(GUEST_PATTERN).test(body);
  const soldOut = /予約できる客室がありません|ご指定の日程・人数でご用意できる客室がありません/.test(body);
  const hasRoomResults = /客室|プラン/.test(body) && !soldOut;

  if (!expectedSearch) throw new Error("The hotel page did not confirm the requested dates and guest counts");

  if (!hasRoomResults) {
    console.log("No available hotel room for the requested dates and guests; no notification sent.");
  } else {
    const timestamp = new Date().toISOString();
    await sendTelegram(
      `飯店空房通知\n飯店: ${HOTEL_NAME}\n入住: ${DATE_LABEL}\n` +
        `人數: ${GUEST_LABEL}\n結果: 官方網站顯示有可訂客房\n檢查時間: ${timestamp}\n來源: ${SEARCH_URL}`,
    );
    console.log("Available hotel room notification sent to Telegram.");
  }
} finally {
  await browser.close();
}
