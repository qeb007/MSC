# MSC 雲端監控

使用 GitHub Actions 每 15 分鐘檢查 MSC 比利時網站，鎖定 `BE20270327TYOTYO`，只有看到低於 €450 的最低房價時才透過 Telegram 通知。

## 設定

1. 到 repository 的 **Settings → Secrets and variables → Actions**，新增兩個 repository secrets：
   - `TELEGRAM_BOT_TOKEN`：BotFather 提供的 Token
   - `TELEGRAM_CHAT_ID`：你的 Telegram Chat ID
2. 到 **Actions → MSC fare monitor → Run workflow** 手動執行一次測試。
3. 測試成功後，GitHub Actions 會依照每 15 分鐘的排程執行。

Telegram Token 與 Chat ID 只放在 GitHub Secrets，不會寫入程式碼。GitHub 的排程可能因資源繁忙而延遲，15 分鐘是排程頻率，不是保證精準到秒。

## 行為

- 查不到 2027/3/27 航次或無法驗證船名、航線、晚數時，不發通知。
- 價格必須嚴格低於 €450 才發通知。
- 不會點擊預訂、登入或提交個人資料。
