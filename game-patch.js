/* ============================================================
   ПАТЧ: автоочистка "зависших" онлайн-партий (эфиров)
   ------------------------------------------------------------
   Проблема: комната в Firestore ('rooms') создаётся со статусом
   'active' и никогда не переводится в 'finished' / не удаляется,
   если партия брошена (например, тестовая игра "сам с собой").
   Из-за этого она вечно висит в списке "Смотреть партии".

   Что делает этот файл (ничего не ломает в существующем коде,
   просто дополняет его):
   1) при закрытии вкладки/уходе со страницы помечает текущую
      комнату игрока как finished;
   2) при каждом открытии списка трансляций и раз в минуту сам
      чистит (переводит в finished) комнаты без активности более
      2 часов — включая старые записи без временных меток вовсе;
   3) добавляет в админ-панель (?admin=ownergame) раздел
      "📡 Комнаты" со списком ВСЕХ комнат и кнопками
      "Завершить" / "Удалить" для ручной чистки.

   ПОДКЛЮЧЕНИЕ: добавьте в index.html сразу ПОСЛЕ game.js:
   <script src="game-patch.js"></script>
   ============================================================ */
(function () {
  function init() {
    if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) {
      console.warn('[game-patch] Firebase ещё не инициализирован, патч пропущен');
      return;
    }
    const db = firebase.firestore();
    const STALE_MS = 2 * 60 * 60 * 1000; // 2 часа без активности -> комната считается заброшенной

    function roomTimestamp(data) {
      const candidates = [data.updatedAt, data.lastMoveAt, data.lastActivity, data.createdAt];
      for (const c of candidates) {
        if (!c) continue;
        if (typeof c === 'number') return c;
        if (c.toMillis) return c.toMillis();
      }
      return 0;
    }

    async function cleanupStaleRooms() {
      try {
        const snap = await db.collection('rooms').where('status', '==', 'active').get();
        const now = Date.now();
        const jobs = [];
        snap.forEach(doc => {
          const data = doc.data() || {};
          const ts = roomTimestamp(data);
          const isStale = ts ? (now - ts > STALE_MS) : true; // нет меток времени = старая запись, чистим
          if (isStale) {
            jobs.push(doc.ref.update({ status: 'finished', finishedAt: Date.now() }).catch(() => {}));
          }
        });
        if (jobs.length) {
          await Promise.all(jobs);
          console.log('[game-patch] Завершено зависших комнат:', jobs.length);
        }
      } catch (e) {
        console.warn('[game-patch] cleanupStaleRooms error', e);
      }
    }

    // чистим сразу при загрузке и затем каждую минуту
    cleanupStaleRooms();
    setInterval(cleanupStaleRooms, 60 * 1000);

    // чистим перед тем как показать список эфиров/трансляций
    const origOpenSpectateList = window.openSpectateList;
    if (typeof origOpenSpectateList === 'function') {
      window.openSpectateList = function (...args) {
        cleanupStaleRooms().finally(() => origOpenSpectateList.apply(this, args));
      };
    }

    // если игрок закрывает вкладку/уходит во время своей партии - помечаем комнату завершённой
    window.addEventListener('pagehide', () => {
      try {
        const rid = window.currentRoomId || window.spectateRoomId;
        if (rid) {
          db.collection('rooms').doc(rid).update({ status: 'finished', finishedAt: Date.now() });
        }
      } catch (e) {}
    });

    /* ---------- Раздел "Комнаты" в админ-панели ---------- */
    window.renderAdminRoomsPanel = function (container) {
      if (!container || document.getElementById('adminRoomsBox')) return;
      const box = document.createElement('div');
      box.id = 'adminRoomsBox';
      box.style.cssText = 'margin-top:24px;padding:16px;background:#1b140d;border-radius:12px;font-family:Arial,sans-serif;color:#f2e6c9;';
      box.innerHTML =
        '<h2 style="margin:0 0 12px;">📡 Комнаты (эфиры/партии)</h2>' +
        '<button id="cleanupAllBtn" style="margin-bottom:12px;padding:8px 14px;border-radius:8px;border:none;background:#caa15a;cursor:pointer;font-weight:bold;">🧹 Завершить все зависшие</button>' +
        '<div id="adminRoomsList">Загрузка...</div>';
      container.appendChild(box);

      async function load() {
        const list = box.querySelector('#adminRoomsList');
        list.innerHTML = 'Загрузка...';
        const snap = await db.collection('rooms').get();
        if (snap.empty) { list.innerHTML = 'Комнат нет.'; return; }
        list.innerHTML = '';
        snap.forEach(doc => {
          const d = doc.data() || {};
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #332a1d;gap:8px;flex-wrap:wrap;';
          const info = document.createElement('div');
          info.innerHTML = '<b>' + (d.hostName || d.hostNickname || '?') + '</b> vs <b>' +
            (d.guestName || d.guestNickname || '?') + '</b> — статус: <span style="color:' +
            (d.status === 'active' ? '#7fd17f' : '#999') + '">' + (d.status || '—') +
            '</span> — <code style="opacity:.7">' + doc.id + '</code>';
          const btnGroup = document.createElement('div');
          const finishBtn = document.createElement('button');
          finishBtn.textContent = '✅ Завершить';
          finishBtn.style.cssText = 'margin-right:6px;padding:4px 10px;border-radius:6px;border:none;cursor:pointer;';
          finishBtn.onclick = async () => { await doc.ref.update({ status: 'finished', finishedAt: Date.now() }); load(); };
          const delBtn = document.createElement('button');
          delBtn.textContent = '🗑 Удалить';
          delBtn.style.cssText = 'padding:4px 10px;border-radius:6px;border:none;cursor:pointer;background:#a33;color:#fff;';
          delBtn.onclick = async () => { if (confirm('Удалить комнату ' + doc.id + '?')) { await doc.ref.delete(); load(); } };
          btnGroup.appendChild(finishBtn);
          btnGroup.appendChild(delBtn);
          row.appendChild(info);
          row.appendChild(btnGroup);
          list.appendChild(row);
        });
      }
      box.querySelector('#cleanupAllBtn').addEventListener('click', async () => { await cleanupStaleRooms(); load(); });
      load();
    };

    // встраиваем раздел комнат в существующую админ-панель, не трогая её код
    const origRenderAdmin = window.renderAdminPanel;
    if (typeof origRenderAdmin === 'function') {
      window.renderAdminPanel = function (...args) {
        origRenderAdmin.apply(this, args);
        setTimeout(() => window.renderAdminRoomsPanel(document.body), 200);
      };
      // если страница уже открыта с ?admin=ownergame к моменту загрузки патча —
      // перерисуем панель, чтобы добавить блок комнат
      try {
        const params = new URLSearchParams(window.location.search);
        if (typeof checkIsAdmin === 'function' && checkIsAdmin() && document.getElementById('adminList')) {
          window.renderAdminRoomsPanel(document.body);
        }
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
