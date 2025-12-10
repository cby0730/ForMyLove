# 💝 Interactive Heart Website - 開發文檔

> 一個浪漫、互動式的愛心網站專案，具有優雅的動畫效果和現代化設計

---

## 📁 專案結構

```
ForMyLove/
├── index.html          # HTML 主檔案
├── style.css           # CSS 樣式表
├── script.js           # JavaScript 互動邏輯
├── README.md           # 專案說明
└── develop.md          # 開發文檔（本文檔）
```


---

## 🎯 專案概述

本專案包含多個版本，每個版本都有獨特的互動體驗。所有版本都透過 Git 分支管理。

### 版本總覽

| 版本 | Git 分支 | 發布日期 | 核心特色 |
|------|---------|---------|---------|
| V1 | `47448ab` | 2025-11-19 | 基礎愛心互動、呼吸動畫 |
| V2 | `v2` / `main` | 2025-11-19 | 粒子爆炸、訊息顯示、漣漪效果 |
| V3 | `v3` | 2025-11-21 | 三階段互動、匯聚動畫、循環體驗 |
| V4 | `v4` | 2025-11-25 | 垂直時間軸、回憶展示、版本管理 |
| V5 | `v5` | 2025-11-29 | 開放第2時間點、智慧標籤、動態定位 |
| V6 | `v6` | 2025-12-02 | 開放第3時間點、住再一起回憶 |
| V7 | `v6` | 2025-12-10 | 開放第4時間點、米漿/小貓回憶 |
| V8 | `v6` | 2025-12-10 | 開放第5時間點、結婚回憶 ⭐ 最新版本 |

---

## 📋 V2 版本（經典版）

### 核心功能
- ❤️ **互動式愛心** - 點擊愛心觸發動畫效果
- ✨ **粒子爆炸效果** - 12個愛心粒子向四周散開
- 💌 **訊息顯示** - "I love You" 文字淡入淡出
- 🌊 **漣漪效果** - 背景漣漪擴散動畫
- 📱 **響應式設計** - 支援桌面、平板、手機
- ♿ **無障礙支援** - 鍵盤導航、ARIA 標籤、減少動畫選項

### 設計特色
- 🎨 粉色漸層愛心 (#ff6b9d → #c23866)
- 🌙 自動深色模式支援
- ✨ 流暢的動畫過渡效果
- 🎭 Apple 風格的極簡設計美學

---

## 🌟 V3 版本（三階段互動）


### 核心功能

#### 三階段互動系統
1. **階段 0 - 散布 (Scattered)**
   - 12 個小愛心隨機散布全螢幕
   - 每個小愛心獨立呼吸動畫（2 秒循環）
   - 懸停效果：放大 1.1 倍 + 陰影增強
   - 提示文字：「點擊匯聚愛心 ❤️」

2. **階段 1 - 匯聚 (Gathering)**
   - 點擊觸發 1 秒匯聚動畫
   - 波浪效果：每個小愛心延遲 30ms 啟動
   - 拖尾光暈：徑向漸層 + 脈衝動畫
   - 融合：小愛心淡出，大愛心顯示
   - 提示文字：「再點一次看魔法 ✨」

3. **階段 2 - 爆炸 (Explosion)**
   - 12 個粒子向四周飛散
   - 背景漣漪擴散效果
   - "I love You" 訊息淡入淡出
   - 大愛心脈衝動畫（0.6 秒）
   - 提示文字：「點擊重新開始 🔄」

4. **循環重置**
   - 第三次點擊重置回階段 0
   - 大愛心淡出（0.4 秒）
   - 重新生成小愛心（新的隨機位置）
   - 可無限循環體驗

### 新增元素

#### HTML 結構擴充
```html
<div class="small-hearts-container"></div>  <!-- 小愛心容器 -->
<div class="hint-container">                <!-- 提示容器 -->
    <div class="hint">點擊匯聚愛心 ❤️</div>
</div>
```

#### CSS 新增樣式（+186 行）
- `.small-heart` - 小愛心樣式（40px）
- `.small-heart.gathering` - 匯聚狀態樣式
- `.small-heart.gathering::after` - 拖尾光暈效果
- `.hint` - 毛玻璃提示文字
- `.stage-0/1/2` - 階段控制類別
- `@keyframes smallHeartBreathe` - 小愛心呼吸
- `@keyframes gatherToCenter` - 匯聚動畫
- `@keyframes trailPulse` - 拖尾脈衝

#### JavaScript 狀態機（完全重寫）
- `currentStage` - 當前階段（0/1/2）
- `smallHearts[]` - 小愛心陣列
- `initializeSmallHearts()` - 初始化散布
- `gatherHearts()` - 匯聚邏輯
- `explodeHearts()` - 爆炸邏輯
- `resetToScattered()` - 重置邏輯
- `updateStage()` - 更新 UI 和提示
- `handleClick()` - 狀態機路由

### 技術亮點

#### 1. 波浪匯聚效果
```javascript
smallHearts.forEach((smallHeart, index) => {
    setTimeout(() => {
        smallHeart.style.animation = `gatherToCenter 1000ms forwards`;
    }, index * 30); // 依序延遲 30ms
});
```

#### 2. 拖尾光暈實作
```css
.small-heart.gathering::after {
    content: '';
    background: radial-gradient(circle, rgba(255, 107, 157, 0.6) 0%, transparent 70%);
    animation: trailPulse 0.5s ease-out infinite;
}
```

#### 3. 毛玻璃提示
```css
.hint {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 30px;
}
```

#### 4. 階段控制系統
```css
.stage-0 .heart-wrapper { opacity: 0; pointer-events: none; }
.stage-0 .small-hearts-container { opacity: 1; pointer-events: auto; }

.stage-1 .heart-wrapper { opacity: 1; pointer-events: auto; }
.stage-1 .small-hearts-container { opacity: 0; pointer-events: none; }
```

### 設計特色
- 🎨 更豐富的互動層次（三階段體驗）
- 💫 優雅的波浪動畫（視覺流動感）
- ✨ 夢幻拖尾效果（粒子軌跡視覺化）
- 💬 動態提示系統（用戶引導）
- 🔄 無限循環體驗（永不結束的愛）
- 📱 完整響應式支援（所有裝置）


---

## 🎯 V4 版本（時間軸模式）⭐ 最新版本

### 核心功能

#### 四階段互動系統
1. **階段 0 - 散布 (Scattered)**
   - 12 個小愛心隨機散布全螢幕
   - 每個小愛心獨立呼吸動畫（2 秒循環）
   - 提示文字：「點擊匯聚愛心 ❤️」

2. **階段 1 - 匯聚 (Gathering)**
   - 點擊觸發 1 秒匯聚動畫
   - 波浪效果：每個小愛心延遲 30ms 啟動
   - 拖尾光暈：徑向漸層 + 脈衝動畫
   - 提示文字：「再點一次看魔法 ✨」

3. **階段 2 - 爆炸 (Explosion)**
   - 12 個粒子向四周飛散
   - 背景漣漪擴散效果
   - "I love You" 訊息淡入淡出
   - 提示文字：「點擊查看我們的時光 ⏰」

4. **階段 3 -時間軸 (Timeline)** ⭐ **V4 新增**
   - 大愛心縮小並移動到第一個時間點（1.2秒動畫）
   - 垂直時間軸淡入顯示（0.8秒）
   - 5個時間點：可點擊查看回憶
   - 提示文字：「點擊愛心查看回憶 💕」

5. **循環重置**
   - 點擊時間軸背景重置回階段 0

### 新增元素

#### HTML 結構擴充
```html
<!-- 時間軸容器 -->
<div class="timeline-container">
    <div class="timeline-line"></div>
    <div class="timeline-points"></div>
</div>

<!-- 資訊對話框 -->
<div class="info-modal">
    <div class="info-content">
        <button class="info-close">×</button>
        <div class="info-image-container">
            <img src="" class="info-image">
        </div>
        <div class="info-details">
            <h3 class="info-title"></h3>
            <p class="info-date"></p>
            <p class="info-description"></p>
        </div>
    </div>
</div>
```

#### CSS 新增樣式（+327 行）
- `.timeline-container` - 垂直時間軸容器（70vh）
- `.timeline-line` - 時間軸線條（粉色漸層）
- `.timeline-point` - 時間點愛心（50px，垂直居中）
- `.timeline-point.disabled` - 禁用狀態（透明度0.4）
- `.timeline-label` - 時間點標籤（左右交錯）
- `.info-modal` - 毛玻璃對話框
- `.info-content` - 對話框內容（照片+資訊）
- 響應式支援（桌面/平板/手機）

#### JavaScript 新增邏輯（+179 行）
- `CONFIG.timelineData` - 時間點資料配置
- `formatDate()` - 日期格式化（"Nov 19, 2025"）
- `enterTimeline()` - 進入時間軸模式
- `generateTimelinePoints()` - 動態生成時間點
- `createTimelinePoint()` - 建立時間點元素（含禁用邏輯）
- `showInfoModal()` / `closeInfoModal()` - 對話框控制
- `resetFromTimeline()` - 從時間軸重置

### 時間軸功能

#### 時間點配置
```javascript
timelineData: [
    {
        version: 'V4',
        date: new Date('2020-12-19'),
        title: '在一起',
        description: '',
        image: 'photos/1.jpg'
    },
    {
        version: '敬請期待',  // 禁用狀態
        date: new Date('2021-02-12'),
        title: '一起的手環',
        description: '',
        image: 'photos/2.jpg'
    },
    // ... 共5個時間點
]
```

#### 啟用/禁用機制
- **啟用時間點**：`index === 0` 或將 `version` 改為非「敬請期待」
- **禁用時間點**：`version: '敬請期待'` + `.disabled` class
- **視覺效果**：透明度 40%、無 hover 效果、`cursor: not-allowed`

### 技術亮點

#### 1. 精確對齊動畫
```javascript
// 大愛心縮小至50px（timeline-point尺寸）
const scale = 50 / 300; // 0.167
heartWrapper.style.transform = `translate(0, ${deltaY}px) scale(${scale})`;

// 時間點垂直居中對齊線條
.timeline-point {
    transform: translate(-50%, -50%);  // 水平+垂直居中
}
```

#### 2. 日期格式化
```javascript
function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', ...];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
// 輸出: "Dec 19, 2020"
```

#### 3. 條件式渲染
```javascript
// 第一個時間點顯示日期，其他顯示版本名
if (index === 0) {
    label.textContent = formatDate(data.date);
} else {
    label.textContent = data.version;  // "敬請期待"
}
```

#### 4. 毛玻璃效果
```css
.info-content {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
}
```

### 設計特色
- 📅 **垂直時間軸** - 時間向下流動，5個時間點均勻分布
- 🏷️ **左右交錯標籤** - 視覺平衡，易於閱讀
- 💬 **毛玻璃對話框** - 現代美學，半透明背景
- 🔒 **禁用狀態管理** - 清晰區分已開放/未開放時間點
- 🎨 **精確動畫** - 大愛心完美對齊第一個時間點
- 📱 **完整響應式** - 桌面/平板/手機完美適配

### 重要更新記錄

#### 2025-11-25 更新
1. **修正重疊問題** - 大愛心移動後自動隱藏（`opacity: 0`）
2. **修正標籤顯示** - V5-V8 改為「敬請期待」
3. **修正對齊問題** - 時間點使用 `translate(-50%, -50%)` 垂直居中
4. **更新第一個時間點** - 日期改為 2020-12-19，標籤顯示日期
5. **實作禁用機制** - 後四個時間點不可點擊（`.disabled`）
6. **準備第二時間點** - 日期 2021-02-12，標題「一起的手環」


### 當前狀態（V4 初版）
- ✅ **已開放**：時間點 1（2020-12-19 - 在一起）
- 🔒 **已準備**：時間點 2（2021-02-12 - 一起的手環）
- 🔒 **預留**：時間點 3、4、5

#### 2025-11-29 更新（V5 版本）
1. **開放第二時間點** - 將第2個時間點從「敬請期待」改為「V5」，正式開放
2. **智慧標籤系統** - 啟用的時間點顯示日期，禁用的顯示「敬請期待」
3. **動態定位系統** - `currentVersionIndex` 改為 1，愛心自動移動到第2個時間點
4. **簡化邏輯** - 標籤渲染基於 `isEnabled` 狀態，不再依賴 `index`
5. **自動啟用機制** - 只需修改 `version` 欄位即可控制時間點啟用/禁用

### 當前狀態（V5 版本）
- ✅ **已開放**：時間點 1（2020-12-19 - 在一起）
- ✅ **已開放**：時間點 2（2021-02-12 - 一起的手環）⭐ 新增
- 🔒 **預留**：時間點 3、4、5

#### 2025-12-02 更新（V6 版本）
1. **開放第三時間點** - 將第3個時間點從「敬請期待」改為「V6」，正式開放
2. **更新時間點資料** - 日期：2022-09-24，標題：「住再一起」
3. **動態定位更新** - `currentVersionIndex` 改為 2，愛心自動移動到第3個時間點
4. **使用真實照片** - photos/3.jpg

#### 2025-12-10 更新（V7/V8 版本）
1. **開放第四時間點（V7）** - 將第4個時間點從「敬請期待」改為「V7」，正式開放
2. **V7 時間點資料** - 日期：2023-08-01，標題：「米漿/小貓」
3. **開放第五時間點（V8）** - 將第5個時間點從「敬請期待」改為「V8」，正式開放
4. **V8 時間點資料** - 日期：2024-12-12，標題：「結婚」
5. **動態定位更新** - `currentVersionIndex` 改為 4，愛心自動移動到第5個時間點
6. **使用真實照片** - photos/4.jpg、photos/5.jpg
7. **完成所有時間點** - 5個時間點全部開放完成！

### 當前狀態（V8 版本）
- ✅ **已開放**：時間點 1（2020-12-19 - 在一起）
- ✅ **已開放**：時間點 2（2021-02-12 - 一起的手環）
- ✅ **已開放**：時間點 3（2022-09-24 - 住再一起）
- ✅ **已開放**：時間點 4（2023-08-01 - 米漿/小貓）⭐ V7 新增
- ✅ **已開放**：時間點 5（2024-12-12 - 結婚）⭐ V8 新增


---

## 🏗️ 技術架構

### HTML 結構

```html
body
└── .container                  # 主容器（置中佈局）
    ├── .heart-wrapper          # 愛心包裹器（可點擊）
    │   ├── svg.heart           # SVG 愛心圖形
    │   └── .message-container  # 訊息容器
    │       └── .message        # 訊息文字
    └── .particles-container    # 粒子容器（動態生成）
```

### CSS 架構

#### CSS 變數 (`:root`)
```css
--bg-color              # 背景顏色
--heart-color-start     # 愛心漸層起始色
--heart-color-end       # 愛心漸層結束色
--text-color            # 文字顏色
--glow-color            # 發光顏色
--message-color         # 訊息文字顏色
--transition-smooth     # 過渡曲線
```

#### 主要動畫
| 動畫名稱 | 觸發時機 | 持續時間 | 效果 |
|---------|---------|---------|------|
| `breathe` | 頁面載入 | 2.5s（循環） | 愛心呼吸效果 |
| `pulse` | 點擊愛心 | 0.6s | 愛心脈衝放大 |
| `particleFloat` | 點擊愛心 | 1.5s | 粒子飛散 |
| `rippleExpand` | 點擊愛心 | 2s | 漣漪擴散 |

#### 響應式斷點
- **桌面**: > 768px（愛心 300px）
- **平板**: ≤ 768px（愛心 240px）
- **手機**: ≤ 480px（愛心 200px）
- **小手機**: ≤ 360px（愛心 160px）

### JavaScript 架構

#### 配置參數 (CONFIG)
```javascript
particleCount: 12       // 粒子數量
particleDuration: 1500  // 粒子動畫持續時間（ms）
messageDuration: 2000   // 訊息顯示時間（ms）
clickCooldown: 600      // 點擊冷卻時間（ms）
```

#### 核心函數
| 函數名稱 | 功能說明 |
|---------|---------|
| `createParticle()` | 創建單個愛心粒子元素（含 SVG） |
| `animateParticles()` | 生成並動畫化所有粒子 |
| `showMessage()` | 顯示/隱藏訊息文字 |
| `createRipple()` | 創建漣漪效果 |
| `handleHeartClick()` | 主要點擊事件處理器 |

#### 狀態管理
- `isAnimating`: 布林值，防止動畫執行期間重複觸發

---

## 🔧 開發指南

### 1. 修改愛心顏色

**CSS 方式**（推薦）
```css
/* 在 style.css 中修改變數 */
:root {
    --heart-color-start: #your-color-1;
    --heart-color-end: #your-color-2;
}
```

**HTML 方式**
```html
<!-- 在 index.html 的 linearGradient 中修改 -->
<stop offset="0%" style="stop-color:#your-color-1;stop-opacity:1" />
<stop offset="100%" style="stop-color:#your-color-2;stop-opacity:1" />
```

### 2. 調整動畫效果

#### 改變粒子數量
```javascript
// script.js
const CONFIG = {
    particleCount: 20,  // 從 12 改成 20
    // ...
};
```

#### 修改呼吸動畫速度
```css
/* style.css */
.heart {
    animation: breathe 3.5s ease-in-out infinite;  /* 從 2.5s 改成 3.5s */
}
```

#### 調整脈衝強度
```css
/* style.css - pulse 動畫 */
@keyframes pulse {
    25% {
        transform: scale(1.25);  /* 從 1.15 增加到 1.25 */
    }
}
```

### 3. 修改訊息內容

#### 更改文字
```html
<!-- index.html -->
<div class="message">Your Custom Message</div>
```

#### 調整字型
```html
<!-- index.html - 更換 Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Dancing+Script&display=swap" rel="stylesheet">
```

```css
/* style.css */
.message {
    font-family: 'Dancing Script', cursive;
}
```

### 4. 添加新功能

#### 範例：添加音效
```javascript
// script.js
function handleHeartClick() {
    if (isAnimating) return;
    isAnimating = true;
    
    // 播放音效
    const audio = new Audio('love-sound.mp3');
    audio.play();
    
    // ... 其他程式碼
}
```

#### 範例：點擊計數器
```javascript
// script.js - 在頂部添加
let clickCount = 0;

// 在 handleHeartClick() 中添加
function handleHeartClick() {
    // ...
    clickCount++;
    console.log(`點擊次數: ${clickCount}`);
}
```

### 5. 效能優化建議

#### 減少 DOM 操作
```javascript
// ❌ 不佳
for (let i = 0; i < 12; i++) {
    document.body.appendChild(createParticle());
}

// ✅ 較佳（使用 DocumentFragment）
const fragment = document.createDocumentFragment();
for (let i = 0; i < 12; i++) {
    fragment.appendChild(createParticle());
}
particlesContainer.appendChild(fragment);
```

#### 使用 CSS Transform 而非 position
```css
/* ✅ 使用 transform（GPU 加速） */
.particle {
    transform: translate(var(--tx), var(--ty));
}

/* ❌ 避免使用 left/top */
.particle {
    left: var(--x);
    top: var(--y);
}
```

---

## 🐛 常見問題與解決方案

### 問題 1: 滑鼠懸停時出現粉色方塊閃爍
**原因**: 之前版本的 CSS 衝突  
**解決**: 已在最新版本修復，確保 `hover` 效果只應用於 `.heart` 而非 `.heart-wrapper`

### 問題 2: 移動裝置雙擊放大
**原因**: 瀏覽器預設行為  
**解決**: 已添加 `touchstart` 事件的 `preventDefault()`
```javascript
heartWrapper.addEventListener('touchstart', (e) => {
    e.preventDefault(); // 防止雙擊放大
    handleHeartClick();
}, { passive: false });
```

### 問題 3: 粒子動畫不流暢
**原因**: 瀏覽器效能不足  
**解決**: 降低粒子數量或使用 `will-change` 屬性
```css
.particle {
    will-change: transform, opacity;
}
```

### 問題 4: 深色模式下背景太暗
**原因**: 媒體查詢設定  
**解決**: 調整深色模式顏色
```css
@media (prefers-color-scheme: dark) {
    :root {
        --bg-color: #2a2a2a;  /* 從 #1a1a1a 調亮 */
    }
}
```

---

## 📱 測試清單

### V2 版本功能測試
- [ ] 點擊愛心觸發所有動畫（粒子、訊息、漣漪、脈衝）
- [ ] 滑鼠懸停時愛心放大且發光
- [ ] 移動裝置支援觸控操作
- [ ] 鍵盤 Enter/Space 鍵可觸發動畫
- [ ] 動畫執行中無法重複觸發（防抖）

### V3 版本功能測試
#### 階段 0（散布）
- [ ] 頁面載入時顯示 12 個小愛心
- [ ] 小愛心隨機分布（邊距 80px）
- [ ] 小愛心呼吸動畫流暢（2 秒循環）
- [ ] 懸停時小愛心放大 1.1 倍
- [ ] 提示顯示「點擊匯聚愛心 ❤️」
- [ ] 大愛心隱藏不可見

#### 階段 1（匯聚）
- [ ] 點擊觸發匯聚動畫
- [ ] 匯聚時間為 1 秒（符合需求）
- [ ] 小愛心帶波浪效果（依序延遲 30ms）
- [ ] 拖尾光暈效果清晰可見
- [ ] 小愛心正確融合淡出
- [ ] 大愛心從中心放大顯示
- [ ] 提示更新為「再點一次看魔法 ✨」

#### 階段 2（爆炸）
- [ ] 點擊觸發粒子爆炸
- [ ] 12 個粒子向四周散開
- [ ] 訊息 "I love You" 正確顯示
- [ ] 漣漪效果擴散
- [ ] 提示更新為「點擊重新開始 🔄」

#### 循環重置
- [ ] 第三次點擊觸發重置
- [ ] 大愛心淡出（0.4 秒）
- [ ] 小愛心重新生成（新位置）
- [ ] 提示重置為「點擊匯聚愛心 ❤️」
- [ ] 可重複循環多次

#### 防抖測試
- [ ] 匯聚動畫期間無法重複點擊
- [ ] 爆炸動畫期間無法重複點擊
- [ ] 重置動畫期間無法重複點擊

### 視覺測試
- [ ] 愛心呼吸動畫流暢
- [ ] 粒子向四周均勻散開
- [ ] 訊息文字居中且清晰
- [ ] 無閃爍或視覺錯誤
- [ ] 小愛心拖尾效果明顯
- [ ] 波浪動畫視覺流暢
- [ ] 提示文字毛玻璃效果

### 響應式測試
- [ ] 桌面瀏覽器（1920x1080+）
- [ ] 平板（768px - 1024px）
- [ ] 手機（375px - 480px）
- [ ] 小螢幕手機（<360px）
- [ ] 提示文字大小適配
- [ ] 小愛心大小在小螢幕上適當

### 瀏覽器相容性
- [ ] Chrome/Edge（推薦）
- [ ] Safari（iOS/macOS）
- [ ] Firefox
- [ ] Samsung Internet
- [ ] backdrop-filter 支援檢查

### 無障礙測試
- [ ] 鍵盤完整導航
- [ ] 螢幕閱讀器正確朗讀
- [ ] 減少動畫模式有效
- [ ] 顏色對比度符合 WCAG 標準


---

## 🔄 版本管理建議

### Git 工作流程
```bash
# 初始化（如尚未完成）
git init
git add .
git commit -m "Initial commit: Interactive heart website"

# 功能分支開發
git checkout -b feature/add-sound-effects
# ... 進行開發
git add .
git commit -m "feat: Add sound effects on click"
git checkout main
git merge feature/add-sound-effects

# 標籤版本
git tag -a v1.0.0 -m "First stable release"
```

### 提交訊息規範
```
feat: 新功能
fix: 錯誤修復
style: 樣式調整
refactor: 代碼重構
docs: 文檔更新
test: 測試相關
chore: 構建/工具變動
```

---

## 📦 部署指南

### 靜態網站託管選項

#### 1. GitHub Pages (免費)
```bash
# 創建 gh-pages 分支
git checkout -b gh-pages
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```
訪問: `https://your-username.github.io/repo-name/`

#### 2. Netlify (免費)
1. 拖放專案資料夾到 Netlify
2. 或連接 GitHub 倉庫自動部署

#### 3. Vercel (免費)
```bash
npm i -g vercel
vercel
```

### 自訂網域
在託管平台設定中添加 CNAME 記錄：
```
CNAME: your-domain.com → hosting-provider-url
```

---

## 🎨 設計系統

### 顏色規範
| 用途 | 淺色模式 | 深色模式 |
|------|---------|---------|
| 背景 | `#fafafa` | `#1a1a1a` |
| 愛心起始色 | `#ff6b9d` | `#ff6b9d` |
| 愛心結束色 | `#c23866` | `#c23866` |
| 文字 | `#333333` | `#fafafa` |
| 發光 | `rgba(255,107,157,0.6)` | 同左 |

### 字型系統
- **標題/特殊**: Great Vibes (草寫字體)
- **內文**: Inter (無襯線字體)
- **後備**: -apple-system, BlinkMacSystemFont, sans-serif

### 間距系統
```css
/* 標準間距單位 */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

---

## 🚀 進階功能建議

### 1. 多語言支援
```javascript
const MESSAGES = {
    'zh-TW': 'I love You',
    'en': 'I love You',
    'ja': '愛してる',
    'ko': '사랑해'
};
```

### 2. 主題切換器
```javascript
const themes = {
    pink: { start: '#ff6b9d', end: '#c23866' },
    blue: { start: '#6ba3ff', end: '#3866c2' },
    purple: { start: '#b96bff', end: '#6638c2' }
};
```

### 3. 動畫速度控制
```html
<input type="range" min="0.5" max="2" step="0.1" id="speedControl">
```

### 4. 粒子軌跡記錄
```javascript
const particleHistory = [];
function animateParticles() {
    // ... 記錄每個粒子的位置
    particleHistory.push({ x, y, timestamp: Date.now() });
}
```

---

## 📚 參考資源

### 文檔
- [MDN Web Docs](https://developer.mozilla.org/)
- [CSS-Tricks](https://css-tricks.com/)
- [Web.dev](https://web.dev/)

### 靈感來源
- [CodePen](https://codepen.io/) - 互動效果範例
- [Dribbble](https://dribbble.com/) - 設計靈感
- [Awwwards](https://www.awwwards.com/) - 優秀網站

### 工具
- [Can I Use](https://caniuse.com/) - 瀏覽器相容性查詢
- [ColorHunt](https://colorhunt.co/) - 顏色配色
- [Google Fonts](https://fonts.google.com/) - 免費字型

---

## 📝 代碼審查建議

### ✅ 優點
1. **清晰的代碼組織** - 使用區塊註解分隔不同功能
2. **良好的命名規範** - 變數和函數名稱語意清晰
3. **響應式設計完善** - 支援多種裝置尺寸
4. **無障礙考量周全** - 鍵盤支援、ARIA 標籤
5. **性能優化** - 自動清理動畫元素
6. **現代化語法** - 使用 CSS 變數、ES6 語法

### ⚠️ 可改進項目

#### 1. 添加錯誤處理
```javascript
// 在 script.js 頂部添加
if (!heartWrapper || !heart || !message || !particlesContainer) {
    console.error('Required DOM elements not found!');
}
```

#### 2. 配置集中管理
```javascript
// 將更多硬編碼值移到 CONFIG
const CONFIG = {
    particleCount: 12,
    particleDuration: 1500,
    messageDuration: 2000,
    clickCooldown: 600,
    particleDistance: { min: 200, max: 500 },  // 新增
    heartSizes: {                              // 新增
        desktop: '300px',
        tablet: '240px',
        mobile: '200px'
    }
};
```

#### 3. 添加註解（中英文混合）
```javascript
// ===== 創建粒子元素 =====
// Creates a single heart particle with SVG gradient
function createParticle() {
    // ...
}
```

#### 4. 瀏覽器前綴支援
```css
.heart {
    -webkit-filter: drop-shadow(...);
    filter: drop-shadow(...);
}
```

#### 5. 模組化結構（進階）
```javascript
// heartAnimation.js
export class HeartAnimation {
    constructor(config) { /* ... */ }
    init() { /* ... */ }
    handleClick() { /* ... */ }
}

// main.js
import { HeartAnimation } from './heartAnimation.js';
const animation = new HeartAnimation(CONFIG);
animation.init();
```

---

## 🔐 安全性檢查清單

- [x] 無外部腳本注入風險
- [x] 無 XSS 攻擊向量
- [x] 使用 HTTPS（部署時）
- [x] 無敏感資料暴露
- [x] CSP 標頭建議（部署時添加）

```html
<!-- 建議在 index.html 添加 -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com;">
```

---

## 📧 維護聯絡

- **專案名稱**: ForMyLove
- **專案性質**: 為老婆特製的愛的網站
- **最後更新**: 2025-12-10
- **當前版本**: V8.0.0 (完整時間軸版)

---

## 📄 授權

本專案為個人作品，專為我最愛的老婆打造，請勿未經許可擅自商用。

---

**💡 提示**: 這是一個持續演進的專案，隨著我對老婆的愛不斷成長，功能也會持續更新！

*Made with ❤️ and code for my beloved wife*

