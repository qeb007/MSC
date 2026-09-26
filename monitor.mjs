import { chromium } from "playwright";

const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SEARCH_URL =
  "https://www.msccruises.be/fr/Search%20Result?area=FAE&departureDateFrom=01%2F03%2F2027&departureDateTo=31%2F03%2F2027&passengers=2%7C0%7C0%7C0&page=1";

const TARGETS = [
  {
    id: "BE20270327TYOTYO",
    threshold: 500,
    day: 27,
    route: "東京往返",
    dateLabel: "2027/03/27–2027/04/01",
    identityPatterns: [
      /MSC Bellissima/i,
      /Tokyo, Japan/i,
      /(?:5 Nuits|5 Nachten|5 Nights)/i,
    ],
  },
  {
    id: "BE20270323KEETYO",
    threshold: 400,
    day: 23,
    route: "基隆→東京",
    dateLabel: "2027/03/23",
    identityPatterns: [/Keelung/i, /Tokyo, Japan/i],
  },
];

function euroNumber(value) {
  return Number(value.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
}

function extractBestPrice(text) {
  const match = text.match(
    /(?:Meilleur prix|Best price|Beste prijs)[\s\S]{0,120}?(\d[\d.\s]*(?:,\d{1,2})?)\s*€/i,
  );
  return match ? euroNumber(match[1]) : null;
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !CHAT_ID) throw new Error("Telegram secrets are not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text }),
  });
  if (!response.ok) throw new Error(`Telegram API returned HTTP ${response.status}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ locale: "fr-BE" });
const dateName = (day) =>
  new RegExp(
    `(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) ${day} (?:mars|maart|March) 2027`,
    "i",
  );

try {
  await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  for (const label of [/Afwijzen en sluiten/i, /Weigeren/i, /Refuser/i]) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.count()) {
      await button.click({ timeout: 3_000 }).catch(() => {});
      break;
    }
  }

  await page.waitForTimeout(5_000);

  for (const target of TARGETS) {
    const datePattern = dateName(target.day);
    const dateButton = page.getByRole("button", { name: datePattern }).first();

    if (!(await dateButton.count())) {
      console.log(`${target.id}: date ${target.day} March 2027 was not visible; no notification sent.`);
      continue;
    }

    await dateButton.click();
    await page.waitForTimeout(2_000);
    const body = await page.locator("body").innerText();
    const dateIndex = body.search(datePattern);
    const targetText = body.slice(Math.max(0, dateIndex - 2_500), Math.max(0, dateIndex) + 5_000);
    const identityMatches = target.identityPatterns.every((pattern) => pattern.test(targetText));

    if (!identityMatches) {
      console.log(`${target.id}: sailing identity could not be verified; no notification sent.`);
      continue;
    }

    const price = extractBestPrice(targetText);
    if (price === null) {
      console.log(`${target.id}: sailing found but no best price was visible; no notification sent.`);
    } else if (price < target.threshold) {
      const timestamp = new Date().toISOString();
      await sendTelegram(
        `MSC 特價通知\nCruiseID: ${target.id}\n航程: ${target.route}\n日期: ${target.dateLabel}\n最低可見價: €${price.toLocaleString("de-DE")}／人\n條件: 低於 €${target.threshold}\n檢查時間: ${timestamp}\n來源: ${SEARCH_URL}`,
      );
      console.log(`${target.id}: qualifying fare sent to Telegram: €${price}`);
    } else {
      console.log(`${target.id}: no qualifying fare. Lowest visible best price: €${price}`);
    }
  }
} finally {
  await browser.close();
}
