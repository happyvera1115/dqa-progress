# DQA 專案進度總覽

平台 Review、FunctionAuto、Parser 三個互動圓餅圖。點選狀態或扇形可篩選明細，支援 Owner 與文字搜尋。

GitHub Pages 發布 `dist/`，不需要使用者啟動本機服務。

資料來自最近發布的 SharePoint 摘要快照，並非即時連線。最後擷取時間可在網頁底部查看。修改 SharePoint 後，需另行同步並更新 `dist/progress.json`，推送後重新發布。

程式不包含登入資訊或原始 Excel。原始 Excel、Redmine 連結仍依公司權限存取。

## 發布

Settings → Pages → Source 選 GitHub Actions。main 更新後自動測試及發布。

## 驗證

`npm test`
