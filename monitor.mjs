import { chromium } from "playwright";

const TARGET_ID = "BE20270327TYOTYO";
const THRESHOLD_EUR = 450;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SEARCH_URL =
  "https://www.msccruises.be/fr/Search%20Result?area=FAE&departureDateFrom=01%2F03%2F2027&departureDateTo=31%2F03%2F2027&passengers=2%7C0%7C0%7C0&page=1";

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
  const dateButton = page.getByRole("button", {
    name: /(?:samedi|zaterdag) 27 (?:mars|maart) 2027/i,
  }).first();

  if (!(await dateButton.count())) {
    console.log("No 27 March 2027 sailing was visible; no notification sent.");
  } else {
    await dateButton.click();
    await page.waitForTimeout(2_000);
    const body = await page.locator("body").innerText();
    const windowStart = Math.max(0, body.search(/(?:samedi|zaterdag) 27 (?:mars|maart) 2027/i) - 2_500);
    const targetText = body.slice(windowStart, windowStart + 5_000);
    const identityMatches =
      /MSC Bellissima/i.test(targetText) &&
      /Tokyo, Japan/i.test(targetText) &&
      /(?:5 Nuits|5 Nachten)/i.test(targetText) &&
      /27 (?:mars|maart)/i.test(targetText);

    if (!identityMatches) {
      console.log("Target sailing identity could not be verified; no notification sent.");
    } else {
      const price = extractBestPrice(targetText);
      if (price === null) {
        console.log("Target sailing was found but no best price was visible; no notification sent.");
      } else if (price < THRESHOLD_EUR) {
        const timestamp = new Date().toISOString();
        await sendTelegram(
          `MSC 特價通知\nCruiseID: ${TARGET_ID}\n航次: MSC Bellissima，東京往返\n日期: 2027/03/27–2027/04/01\n最低可見價: €${price.toLocaleString("de-DE")}／人\n條件: 低於 €${THRESHOLD_EUR}\n檢查時間: ${timestamp}\n來源: ${SEARCH_URL}`,
        );
        console.log(`Qualifying fare sent to Telegram: €${price}`);
      } else {
        console.log(`No qualifying fare. Lowest visible best price: €${price}`);
      }
    }
  }
} finally {
  await browser.close();
}
