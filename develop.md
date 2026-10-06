# 💝 ForMyLove - 開發文檔

使用者介紹與內容修改方式見 [README.md](./README.md)。這份文件記錄程式架構與實作細節。

---

## 📁 專案結構

```
ForMyLove/
├── index.html      # 頁面結構、共用愛心 SVG symbol、分享預覽 meta
├── favicon.svg     # 分頁圖示（與 sprite 同一條愛心路徑）
├── og-image.png    # 分享預覽圖 1200×630；apple-touch-icon.png 為主畫面圖示 180×180
├── style.css       # 樣式（依區塊註解分段）
├── content.js      # window.CONTENT：回憶、情話、計時器、彩蛋訊息
├── script.js       # 五階段狀態機、時間軸、回憶彈窗、計時器、長按
├── ambient.js      # 背景花瓣／星星 canvas（window.Ambient）
├── firework.js     # 花火彩蛋 canvas + Web Audio（window.Firework）
├── photos/         # N.webp（網站用）；originals/ 為原始 JPG
└── vendor/         # GSAP 3.12.5
```

載入順序（全域腳本，沒有 module）：GSAP → `content.js` → `ambient.js` → `firework.js` → `script.js`。

---

## 🏗️ 架構

### 內容與程式分離
`script.js` 只讀 `window.CONTENT`；改文案、日期、照片只需要動 `content.js`。

### 五階段狀態機（`script.js`）
`currentStage`：0 散布 → 1 匯聚 → 2 綻放 → 3 時間軸 → 4 計時器，重新開始回到 0。

每個轉場都照同一個模式寫，讓動畫隨時可以被打斷：
1. `if (isAnimating) return; killTransition(); isAnimating = true;`
2. 建立 GSAP timeline，存進 `activeTimeline`
3. `onComplete` 裡設定 `currentStage`，呼叫 `applyStageClass()`、`snapIdleStageVisuals()`、`updateHint()`，最後 `isAnimating = false`
4. `prefersReduced()` 分支直接跳到結束狀態

`killTransition()` 是唯一的清理點（tween、粒子、彈窗、計時器、rAF、花火）。新增會產生 DOM 節點、tween、interval 或 rAF 的功能，都要在這裡清掉。

GSAP 負責動畫元素的 `transform`／`opacity`；CSS 的 `.stage-N` 只控制 `pointer-events` 和顯示與否。
`.heart-wrapper` 與 `.center-glow` 在 CSS 裡沒有 opacity，所以 `killTransition()` 只清它們的位移、縮放，不清 opacity，否則大愛心會在轉場時閃出來。

### 共用愛心 SVG
所有愛心都是 `<svg><use href="#heart-shape"/></svg>`，引用 `index.html` 裡隱藏的 sprite（用 `createHeartSvg()` 建立）。
`.svg-sprite` 用寬高 0 隱藏而不是 `display:none`，後者會讓 Safari／Firefox 找不到漸層。

### 回憶彈窗
- `showInfoModal(index, pointEl)` 開啟；`stepMemory(±1)` 切換（左右鈕、←／→、水平滑動：超過 50px 且水平量 > 垂直量 1.2 倍）。
- `modalSession` 防止舊的圖片載入結果蓋掉新的。
- 相框比例跟著照片（`--ratio` CSS 變數），切換時以 CSS transition 過渡；照片以 Ken Burns 緩慢推近，焦點可用 `focus` 設定。
- 切換時背後時間軸同步捲到對應愛心；焦點鎖在彈窗內，關閉後回到該愛心。
- 到第一張或最後一張不循環，改成小幅回彈。

### 時間軸
捲動事件以 rAF 節流，同時更新線條長度與愛心浮現（`revealVisiblePoints`）；每顆愛心的標籤是「日期 + 標題」。

### 計時器與週年倒數
- 每一格只在數字改變時翻牌；漸層字放在 `.timer-digit` 上，因為移動中的子元素會破壞父層的 `background-clip: text`。
- `upcomingAnniversaries()` 以本地日期計算 `anniversary: true` 回憶的下一個週年；當天 `inDays` 為 0（顯示「今天是…」並下愛心雨），隔天自動換成下一年。2/29 在平年落在 2/28。

### 開場招呼語
`pickGreeting()` 依打開時的小時挑 `CONTENT.greetings`（`from > to` 表示跨午夜）；當天是週年時改用 `upcomingAnniversaries()` 的標題。`showGreeting()` 在 `init` 與 `resetToStart()` 淡入，`gatherHearts()` 的時間軸裡淡出；其他階段由 `snapIdleStageVisuals()` 設為 0。招呼語固定在畫面頂端，`showGreeting()` 要在 `initializeSmallHearts()` 之前呼叫，小愛心才會避開它的範圍。

### 回一顆愛心
計時器頁 `.timer-reply`：`sendReplyHeart()` 把次數存在 `localStorage`（`formylove.replies`），飛出一顆 `.particle.reply-heart`（因此 `clearParticles()` 會一起清掉），剛好到 `reply.milestones` 的數字時換文字並下愛心雨。只存在同一個瀏覽器，沒有伺服器，不會跨裝置同步。`localStorage` 在無痕模式可能丟例外，所以一律經過 `readStorage()`／`writeStorage()`。

連點彩蛋跟著畫面上的永久計數 `replyCount` 走：`replyCount % reply.burst.pop` 超過 `swell` 時，按鈕 `scale` 從 1 長到 `maxScale`（`swellScale()`；進到 Stage 4 時 `snapIdleStageVisuals()` 也會套用，所以重新整理後膨脹狀態還在）。每到 `pop` 的倍數呼叫 `burstReplyButton()`：按鈕爆裂淡出，原地一顆 `.particle.reply-burst-heart` 放大到超出螢幕、同時淡出，按鈕再長回來；`burstTimeline` 進行中點擊不計數，`killTransition()` 的 `resetReplyBurst()` 會中止它。`prefers-reduced-motion` 下不膨脹也不爆開。

### 密碼頁
`.gate` 放在 `.container` 外、z-index 1000。答案由 `gateAnswers()` 從 `anniversary: true` 的回憶日期產生（`YYYYMMDD` 與 `MMDD`，輸入時非數字會被去掉）。答對後在 `localStorage` 記下 `formylove.unlocked`，才呼叫 `startScene()` 產生小愛心與招呼語；鎖著的時候 `gateOpen` 讓全域 `pointerup` 直接返回，點畫面不會推進階段。
這只是「軟鎖」：答案就在 `content.js`，照片也能直接用網址打開，擋不住看原始碼的人。GitHub Pages 本身沒有存取控制。另外加了 `robots: noindex` 避免被搜尋引擎收錄。

### 花火彩蛋（`firework.js`）
- 觸發：Stage 1／2 長按大愛心 `CONFIG.longPressMs`（1.5s），移動超過 10px 或提早放開就取消。完成長按的那次放開以 `suppressPointerId` 比對後吞掉，不會同時推進階段。結束後停在原本的階段。
- 時間表（秒，`T` 常數）：發射 0.3 → 上升 1.8（花火越過畫面 38% 高度後鏡頭鎖定跟隨）→ 頂點停頓 0.4 → 爆炸（閃光、鏡頭拉遠讓整個圓入鏡）→ 垂落 3（訊息整行從模糊中亮起，日文晚 0.6s）→ 回程 2.5。
- 「鏡頭」＝把 `.container` 往下平移 `camY`；夜空 `.night-sky` 依高度淡入，背景 canvas 以 0.35 倍視差移動。火花 canvas 與訊息放在 `.container` 外面，不跟著場景移動。
- 圓形：火花方向用 Fibonacci 球面均分再投影成平面，速度只加 ±3% 誤差。錦冠菊的垂柳感來自「阻力 + 重力」的固定步長積分，加上離屏 canvas 以半衰期 0.3s 淡出殘影。
- 聲音：Web Audio 即時合成（上升哨音、爆炸低頻＋濾波雜訊、劈啪聲），長按時在使用者手勢內 `primeAudio()` 解鎖。
- 減少動態：靜態夜空 + 金色圓點圈 + 訊息，下一次點擊關閉。

### 背景（`ambient.js`）
淺色模式飄花瓣、深色模式閃星星；分頁隱藏時暫停，DPR 最多 2，減少動態時不繪製。

### 字型
優先系統標楷體，備援 Google Fonts「LXGW WenKai TC（霞鶩文楷）」。標楷體沒有假名，所以日文行加上 `lang="ja"` 並改用霞鶩文楷優先，避免漢字和假名字型混雜。

---

## 🎨 設計

| 用途 | 淺色模式 | 深色模式 |
|------|---------|---------|
| 背景 | `#fafafa` | `#1a1a1a` |
| 愛心漸層 | `#ff6b9d` → `#c23866` | 同左 |
| 文字 | `#333333` | `#fafafa` |

響應式斷點：768px、480px、360px；另有 `max-height: 560px` 處理橫向手機。

---

## 🔍 驗證方式

- 本機伺服器：`python3 -m http.server 31060 --bind 127.0.0.1`（只綁本機）。
- 語法檢查：`node --check script.js && node --check ambient.js && node --check firework.js`。
- Headless Chrome 截圖的限制：
  - 視窗最窄 500px，手機尺寸要用暫時的 harness 頁面把網站放進指定大小的 iframe。
  - 虛擬時間下 rAF 與 CSS transition 不會照常推進，要手動把 GSAP 時間軸 `progress(1)`，或暫停後逐格 `seek()`，並關掉 CSS transition。
  - `script.js` 的頂層 `const` 不是 `window` 屬性，要用 `iframe.contentWindow.eval(...)` 取得。
- 聲音、實際動畫節奏、長按與滑動手勢無法在 headless 驗證，需要在手機上實測。
- 驗證用的 harness、截圖等暫存檔用完即刪。
