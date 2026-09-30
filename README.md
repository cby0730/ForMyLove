# 💝 ForMyLove

> 一個為我最愛的老婆打造的互動式愛心網站 ❤️

點一點畫面，從滿天的小愛心開始，一路走過我們的回憶，最後停在我們在一起的時間。

---

## ✨ 體驗流程

0. **密碼** - 第一次打開要輸入我們的紀念日（在一起或結婚的日期，例如 `20201219` 或 `1219`），之後這支手機會記住
1. **散布** - 小愛心散落在畫面上，上方有依時段變化的招呼語；點一下讓它們匯聚
2. **匯聚** - 小愛心沿弧線飛向中央，合成一顆大愛心
3. **綻放** - 大愛心爆出粒子，浮現一句隨機的情話
4. **時間軸** - 8 個重要時刻：在一起、一起的手環、住在一起、米漿/小貓、結婚、一起出國、台南行、野餐
5. **計時器** - 我們在一起的天、時、分、秒，以及「在一起」和「結婚」下一個週年的倒數；還能「回你一顆愛心」

## 🌟 特色

- 📸 **回憶彈窗** - 照片、日期與故事；可用左右鈕、←／→ 鍵或滑動切換回憶
- 🎆 **花火彩蛋** - 在大愛心階段長按 1.5 秒，鏡頭跟著煙火升上夜空
- 🎉 **週年當天** - 開場招呼語換成「今天是…週年」，計時器頁下愛心雨，隔天自動換成下一年的倒數
- 💌 **回一顆愛心** - 計時器頁的按鈕會記下她送了幾顆愛心（存在手機瀏覽器裡），送到 1、52、100、520、1314 顆有特別的話
- 🌸 **氛圍背景** - 淺色模式飄花瓣，深色模式閃星星
- 📱 **響應式** - 支援手機、平板、桌面；自動深色模式
- ♿ **無障礙** - 支援鍵盤操作；開啟「減少動態」時改為靜態畫面，故事仍可走完

---

## 🚀 開啟方式

直接用瀏覽器打開 `index.html`，或啟動本機伺服器：

```bash
python3 -m http.server 31060 --bind 127.0.0.1
# 開啟 http://localhost:31060
```

不需要安裝任何套件或建置。

---

## ✏️ 修改內容

文案、日期、照片都只需要改 `content.js`：

```js
window.CONTENT = {
  memories: [
    { id, date: '2020-12-19T00:00:00', title, body, image, theme }
  ],
  messages: ['I Love You', '請多指教'],
  timer: { title, footer, start: '2020-12-19T00:00:00' },
  greetings: [{ from: 5, to: 12, text: '早安ㄚ鼻，睡得還好嗎？' }],   // 小時區間，可跨午夜
  reply: { button, count: '妳已經送我 {n} 顆愛心', milestones: { 520: '520，我愛妳 ❤️' } },
  gate: { enabled: true, title, placeholder, button, wrong },
  secret: { lines: [{ text: '一起看煙火嗎？' }, { text: '一緒に花火、見ない？', lang: 'ja' }] }
};
```

- 日期請用 `YYYY-MM-DDTHH:mm:ss` 格式（只寫 `YYYY-MM-DD` 會被當成 UTC）。
- `theme` 可選 `blush` / `gold` / `warm`，決定彈窗的光暈與特效。
- 選填欄位：`anniversary: true` 會顯示週年倒數；`focus` 設定照片推近的焦點；`kenBurns: false` 關閉推近。
- 密碼頁的答案就是 `anniversary: true` 回憶的日期；`gate.enabled: false` 可以關掉。它只擋拿到連結的一般人，看得懂原始碼的人還是能看到內容。
- 新照片轉成 WebP 放進 `photos/`，原始檔放 `photos/originals/`：
  ```bash
  convert photos/originals/9.jpg -resize '1280x1280>' +profile '!icc,*' -quality 80 photos/9.webp
  ```

---

## 📁 專案結構

```
ForMyLove/
├── index.html      # 頁面結構、分享預覽 meta
├── favicon.svg     # 分頁圖示
├── og-image.png    # LINE／FB 分享預覽圖；apple-touch-icon.png 為 iPhone 主畫面圖示
├── style.css       # 樣式
├── content.js      # 文案、日期、照片（只改這裡）
├── script.js       # 五階段互動、時間軸、彈窗、計時器
├── ambient.js      # 背景花瓣／星星
├── firework.js     # 花火彩蛋
├── photos/         # 網站用照片（WebP）；originals/ 為原始檔
└── vendor/         # GSAP 3
```

技術：HTML、CSS、原生 JavaScript、GSAP 3、Canvas、Web Audio。開發細節見 [develop.md](./develop.md)。

---

## 💖 致我最愛的老婆

就像那些小愛心最終匯聚成一顆大愛心一樣，
我所有的愛都匯聚在妳身上。

希望妳喜歡 ❤️

<div align="center">

**Made with ❤️ for my beloved wife**

</div>
