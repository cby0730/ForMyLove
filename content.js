// 只改這個檔案就能更換文案、日期與照片。script.js 只讀 window.CONTENT。
// memories 選填欄位：focus（照片推近的焦點，例如 '30% 80%'）、kenBurns（false 關閉推近）、
// anniversary（true 會在計時器頁顯示每年週年倒數）。
window.CONTENT = {
    memories: [
        {
            id: 'together',
            date: '2020-12-19T00:00:00',
            title: '在一起',
            body: '我很高興我們在那個晚上一起講了電話',
            image: 'photos/1.webp',
            theme: 'blush',
            anniversary: true
        },
        {
            id: 'bracelet',
            date: '2021-02-12T00:00:00',
            title: '一起的手環',
            body: '我們是環環相扣不可分割的另一半',
            image: 'photos/2.webp',
            theme: 'warm',
            kenBurns: false
        },
        {
            id: 'live-together',
            date: '2022-09-24T00:00:00',
            title: '住在一起',
            body: '和你分享同一張小桌子，同一個螢幕，同一份心情',
            image: 'photos/3.webp',
            theme: 'blush'
        },
        {
            id: 'pets',
            date: '2023-08-01T00:00:00',
            title: '米漿/小貓',
            body: '很吵、很黏人，我們也因此很多爭執，但我們都成長很多',
            image: 'photos/4.webp',
            theme: 'warm'
        },
        {
            id: 'wedding',
            date: '2024-12-12T00:00:00',
            title: '結婚',
            body: '從喜歡到承諾一生，我會用盡全力陪妳走到最後',
            image: 'photos/5.webp',
            theme: 'gold',
            anniversary: true
        },
        {
            id: 'abroad',
            date: '2025-06-18T00:00:00',
            title: '一起出國',
            body: '雖然妳會擔心出去玩，但我會讓妳的擔心飛走',
            image: 'photos/6.webp',
            theme: 'blush',
            focus: '30% 80%'
        },
        {
            id: 'tainan-plants',
            date: '2026-03-26T00:00:00',
            title: '台南行',
            body: '老婆買植物買的超開心，我也開心',
            image: 'photos/7.webp',
            theme: 'warm'
        },
        {
            id: 'picnic',
            date: '2026-04-26T00:00:00',
            title: '野餐',
            body: '第一次跟老婆野餐，chill的很舒服',
            image: 'photos/8.webp',
            theme: 'blush',
            focus: '50% 20%'
        }
    ],
    messages: [
        'I Love You',
        '請多指教',
        '今天也很喜歡妳',
        '我會牽著妳',
        '一起回家吧',
        '我的肩膀給妳躺',
        '我們的故事未完',
        '家是妳在的地方'
    ],
    timer: {
        title: '我們已經在一起',
        footer: '我會讓時間一直累積下去 ❤️',
        start: '2020-12-19T00:00:00',
        // 每 N 天一個里程碑（天數＝經過天數，在一起當天是第 0 天）
        milestones: { everyDays: 100 }
    },
    // 長按大愛心 1.5 秒的花火彩蛋；lang 讓日文用正確字型
    secret: {
        lines: [
            { text: '一起看煙火嗎？' },
            { text: '一緒に花火、見ない？', lang: 'ja' }
        ]
    }
};
