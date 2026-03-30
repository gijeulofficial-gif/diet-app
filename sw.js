const CACHE_NAME = 'diet-v1';
const ASSETS = ['/diet/index.html'];

// Install
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ─── Background Alarm System ───
const ALARM_MESSAGES = {
  workout: '운동 준비 시간입니다! 물 한 잔 + 바나나 먹고 시작하세요 💪',
  lunch: '점심 식사 시간입니다! 식단 체크 잊지 마세요 🍚',
  dinner: '저녁 식사 시간입니다! 식후 산책도 잊지 마세요 🚶',
  walk: '저녁 산책 시간입니다! 20~30분 가볍게 걸어보세요 🌙',
};

// Track sent alarms to prevent duplicates per day
let sentToday = {};

function resetSentIfNewDay() {
  const today = new Date().toDateString();
  if (sentToday._date !== today) {
    sentToday = { _date: today };
  }
}

function checkAlarms() {
  resetSentIfNewDay();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${hh}:${mm}`;

  // Get settings from client
  self.clients.matchAll().then((clients) => {
    if (clients.length === 0) return;
    clients[0].postMessage({ type: 'GET_ALARMS' });
  });
}

// Listen for alarm settings from client
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'ALARM_SETTINGS') {
    const alarms = e.data.alarms || {};
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    resetSentIfNewDay();

    Object.entries(alarms).forEach(([key, alarm]) => {
      if (alarm.on && alarm.time === currentTime && !sentToday[key]) {
        sentToday[key] = true;
        const msg = ALARM_MESSAGES[key] || '알림';
        self.registration.showNotification('71키로의 여정', {
          body: msg,
          icon: '/diet/manifest.json',
          badge: '/diet/manifest.json',
          tag: key,
        });
      }
    });
  }
});

// Check alarms every minute
setInterval(checkAlarms, 60000);
