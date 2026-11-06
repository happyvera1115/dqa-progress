# GitHub Pages 發布

將 repository 的 Settings → Pages → Source 設成 GitHub Actions，推送 main 後自動發布 dist。

網站讀取同一目錄的 progress.json，不需要本機 Python 服務。資料為最近發布的快照，並非即時連到 SharePoint。更新 SharePoint 後須另行同步、重新產生 progress.json 並推送。

progress.json 包含使用者授權發布的專案摘要；不包含原始 Excel、登入資訊、本機路徑或 Redmine 回應擷取記錄。不要將 .runtime 或 Downloads 加入 Git。
