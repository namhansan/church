// 은혜교회 홈페이지 — 추가 기능(갤러리/주보/후원단체/실시간 예배)
// main.js가 먼저 로드된 뒤 이 파일이 이어서 실행됩니다.

(function () {
  const CACHE_BUST = `?v=${Date.now()}`;

  function t(ko, en) {
    return window.siteLang === 'en' ? en : ko;
  }

  async function loadJSON(path) {
    try {
      const res = await fetch(path + CACHE_BUST);
      if (!res.ok) throw new Error(`${path} 불러오기 실패`);
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }

  // -------------------- 캘린더 --------------------
  let calEvents = [];
  let calEventMap = {}; // 'YYYY-MM-DD' -> [events]
  let calView = 'month';
  let calToday = new Date();
  let calYear = calToday.getFullYear();
  let calMonth = calToday.getMonth() + 1; // 1-12
  let calSelectedDate = null;

  function ymd(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function buildCalEventMap(events) {
    const map = {};
    events.forEach(ev => {
      const start = new Date(ev.date);
      const end = ev.end_date ? new Date(ev.end_date) : start;
      if (isNaN(start)) return;
      const cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard < 60) {
        const key = ymd(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
        if (!map[key]) map[key] = [];
        map[key].push(ev);
        cursor.setDate(cursor.getDate() + 1);
        guard++;
      }
    });
    return map;
  }

  async function renderCalendarPage() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;

    const data = await loadJSON('content/calendar.json');
    calEvents = (data && data.events) || [];
    calEventMap = buildCalEventMap(calEvents);

    // 뷰 전환 버튼
    const monthBtn = document.getElementById('cal-view-month');
    const yearBtn = document.getElementById('cal-view-year');
    if (monthBtn) monthBtn.addEventListener('click', () => setCalView('month'));
    if (yearBtn) yearBtn.addEventListener('click', () => setCalView('year'));

    // 월간 네비게이션
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));

    // 연간 네비게이션
    const prevYearBtn = document.getElementById('cal-prev-year');
    const nextYearBtn = document.getElementById('cal-next-year');
    if (prevYearBtn) prevYearBtn.addEventListener('click', () => { calYear--; renderYearView(); });
    if (nextYearBtn) nextYearBtn.addEventListener('click', () => { calYear++; renderYearView(); });

    const todayBtn = document.getElementById('cal-today-btn');
    if (todayBtn) todayBtn.addEventListener('click', () => {
      calYear = calToday.getFullYear();
      calMonth = calToday.getMonth() + 1;
      setCalView('month');
      showDayDetail(ymd(calToday.getFullYear(), calToday.getMonth() + 1, calToday.getDate()));
    });

    renderMonthView();
  }

  function setCalView(view) {
    calView = view;
    document.getElementById('cal-view-month').classList.toggle('active', view === 'month');
    document.getElementById('cal-view-year').classList.toggle('active', view === 'year');
    document.getElementById('cal-month-view').style.display = view === 'month' ? '' : 'none';
    document.getElementById('cal-year-view').style.display = view === 'year' ? '' : 'none';
    document.getElementById('cal-nav-month').style.display = view === 'month' ? '' : 'none';
    document.getElementById('cal-nav-year').style.display = view === 'year' ? '' : 'none';
    if (view === 'month') renderMonthView();
    else renderYearView();
  }

  function changeMonth(delta) {
    calMonth += delta;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    if (calMonth < 1) { calMonth = 12; calYear--; }
    renderMonthView();
  }

  function renderMonthView() {
    document.getElementById('cal-title').textContent = `${calYear}년 ${calMonth}월`;
    const firstDay = new Date(calYear, calMonth - 1, 1);
    const startWeekday = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const todayKey = ymd(calToday.getFullYear(), calToday.getMonth() + 1, calToday.getDate());

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push('<div class="cal-day-cell empty"></div>');
    for (let d = 1; d <= daysInMonth; d++) {
      const key = ymd(calYear, calMonth, d);
      const dayEvents = calEventMap[key] || [];
      const isToday = key === todayKey;
      const isSelected = key === calSelectedDate;
      cells.push(`
        <div class="cal-day-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" data-date="${key}">
          <div class="cal-day-num">${d}</div>
          ${dayEvents.slice(0, 2).map(e => `<span class="cal-event-label">${esc(e.title)}</span>`).join('')}
        </div>`);
    }
    document.getElementById('cal-grid').innerHTML = cells.join('');
    document.querySelectorAll('.cal-day-cell:not(.empty)').forEach(cell => {
      cell.addEventListener('click', () => {
        calSelectedDate = cell.dataset.date;
        renderMonthView();
        showDayDetail(cell.dataset.date);
      });
    });
  }

  function renderYearView() {
    document.getElementById('cal-year-title').textContent = `${calYear}년`;
    const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const cardsHtml = monthNames.map((name, i) => {
      const m = i + 1;
      const monthEvents = calEvents.filter(ev => {
        const d = new Date(ev.date);
        return d.getFullYear() === calYear && d.getMonth() + 1 === m;
      }).sort((a, b) => new Date(a.date) - new Date(b.date));
      return `
        <div class="cal-month-card" data-month="${m}">
          <div class="m-name">${name}</div>
          <div class="m-count">${monthEvents.length ? `행사 ${monthEvents.length}건` : '행사 없음'}</div>
          <div class="m-events">
            ${monthEvents.slice(0, 3).map(e => `<div>${new Date(e.date).getDate()}일 · ${esc(e.title)}</div>`).join('')}
          </div>
        </div>`;
    }).join('');
    document.getElementById('cal-year-grid').innerHTML = cardsHtml;
    document.querySelectorAll('.cal-month-card').forEach(card => {
      card.addEventListener('click', () => {
        calMonth = Number(card.dataset.month);
        setCalView('month');
      });
    });
  }

  function showDayDetail(dateStr) {
    const detail = document.getElementById('cal-day-detail');
    if (!detail) return;
    const events = calEventMap[dateStr] || [];
    const d = new Date(dateStr);
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    document.getElementById('cal-day-title').textContent = label;
    const eventsEl = document.getElementById('cal-day-events');
    eventsEl.innerHTML = events.length
      ? events.map(e => `
        <div class="cal-event-item">
          <div class="e-title">${esc(e.title)}</div>
          <div class="e-meta">${esc(e.time || '')}${e.time && e.location ? ' · ' : ''}${esc(e.location || '')}</div>
          ${e.description ? `<div class="e-desc">${esc(e.description)}</div>` : ''}
        </div>`).join('')
      : `<p class="empty-state">이 날짜에는 등록된 일정이 없습니다.</p>`;
    detail.style.display = 'block';
  }

  // -------------------- 포토 스냅 캐러셀 --------------------
  async function renderShowcase() {
    const section = document.getElementById('showcase');
    const track = document.getElementById('showcase-track');
    if (!section || !track) return;

    const data = await loadJSON('content/showcase.json');
    const photos = (data && data.enabled && data.photos) || [];
    if (!photos.length) {
      section.classList.remove('show');
      return;
    }

    track.innerHTML = photos.map(p => {
      const inner = `
        <img src="${esc(p.image)}" alt="${esc(p.caption || '')}" loading="lazy">
        ${p.caption ? `<span class="sc-caption">${esc(p.caption)}</span>` : ''}
        ${p.link ? `<span class="sc-hover-overlay">${t('소식 더보기 →', 'See more →')}</span>` : ''}
      `;
      return p.link
        ? `<a class="showcase-item has-link" href="${esc(p.link)}">${inner}</a>`
        : `<div class="showcase-item">${inner}</div>`;
    }).join('');
    section.classList.add('show');

    const prevBtn = document.getElementById('showcase-prev');
    const nextBtn = document.getElementById('showcase-next');
    const scrollAmount = () => (track.querySelector('.showcase-item')?.offsetWidth || 320) + 16;
    if (prevBtn) prevBtn.addEventListener('click', () => track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }));
    if (nextBtn) nextBtn.addEventListener('click', () => track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }));
  }

  // -------------------- 팝업 공지 --------------------
  async function renderPopup() {
    const overlay = document.getElementById('popup-overlay');
    if (!overlay) return;

    const hideUntil = localStorage.getItem('popupHideUntil');
    if (hideUntil && Date.now() < Number(hideUntil)) return;

    const data = await loadJSON('content/popup.json');
    if (!data || !data.enabled) return;

    const now = new Date();
    if (data.start_date && now < new Date(data.start_date)) return;
    if (data.end_date) {
      const end = new Date(data.end_date);
      end.setHours(23, 59, 59, 999);
      if (now > end) return;
    }

    document.getElementById('popup-title').textContent = data.title || '';
    document.getElementById('popup-content').textContent = data.content || '';

    const imgEl = document.getElementById('popup-image');
    if (data.image) {
      imgEl.src = data.image;
      imgEl.alt = data.title || '';
      imgEl.style.display = '';
    }

    const linkEl = document.getElementById('popup-link');
    if (data.link) {
      linkEl.href = data.link;
      linkEl.textContent = data.link_text || '자세히 보기';
      linkEl.style.display = 'inline-block';
    }

    overlay.classList.add('open');

    document.getElementById('popup-close').addEventListener('click', () => {
      overlay.classList.remove('open');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
    document.getElementById('popup-hide-today').addEventListener('change', (e) => {
      if (e.target.checked) {
        const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem('popupHideUntil', String(tomorrow));
      } else {
        localStorage.removeItem('popupHideUntil');
      }
    });
  }

  // -------------------- 실시간 예배 --------------------
  async function renderLive() {
    const slot = document.getElementById('live-slot');
    if (!slot) return;
    const site = await loadJSON('content/site.json');
    const channelId = site && site.youtube_channel_id;
    const isLiveNow = !!(site && site.live_now);

    if (isLiveNow && channelId) {
      slot.innerHTML = `
        <div class="live-embed-wrap">
          <iframe src="https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}"
            title="실시간 예배" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>
        </div>`;
      return;
    }

    const youtubeLink = (site && site.sns_youtube) || '#';
    const sermonTitle = site && site.today_sermon_title;
    const scripture = site && site.today_scripture;
    const todayLine = (sermonTitle || scripture)
      ? `<div class="lc-today">${sermonTitle ? `<strong>${esc(sermonTitle)}</strong>` : ''}${sermonTitle && scripture ? ' · ' : ''}${scripture ? esc(scripture) : ''}</div>`
      : '';
    slot.innerHTML = `
      <div class="live-compact">
        <div class="live-compact-icon">▶</div>
        <div class="live-compact-text">
          <div class="lc-title">실시간 예배</div>
          <div class="lc-desc">예배 시간에 맞춰 유튜브 채널에서 실시간으로 함께하실 수 있어요.</div>
          ${todayLine}
        </div>
        <div class="live-compact-actions">
          <a href="#worship" class="lc-btn-outline">예배 시간 보기</a>
          <a href="${esc(youtubeLink)}" target="_blank" rel="noopener" class="lc-btn-gold">유튜브 채널 바로가기</a>
        </div>
      </div>`;
  }

  // -------------------- 행사 사진 갤러리 --------------------
  async function renderGallery() {
    const grid = document.getElementById('album-grid');
    if (!grid) return;
    const data = await loadJSON('content/events.json');
    const albums = (data && data.albums) || [];
    if (!albums.length) {
      grid.innerHTML = `<p class="empty-state">${t('등록된 행사 사진이 없습니다.', 'No event photos yet.')}</p>`;
      return;
    }
    const sorted = albums
      .map((a, i) => ({ ...a, _idx: i }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    grid.innerHTML = sorted.map(a => `
      <div class="album-card" data-idx="${a._idx}">
        <img class="cover" src="${esc(a.cover || (a.photos && a.photos[0]) || '')}" alt="${esc(a.title)}" loading="lazy">
        <div class="meta">
          <div class="title">${esc(a.title)}</div>
          <div class="date">${formatDate(a.date)}</div>
          <div class="count">사진 ${(a.photos || []).length}장</div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.album-card').forEach(card => {
      card.addEventListener('click', () => openAlbum(albums[Number(card.dataset.idx)]));
    });
  }

  function openAlbum(album) {
    const listView = document.getElementById('album-list-view');
    const detailView = document.getElementById('album-detail-view');
    if (!listView || !detailView) return;
    listView.classList.add('hidden');
    detailView.classList.add('open');
    document.getElementById('album-detail-title').textContent = album.title || '';
    document.getElementById('album-detail-date').textContent = formatDate(album.date);
    const photoGrid = document.getElementById('album-photo-grid');
    const photos = album.photos || [];
    photoGrid.innerHTML = photos.length
      ? photos.map(p => `<img src="${esc(p)}" alt="${esc(album.title)}" loading="lazy">`).join('')
      : `<p class="empty-state">이 앨범에는 아직 사진이 등록되지 않았습니다.</p>`;
    photoGrid.querySelectorAll('img').forEach((img, idx) => {
      img.addEventListener('click', () => openLightbox(photos, idx));
    });
  }

  function closeAlbum() {
    document.getElementById('album-list-view').classList.remove('hidden');
    document.getElementById('album-detail-view').classList.remove('open');
  }

  // 소식 피드 안의 사진들(.update-photo-grid)을 그룹별로 묶어서
  // 라이트박스에서 같은 소식의 사진끼리 화살표로 넘겨볼 수 있게 합니다
  function bindLightboxGroups(root) {
    if (!root) return;
    root.querySelectorAll('.update-photo-grid').forEach(grid => {
      const imgs = Array.from(grid.querySelectorAll('img'));
      const srcs = imgs.map(i => i.src);
      imgs.forEach((img, idx) => {
        img.addEventListener('click', () => openLightbox(srcs, idx));
      });
    });
  }

  let lightboxList = [];
  let lightboxIndex = 0;

  function openLightbox(list, index) {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay) return;
    lightboxList = Array.isArray(list) ? list : [list];
    lightboxIndex = index || 0;
    updateLightboxImage();
    overlay.classList.add('open');
  }

  function updateLightboxImage() {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay || !lightboxList.length) return;
    overlay.querySelector('img').src = lightboxList[lightboxIndex];
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const multi = lightboxList.length > 1;
    if (prevBtn) prevBtn.style.display = multi ? '' : 'none';
    if (nextBtn) nextBtn.style.display = multi ? '' : 'none';
  }

  function lightboxStep(delta) {
    if (!lightboxList.length) return;
    lightboxIndex = (lightboxIndex + delta + lightboxList.length) % lightboxList.length;
    updateLightboxImage();
  }

  function initGalleryInteractions() {
    const backBtn = document.getElementById('album-back-btn');
    if (backBtn) backBtn.addEventListener('click', closeAlbum);
    const partnerBackBtn = document.getElementById('partner-back-btn');
    if (partnerBackBtn) partnerBackBtn.addEventListener('click', closePartnerDetail);
    const sharingBackBtn = document.getElementById('sharing-back-btn');
    if (sharingBackBtn) sharingBackBtn.addEventListener('click', closeSharingDetail);
    const worshipBackBtn = document.getElementById('worship-back-btn');
    if (worshipBackBtn) worshipBackBtn.addEventListener('click', closeWorshipDetail);
    const ministryBackBtn = document.getElementById('ministry-back-btn');
    if (ministryBackBtn) ministryBackBtn.addEventListener('click', closeMinistryDetail);
    const deptBackBtn = document.getElementById('dept-back-btn');
    if (deptBackBtn) deptBackBtn.addEventListener('click', closeDeptDetail);
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
      const closeBtn = overlay.querySelector('.lightbox-close');
      if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    }
    const lbPrev = document.getElementById('lightbox-prev');
    const lbNext = document.getElementById('lightbox-next');
    if (lbPrev) lbPrev.addEventListener('click', (e) => { e.stopPropagation(); lightboxStep(-1); });
    if (lbNext) lbNext.addEventListener('click', (e) => { e.stopPropagation(); lightboxStep(1); });
    document.addEventListener('keydown', (e) => {
      const ov = document.getElementById('lightbox-overlay');
      if (!ov || !ov.classList.contains('open')) return;
      if (e.key === 'ArrowLeft') lightboxStep(-1);
      if (e.key === 'ArrowRight') lightboxStep(1);
      if (e.key === 'Escape') ov.classList.remove('open');
    });
  }

  // -------------------- 주보 --------------------
  async function renderBulletins() {
    const list = document.getElementById('bulletin-list');
    if (!list) return;
    const data = await loadJSON('content/bulletins.json');
    const items = (data && data.items) || [];
    if (!items.length) {
      list.innerHTML = `<p class="empty-state">${t('등록된 주보가 없습니다.', 'No bulletins yet.')}</p>`;
      return;
    }
    const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = sorted.map(b => `
      <div class="bulletin-item">
        <div class="info">
          <div class="date">${formatDate(b.date)}</div>
          <div class="title">${esc(b.title)}</div>
        </div>
        ${b.file ? `<a class="dl" href="${esc(b.file)}" target="_blank" rel="noopener">${t('PDF 보기', 'View PDF')}</a>` : `<span class="dl" style="opacity:0.4; cursor:default;">${t('파일 없음', 'No file')}</span>`}
      </div>
    `).join('');
  }

  function getUpdatePhotos(u) {
    if (Array.isArray(u.photos) && u.photos.length) {
      return u.photos.map(p => (typeof p === 'string' ? p : p.photo)).filter(Boolean);
    }
    if (u.photo) return [u.photo];
    return [];
  }

  function renderUpdatePhotosHtml(photos, title) {
    if (!photos.length) return '';
    return `<div class="update-photo-grid">${photos.map(src =>
      `<img src="${esc(src)}" alt="${esc(title)}" loading="lazy" class="update-photo">`
    ).join('')}</div>`;
  }

  // -------------------- 예배안내 (예배별 소식) --------------------
  let worshipData = [];

  async function renderWorship() {
    const grid = document.getElementById('worship-grid');
    if (!grid) return;
    const data = await loadJSON('content/worship.json');
    worshipData = (data && data.items) || [];
    if (!worshipData.length) {
      grid.innerHTML = `<p class="empty-state">${t('등록된 예배 항목이 없습니다.', 'No worship categories yet.')}</p>`;
      return;
    }
    grid.innerHTML = worshipData.map((w, i) => `
      <div class="worship-card" data-idx="${i}">
        <div class="name">${esc(pickLang(w, 'name'))}</div>
        <span class="link">${t('소식 보기 →', 'See updates →')}</span>
      </div>
    `).join('');
    grid.querySelectorAll('.worship-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = Number(card.dataset.idx);
        openWorshipDetail(idx);
        const item = worshipData[idx];
        if (item) history.replaceState(null, '', `#${encodeURIComponent(item.name || '')}`);
      });
    });

    applyWorshipHash();
    window.addEventListener('hashchange', applyWorshipHash);
  }

  function normalizeName(s) {
    return (s || '').replace(/\s+/g, '').trim();
  }

  function findWorshipIndexByHash() {
    if (!location.hash || location.hash.length < 2) return -1;
    const raw = location.hash.slice(1);
    let decoded;
    try { decoded = decodeURIComponent(raw); } catch (e) { decoded = raw; }
    const target = normalizeName(decoded);
    return worshipData.findIndex(w => normalizeName(w.name) === target);
  }

  function applyWorshipHash() {
    const idx = findWorshipIndexByHash();
    if (idx >= 0) {
      openWorshipDetail(idx);
      return;
    }
    // 해시가 없거나 이름이 일치하지 않으면 목록으로
    const detailView = document.getElementById('worship-detail-view');
    if (detailView && detailView.classList.contains('open')) {
      closeWorshipDetail();
    }
  }

  function openWorshipDetail(idx) {
    const item = worshipData[idx];
    if (!item) return;
    const listView = document.getElementById('worship-list-view');
    const detailView = document.getElementById('worship-detail-view');
    if (!listView || !detailView) return;
    listView.classList.add('hidden');
    detailView.classList.add('open');
    document.getElementById('worship-detail-name').textContent = pickLang(item, 'name');

    const updatesList = document.getElementById('worship-updates-list');
    const updates = (item.updates || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    updatesList.innerHTML = updates.length
      ? updates.map(u => `
        <div class="update-item">
          ${renderUpdatePhotosHtml(getUpdatePhotos(u), u.title)}
          <div class="update-body">
            <div class="update-date">${formatDate(u.date)}</div>
            <div class="update-title">${esc(u.title)}</div>
            ${u.content ? `<div class="update-content">${esc(u.content)}</div>` : ''}
            <div class="update-links">
              ${u.audio_link ? `<a href="${esc(u.audio_link)}" target="_blank" rel="noopener" class="update-link">▶ 음원/영상 듣기</a>` : ''}
              ${u.sheet_music ? `<a href="${esc(u.sheet_music)}" target="_blank" rel="noopener" class="update-link">📄 악보 보기</a>` : ''}
            </div>
          </div>
        </div>`).join('')
      : `<p class="empty-state">${t('등록된 소식이 없습니다.', 'No updates yet.')}</p>`;

    bindLightboxGroups(updatesList);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeWorshipDetail() {
    document.getElementById('worship-list-view').classList.remove('hidden');
    document.getElementById('worship-detail-view').classList.remove('open');
    history.replaceState(null, '', location.pathname);
  }
  let partnersData = [];
  let partnerActiveFilter = '전체';

  async function renderPartners() {
    const grid = document.getElementById('partner-grid');
    if (!grid) return;
    const data = await loadJSON('content/partners.json');
    partnersData = (data && data.items) || [];
    if (!partnersData.length) {
      grid.innerHTML = `<p class="empty-state">${t('등록된 선교 단체가 없습니다.', 'No mission partners yet.')}</p>`;
      return;
    }

    // 이미 입력된 "구분" 값들을 그대로 모아서 탭을 자동으로 만듭니다
    const regions = [];
    partnersData.forEach(p => {
      const r = (p.region || '').trim();
      if (r && !regions.includes(r)) regions.push(r);
    });

    const tabsEl = document.getElementById('partner-filter-tabs');
    if (tabsEl) {
      const tabs = ['전체', ...regions];
      tabsEl.innerHTML = tabs.map(t =>
        `<a href="#" data-filter="${esc(t)}" class="${t === partnerActiveFilter ? 'active' : ''}">${esc(t)}</a>`
      ).join('');
      tabsEl.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          partnerActiveFilter = a.dataset.filter;
          tabsEl.querySelectorAll('a').forEach(x => x.classList.remove('active'));
          a.classList.add('active');
          drawPartnerGrid();
        });
      });
    }

    drawPartnerGrid();
    applyPartnerHash();
    window.addEventListener('hashchange', applyPartnerHash);
  }

  function findPartnerIndexByHash() {
    if (!location.hash || location.hash.length < 2) return -1;
    const raw = location.hash.slice(1);
    let decoded;
    try { decoded = decodeURIComponent(raw); } catch (e) { decoded = raw; }
    const target = normalizeName(decoded);
    return partnersData.findIndex(p => normalizeName(p.name) === target);
  }

  function applyPartnerHash() {
    const idx = findPartnerIndexByHash();
    if (idx >= 0) {
      openPartnerDetail(partnersData[idx]);
      return;
    }
    const detailView = document.getElementById('partner-detail-view');
    if (detailView && detailView.classList.contains('open')) {
      closePartnerDetail();
    }
  }

  function drawPartnerGrid() {
    const grid = document.getElementById('partner-grid');
    if (!grid) return;
    const filtered = partnerActiveFilter === '전체'
      ? partnersData
      : partnersData.filter(p => (p.region || '').trim() === partnerActiveFilter);

    if (!filtered.length) {
      grid.innerHTML = `<p class="empty-state">해당 구분의 단체가 없습니다.</p>`;
      return;
    }

    grid.innerHTML = filtered.map((p) => {
      const realIdx = partnersData.indexOf(p);
      return `
      <div class="partner-card" data-idx="${realIdx}">
        ${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.name)}" loading="lazy">` : ''}
        <div class="body">
          ${p.region ? `<span class="region">${esc(p.region)}</span>` : ''}
          <div class="name">${esc(pickLang(p, 'name'))}</div>
          <div class="desc">${esc(pickLang(p, 'description'))}</div>
          <span class="link">${t('소식 보기 →', 'See updates →')}</span>
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('.partner-card').forEach(card => {
      card.addEventListener('click', () => {
        const partner = partnersData[Number(card.dataset.idx)];
        openPartnerDetail(partner);
        if (partner) history.replaceState(null, '', `#${encodeURIComponent(partner.name || '')}`);
      });
    });
  }

  function openPartnerDetail(partner) {
    const listView = document.getElementById('partner-list-view');
    const detailView = document.getElementById('partner-detail-view');
    if (!listView || !detailView) return;
    listView.classList.add('hidden');
    detailView.classList.add('open');

    document.getElementById('partner-detail-cover').src = partner.cover || '';
    document.getElementById('partner-detail-region').textContent = partner.region || '';
    document.getElementById('partner-detail-name').textContent = pickLang(partner, 'name');
    document.getElementById('partner-detail-desc').textContent = pickLang(partner, 'description');

    const linkBtn = document.getElementById('partner-detail-link');
    if (partner.link) {
      linkBtn.href = partner.link;
      linkBtn.style.display = 'inline-block';
    } else {
      linkBtn.style.display = 'none';
    }

    const updatesList = document.getElementById('partner-updates-list');
    const updates = (partner.updates || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    updatesList.innerHTML = updates.length
      ? updates.map(u => `
        <div class="update-item">
          ${renderUpdatePhotosHtml(getUpdatePhotos(u), u.title)}
          <div class="update-body">
            <div class="update-date">${formatDate(u.date)}</div>
            <div class="update-title">${esc(u.title)}</div>
            <div class="update-content">${esc(u.content)}</div>
          </div>
        </div>`).join('')
      : `<p class="empty-state">${t('등록된 소식이 없습니다.', 'No updates yet.')}</p>`;

    bindLightboxGroups(updatesList);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closePartnerDetail() {
    document.getElementById('partner-list-view').classList.remove('hidden');
    document.getElementById('partner-detail-view').classList.remove('open');
    history.replaceState(null, '', location.pathname);
  }

  // -------------------- 나눔 행사 --------------------
  let sharingData = [];

  async function renderSharingEvents() {
    const grid = document.getElementById('sharing-grid');
    if (!grid) return;
    const data = await loadJSON('content/sharing.json');
    sharingData = (data && data.items) || [];
    if (!sharingData.length) {
      grid.innerHTML = `<p class="empty-state">${t('등록된 나눔 행사가 없습니다.', 'No sharing events yet.')}</p>`;
      return;
    }
    drawSharingGrid();
    applySharingHash();
    window.addEventListener('hashchange', applySharingHash);
  }

  function findSharingIndexByHash() {
    if (!location.hash || location.hash.length < 2) return -1;
    const raw = location.hash.slice(1);
    let decoded;
    try { decoded = decodeURIComponent(raw); } catch (e) { decoded = raw; }
    const target = normalizeName(decoded);
    return sharingData.findIndex(p => normalizeName(p.name) === target);
  }

  function applySharingHash() {
    const idx = findSharingIndexByHash();
    if (idx >= 0) {
      openSharingDetail(sharingData[idx]);
      return;
    }
    const detailView = document.getElementById('sharing-detail-view');
    if (detailView && detailView.classList.contains('open')) {
      closeSharingDetail();
    }
  }

  function drawSharingGrid() {
    const grid = document.getElementById('sharing-grid');
    if (!grid) return;
    grid.innerHTML = sharingData.map((p, idx) => `
      <div class="partner-card" data-idx="${idx}">
        ${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.name)}" loading="lazy">` : ''}
        <div class="body">
          ${p.tag ? `<span class="region">${esc(p.tag)}</span>` : ''}
          <div class="name">${esc(pickLang(p, 'name'))}</div>
          <div class="desc">${esc(pickLang(p, 'description'))}</div>
          <span class="link">${t('자세히 보기 →', 'Learn more →')}</span>
        </div>
      </div>`).join('');
    grid.querySelectorAll('.partner-card').forEach(card => {
      card.addEventListener('click', () => {
        const item = sharingData[Number(card.dataset.idx)];
        openSharingDetail(item);
        if (item) history.replaceState(null, '', `#${encodeURIComponent(item.name || '')}`);
      });
    });
  }

  function openSharingDetail(item) {
    const listView = document.getElementById('sharing-list-view');
    const detailView = document.getElementById('sharing-detail-view');
    if (!listView || !detailView) return;
    listView.classList.add('hidden');
    detailView.classList.add('open');

    document.getElementById('sharing-detail-cover').src = item.cover || '';
    document.getElementById('sharing-detail-tag').textContent = item.tag || '';
    document.getElementById('sharing-detail-name').textContent = pickLang(item, 'name');
    document.getElementById('sharing-detail-desc').textContent = pickLang(item, 'description');

    const updatesList = document.getElementById('sharing-updates-list');
    const updates = (item.updates || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    updatesList.innerHTML = updates.length
      ? updates.map(u => `
        <div class="update-item">
          ${renderUpdatePhotosHtml(getUpdatePhotos(u), u.title)}
          <div class="update-body">
            <div class="update-date">${formatDate(u.date)}</div>
            <div class="update-title">${esc(u.title)}</div>
            <div class="update-content">${esc(u.content)}</div>
          </div>
        </div>`).join('')
      : `<p class="empty-state">${t('등록된 소식이 없습니다.', 'No updates yet.')}</p>`;

    bindLightboxGroups(updatesList);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeSharingDetail() {
    document.getElementById('sharing-list-view').classList.remove('hidden');
    document.getElementById('sharing-detail-view').classList.remove('open');
    history.replaceState(null, '', location.pathname);
  }

  // -------------------- 메인페이지 나눔 행사 홍보 --------------------
  async function renderSharingPromo() {
    const grid = document.getElementById('sharing-promo-grid');
    if (!grid) return;
    const data = await loadJSON('content/sharing.json');
    const items = (data && data.items) || [];
    if (!items.length) {
      grid.innerHTML = `<p class="empty-state">${t('등록된 나눔 행사가 없습니다.', 'No sharing events yet.')}</p>`;
      return;
    }
    grid.innerHTML = items.map(p => `
      <a class="partner-card" href="partners.html#${encodeURIComponent(p.name || '')}">
        ${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.name)}" loading="lazy">` : ''}
        <div class="body">
          ${p.tag ? `<span class="region">${esc(p.tag)}</span>` : ''}
          <div class="name">${esc(pickLang(p, 'name'))}</div>
          <div class="desc">${esc(pickLang(p, 'description'))}</div>
          <span class="link">${t('자세히 보기 →', 'Learn more →')}</span>
        </div>
      </a>`).join('');
  }

  // -------------------- 메가메뉴 나눔 썸네일 --------------------
  async function renderMegaSharing() {
    const list = document.getElementById('mega-sharing-list');
    if (!list) return;
    const data = await loadJSON('content/sharing.json');
    const items = (data && data.items) || [];
    if (!items.length) return;
    list.innerHTML = items.map(p => `
      <a href="partners.html#${encodeURIComponent(p.name || '')}" style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
        ${p.cover
          ? `<img src="${esc(p.cover)}" alt="${esc(p.name)}" style="width:42px; height:42px; object-fit:cover; border-radius:6px; flex-shrink:0;">`
          : `<span style="width:42px; height:42px; border-radius:6px; flex-shrink:0; background:rgba(255,255,255,0.08);"></span>`}
        <span>${esc(pickLang(p, 'name'))}</span>
      </a>`).join('');
  }

  // -------------------- 섬기는 사람 --------------------
  async function renderLeaders() {
    const root = document.getElementById('leaders-root');
    if (!root) return;
    const data = await loadJSON('content/leaders.json');
    if (!data) return;

    // 담임목사
    const pastorImg = document.getElementById('pastor-photo');
    const pastorName = document.getElementById('pastor-name');
    const pastorBio = document.getElementById('pastor-bio');
    if (data.pastor) {
      if (pastorImg && data.pastor.photo) pastorImg.src = data.pastor.photo;
      if (pastorName) pastorName.textContent = pickLang(data.pastor, 'name');
      if (pastorBio) pastorBio.textContent = pickLang(data.pastor, 'bio');
    }

    // 교역자 (전임 목회자) — 등록된 인원이 없으면 섹션 자체를 숨깁니다
    const clergyIntro = document.getElementById('clergy-intro');
    if (clergyIntro) clergyIntro.textContent = data.clergy_intro || '';
    const clergyGrid = document.getElementById('clergy-grid');
    const clergyList = data.clergy || [];
    setSectionVisible('clergy-sec', clergyList.length > 0);
    if (clergyGrid) {
      clergyGrid.innerHTML = clergyList.length
        ? clergyList.map(p => `
          <div class="people-card">
            <div class="name">${esc(p.name)}</div>
            <div class="role">${esc(p.role)}</div>
          </div>`).join('')
        : '';
    }

    // 장로 (시무 / 원로 / 명예) — 하위 그룹별로, 그리고 전체 섹션도 비어있으면 숨깁니다
    const eldersIntro = document.getElementById('elders-intro');
    if (eldersIntro) eldersIntro.textContent = data.elders_intro || '';
    const actingCount = renderElderGroup('elder-acting-group', 'elder-acting-grid', data.elders_acting);
    const emeritusCount = renderElderGroup('elder-emeritus-group', 'elder-emeritus-grid', data.elders_emeritus);
    const honoraryCount = renderElderGroup('elder-honorary-group', 'elder-honorary-grid', data.elders_honorary);
    setSectionVisible('elders-sec', (actingCount + emeritusCount + honoraryCount) > 0);

    // 안수집사 — 등록된 인원이 없으면 섹션 자체를 숨깁니다
    const deaconsIntro = document.getElementById('deacons-intro');
    if (deaconsIntro) deaconsIntro.textContent = data.deacons_intro || '';
    const deaconsCount = renderElderGroup(null, 'deacons-grid', data.deacons);
    setSectionVisible('deacons-sec', deaconsCount > 0);

    // 성도 — 소개 문구가 없으면 섹션 자체를 숨깁니다
    const note = document.getElementById('congregation-note');
    if (note) note.textContent = data.congregation_note || '';
    setSectionVisible('congregation-sec', !!(data.congregation_note && data.congregation_note.trim()));
  }

  // 섹션과 그에 연결된 pill-nav 링크를 함께 보이거나 숨깁니다
  function setSectionVisible(sectionId, visible) {
    const sec = document.getElementById(sectionId);
    if (sec) sec.style.display = visible ? '' : 'none';
    const pill = document.querySelector(`.pill-nav a[href="#${sectionId}"]`);
    if (pill) pill.style.display = visible ? '' : 'none';
  }

  // groupElId(있으면 하위 그룹 div도 함께 숨김) 기준으로 명단을 그리고, 인원 수를 반환합니다
  function renderElderGroup(groupElId, gridElId, list) {
    const el = document.getElementById(gridElId);
    const items = list || [];
    if (el) {
      el.innerHTML = items.length
        ? items.map(p => `<div class="people-card"><div class="name">${esc(p.name)}</div></div>`).join('')
        : '';
    }
    if (groupElId) {
      const group = document.getElementById(groupElId);
      if (group) group.style.display = items.length ? '' : 'none';
    }
    return items.length;
  }

  // -------------------- 사역 안내 --------------------
  let ministriesData = [];

  async function renderMinistries() {
    const grid = document.getElementById('ministry-grid');
    if (!grid) return;
    const data = await loadJSON('content/ministries.json');
    ministriesData = (data && data.items) || [];
    grid.innerHTML = ministriesData.length
      ? ministriesData.map((m, i) => `
        <div class="ministry-card" data-idx="${i}">
          <div class="name">${esc(pickLang(m, 'name'))}</div>
          <div class="desc">${esc(pickLang(m, 'description'))}</div>
          <span class="link">${t('소식 보기 →', 'See updates →')}</span>
        </div>`).join('')
      : `<p class="empty-state">${t('등록된 사역이 없습니다.', 'No ministries yet.')}</p>`;
    grid.querySelectorAll('.ministry-card').forEach(card => {
      card.addEventListener('click', () => openMinistryDetail(Number(card.dataset.idx)));
    });
  }

  function openMinistryDetail(idx) {
    const item = ministriesData[idx];
    if (!item) return;
    const listView = document.getElementById('ministry-list-view');
    const detailView = document.getElementById('ministry-detail-view');
    if (!listView || !detailView) return;
    listView.classList.add('hidden');
    detailView.classList.add('open');
    document.getElementById('ministry-detail-name').textContent = pickLang(item, 'name');
    document.getElementById('ministry-detail-desc').textContent = pickLang(item, 'description');
    renderUpdatesFeed(document.getElementById('ministry-updates-list'), item.updates || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeMinistryDetail() {
    document.getElementById('ministry-list-view').classList.remove('hidden');
    document.getElementById('ministry-detail-view').classList.remove('open');
  }

  // -------------------- 부서 소개 --------------------
  let departmentsData = [];

  async function renderDepartmentsPage() {
    const grid = document.getElementById('dept-grid');
    if (!grid) return;
    const data = await loadJSON('content/departments.json');
    departmentsData = (data && data.departments) || [];
    grid.innerHTML = departmentsData.length
      ? departmentsData.map((d, i) => `
        <div class="dept-card" data-idx="${i}">
          <div class="name">${esc(pickLang(d, 'name'))}</div>
          <div class="summary">${esc(pickLang(d, 'summary'))}</div>
          <div class="leader">${esc(pickLang(d, 'leader'))}</div>
          <span class="link" style="color:var(--gold-300); font-size:14px;">${t('소식 보기 →', 'See updates →')}</span>
        </div>`).join('')
      : `<p class="empty-state">${t('등록된 부서가 없습니다.', 'No departments yet.')}</p>`;
    grid.querySelectorAll('.dept-card').forEach(card => {
      card.addEventListener('click', () => openDeptDetail(Number(card.dataset.idx)));
    });
  }

  function openDeptDetail(idx) {
    const item = departmentsData[idx];
    if (!item) return;
    const listView = document.getElementById('dept-list-view');
    const detailView = document.getElementById('dept-detail-view');
    if (!listView || !detailView) return;
    listView.classList.add('hidden');
    detailView.classList.add('open');
    document.getElementById('dept-detail-name').textContent = pickLang(item, 'name');
    document.getElementById('dept-detail-leader').textContent = pickLang(item, 'leader');
    document.getElementById('dept-detail-summary').textContent = pickLang(item, 'summary');
    renderUpdatesFeed(document.getElementById('dept-updates-list'), item.updates || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeDeptDetail() {
    document.getElementById('dept-list-view').classList.remove('hidden');
    document.getElementById('dept-detail-view').classList.remove('open');
  }

  // 공용: 소식 피드 렌더링 (부서소개, 사역안내에서 공용으로 사용)
  function renderUpdatesFeed(listEl, updates) {
    if (!listEl) return;
    const sorted = (updates || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    listEl.innerHTML = sorted.length
      ? sorted.map(u => `
        <div class="update-item">
          ${renderUpdatePhotosHtml(getUpdatePhotos(u), u.title)}
          <div class="update-body">
            <div class="update-date">${formatDate(u.date)}</div>
            <div class="update-title">${esc(u.title)}</div>
            ${u.content ? `<div class="update-content">${esc(u.content)}</div>` : ''}
          </div>
        </div>`).join('')
      : `<p class="empty-state">${t('등록된 소식이 없습니다.', 'No updates yet.')}</p>`;
    bindLightboxGroups(listEl);
  }

  // -------------------- 교회소개 (환영/비전/교회연혁) --------------------
  async function renderAboutPage() {
    const root = document.getElementById('welcome-sec');
    if (!root) return;

    const [site, leadersData, historyData, clergyHistoryData] = await Promise.all([
      loadJSON('content/site.json'),
      loadJSON('content/leaders.json'),
      loadJSON('content/history.json'),
      loadJSON('content/clergy_history.json'),
    ]);

    // 환영
    if (leadersData && leadersData.pastor) {
      const p = leadersData.pastor;
      const photoEl = document.getElementById('welcome-photo');
      if (photoEl && p.photo) photoEl.src = p.photo;
      const nameEl = document.getElementById('welcome-pastor-name');
      if (nameEl) nameEl.textContent = pickLang(p, 'name');
    }
    const greetEl = document.getElementById('welcome-greeting');
    if (greetEl && site) greetEl.textContent = pickLang(site, 'greeting');

    // 비전
    if (site) {
      const visionPhoto = document.getElementById('vision-photo');
      if (visionPhoto && site.church_photo) visionPhoto.src = site.church_photo;
      const visionCaption = document.getElementById('vision-caption');
      if (visionCaption) visionCaption.textContent = pickLang(site, 'vision');
      const historyIntro = document.getElementById('history-intro');
      if (historyIntro) historyIntro.textContent = pickLang(site, 'history');
      const visionRight = document.getElementById('vision-right');
      if (visionRight) visionRight.textContent = pickLang(site, 'vision_right');
    }

    // 교회연혁 타임라인
    const timeline = document.getElementById('history-timeline');
    if (timeline) {
      const eras = (historyData && historyData.eras) || [];
      timeline.innerHTML = eras.length
        ? eras.map(era => `
          <div class="history-era">
            <div class="history-era-badge">
              <div class="label">${esc(era.label)}</div>
              <div class="years">${esc(era.years)}</div>
            </div>
            <div class="history-milestones">
              ${(era.milestones || []).map(m => `
                <div class="history-milestone">
                  <div class="date">${esc(m.date)}</div>
                  <div class="desc">${esc(m.description)}</div>
                </div>`).join('')}
            </div>
          </div>`).join('')
        : `<p class="empty-state">${t('등록된 연혁이 없습니다.', 'No history entries yet.')}</p>`;
    }

    // 역대 교역자 명단
    const clergyTbody = document.querySelector('#clergy-history-table tbody');
    if (clergyTbody) {
      const list = (clergyHistoryData && clergyHistoryData.items) || [];
      clergyTbody.innerHTML = list.length
        ? list.map(c => `
          <tr>
            <td>${esc(c.order)}</td>
            <td>${esc(c.name)}</td>
            <td>${esc(c.title)}</td>
            <td>${esc(c.period)}</td>
            <td>${esc(c.duration)}</td>
          </tr>`).join('')
        : `<tr><td colspan="5" class="empty-state">${t('등록된 명단이 없습니다.', 'No records yet.')}</td></tr>`;
    }
  }

  // -------------------- 설교 (주일/수요/새벽) --------------------
  async function renderSermonTabs() {
    const sundayList = document.getElementById('sunday-sermon-list');
    if (!sundayList) return; // sermons.html이 아니면 건너뜀
    const data = await loadJSON('content/sermons.json');
    const items = (data && data.items) || [];

    const byType = (type, defaultType) => items
      .filter(s => (s.service_type || defaultType) === type)
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    renderSermonGroup('sunday-sermon-list', byType('주일예배', '주일예배'), true);
    renderSermonGroup('wed-sermon-list', byType('수요예배', '주일예배'), true);
    renderSermonGroup('special-sermon-list', byType('특별예배', '주일예배'), true);
  }

  const sermonShownCount = {};
  const SERMON_PAGE_SIZE = 8;

  function renderSermonGroup(elId, list, withVideo) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<p class="empty-state">${t('등록된 설교가 없습니다.', 'No sermons yet.')}</p>`;
      return;
    }
    if (!(elId in sermonShownCount)) sermonShownCount[elId] = SERMON_PAGE_SIZE;
    const shown = Math.min(sermonShownCount[elId], list.length);
    const visible = list.slice(0, shown);

    const itemsHtml = visible.map(s => {
      const inner = `
        <div>
          <div class="title">${esc(s.title)}</div>
          <div class="meta">${formatDate(s.date)} · ${esc(s.preacher)} · ${esc(s.scripture)}</div>
        </div>
        ${withVideo && s.youtube_url ? '<span class="play">▶</span>' : ''}`;
      return (withVideo && s.youtube_url)
        ? `<a class="sermon-item" href="${esc(s.youtube_url)}" target="_blank" rel="noopener">${inner}</a>`
        : `<div class="sermon-item" style="cursor:default;">${inner}</div>`;
    }).join('');

    const hasMore = shown < list.length;
    const moreBtn = hasMore
      ? `<button type="button" class="sermon-load-more" data-target="${elId}">${t(`더보기 (${list.length - shown}개 더)`, `Show more (${list.length - shown})`)}</button>`
      : '';

    el.innerHTML = itemsHtml + moreBtn;

    const btn = el.querySelector('.sermon-load-more');
    if (btn) {
      btn.addEventListener('click', () => {
        sermonShownCount[elId] += SERMON_PAGE_SIZE;
        renderSermonGroup(elId, list, withVideo);
      });
    }
  }

  // -------------------- 자료실 --------------------
  async function renderResources() {
    const list = document.getElementById('resource-list');
    if (!list) return;
    const data = await loadJSON('content/resources.json');
    const items = (data && data.items) || [];
    if (!items.length) {
      list.innerHTML = `<p class="empty-state">${t('등록된 자료가 없습니다.', 'No resources yet.')}</p>`;
      return;
    }
    const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = sorted.map(r => `
      <div class="bulletin-item">
        <div class="info">
          <div class="date">${formatDate(r.date)}</div>
          <div class="title">${esc(r.title)}</div>
          ${r.description ? `<div class="update-content" style="margin-top:4px;">${esc(r.description)}</div>` : ''}
        </div>
        ${r.file ? `<a class="dl" href="${esc(r.file)}" target="_blank" rel="noopener">${t('다운로드', 'Download')}</a>` : `<span class="dl" style="opacity:0.4; cursor:default;">${t('파일 없음', 'No file')}</span>`}
      </div>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initGalleryInteractions();
    renderPopup();
    renderLive();
    renderGallery();
    renderBulletins();
    renderPartners();
    renderSharingEvents();
    renderSharingPromo();
    renderMegaSharing();
    renderLeaders();
    renderMinistries();
    renderResources();
    renderWorship();
    renderDepartmentsPage();
    renderAboutPage();
    renderCalendarPage();
    renderShowcase();
    renderSermonTabs();
  });
})();
