# MSC 雲端票價監控

使用 cron-job.org 每 20 分鐘觸發 GitHub Actions，檢查 MSC 比利時網站上的兩個 2027 年 3 月航程：

- `BE20270327TYOTYO`：3 月 27 日，東京往返
- `BE20270323KEETYO`：3 月 23 日，基隆→東京

只有看到低於 €500 的最低可見房價時，才會透過 Telegram 通知。

## 設定

1. 到 repository 的 **Settings → Secrets and variables → Actions**，確認有兩個 repository secrets：
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
2. GitHub workflow 使用 `workflow_dispatch`，由 cron-job.org 的外部排程觸發。
3. cron-job.org 設定為每 20 分鐘，以 POST 呼叫 GitHub workflow dispatch API。

## 行為

- 每次執行會檢查上述兩個 CruiseID。
- 價格必須嚴格低於 €500 才發 Telegram 通知。
- 無法確認日期、航程身份或價格時，不發通知。
- 不會點擊預訂、登入或提交個人資料。
- 價格與可用性是查詢當下的即時資訊，不代表保留或保證。

## 飯店空房監控

既有的 `MSC` cron-job.org 工作每 20 分鐘觸發一次 `msc-monitor.yml`。同一個 workflow 也會檢查アワーズイン阪急官方訂房頁：

- 入住：2027/03/26
- 退房：2027/03/27（1 晚）
- 人數：2 位成人＋1 位小學生
- 房間：1 間

只有官方結果頁顯示有可訂客房時，才會使用相同的 `TELEGRAM_BOT_TOKEN` 與 `TELEGRAM_CHAT_ID` secrets 發送通知；不會點擊預訂或輸入付款資料。

它會立即檢查 2027/03/26–03/27，並在同一次觸發的 10 分鐘後檢查 2027/04/01–04/02；因此兩組監控各自維持每 20 分鐘一次，且執行時間錯開。`.github/workflows/hotel-monitor.yml` 與 `.github/workflows/hotel-monitor-apr1.yml` 仍可用於手動單獨測試。
