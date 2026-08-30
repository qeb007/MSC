# MSC 雲端票價監控

使用 cron-job.org 每 15 分鐘觸發 GitHub Actions，檢查 MSC 比利時網站上的兩個 2027 年 3 月航程：

- `BE20270327TYOTYO`：3 月 27 日，東京往返
- `BE20270323KEETYO`：3 月 23 日，基隆→東京

只有看到低於 €500 的最低可見房價時，才會透過 Telegram 通知。

## 設定

1. 到 repository 的 **Settings → Secrets and variables → Actions**，確認有兩個 repository secrets：
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
2. GitHub workflow 使用 `workflow_dispatch`，由 cron-job.org 的外部排程觸發。
3. cron-job.org 設定為每 15 分鐘，以 POST 呼叫 GitHub workflow dispatch API。

## 行為

- 每次執行會檢查上述兩個 CruiseID。
- 價格必須嚴格低於 €500 才發 Telegram 通知。
- 無法確認日期、航程身份或價格時，不發通知。
- 不會點擊預訂、登入或提交個人資料。
- 價格與可用性是查詢當下的即時資訊，不代表保留或保證。

