// 은혜교회 홈페이지 — 추가 기능(갤러리/주보/후원단체/실시간 예배)
// main.js가 먼저 로드된 뒤 이 파일이 이어서 실행됩니다.

(function () {
  const CACHE_BUST = `?v=${Date.now()}`;

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
    if (channelId) {
      slot.innerHTML = `
        <div class="live-embed-wrap">
          <iframe src="https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}"
            title="실시간 예배" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>
        </div>`;
    } else {
      slot.innerHTML = `
        <div class="live-offline">
          <div class="badge">LIVE 준비중</div>
          <p style="margin:0;">실시간 예배 연결이 아직 설정되지 않았습니다.<br>관리자 페이지의 "교회 기본 정보"에서 유튜브 채널 ID를 등록해 주세요.</p>
        </div>`;
    }
  }

  // -------------------- 행사 사진 갤러리 --------------------
  async function renderGallery() {
    const grid = document.getElementById('album-grid');
    if (!grid) return;
    const data = await loadJSON('content/events.json');
    const albums = (data && data.albums) || [];
    if (!albums.length) {
      grid.innerHTML = `<p class="empty-state">등록된 행사 사진이 없습니다.</p>`;
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
    photoGrid.querySelectorAll('img').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });
  }

  function closeAlbum() {
    document.getElementById('album-list-view').classList.remove('hidden');
    document.getElementById('album-detail-view').classList.remove('open');
  }

  function openLightbox(src) {
    const overlay = document.getElementById('lightbox-overlay');
    if (!overlay) return;
    overlay.querySelector('img').src = src;
    overlay.classList.add('open');
  }

  function initGalleryInteractions() {
    const backBtn = document.getElementById('album-back-btn');
    if (backBtn) backBtn.addEventListener('click', closeAlbum);
    const partnerBackBtn = document.getElementById('partner-back-btn');
    if (partnerBackBtn) partnerBackBtn.addEventListener('click', closePartnerDetail);
    const worshipBackBtn = document.getElementById('worship-back-btn');
    if (worshipBackBtn) worshipBackBtn.addEventListener('click', closeWorshipDetail);
    const ministryBackBtn = document.getElementById('ministry-back-btn');
    if (ministryBackBtn) ministryBackBtn.addEventListener('click', closeMinistryDetail);
    const deptBackBtn = document.getElementById('dept-back-btn');
    if (deptBackBtn) deptBackBtn.addEventListener('click', closeDeptDetail);
    const overlay = document.getElementById('lightbox-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => overlay.classList.remove('open'));
    }
  }

  // -------------------- 주보 --------------------
  async function renderBulletins() {
    const list = document.getElementById('bulletin-list');
    if (!list) return;
    const data = await loadJSON('content/bulletins.json');
    const items = (data && data.items) || [];
    if (!items.length) {
      list.innerHTML = `<p class="empty-state">등록된 주보가 없습니다.</p>`;
      return;
    }
    const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = sorted.map(b => `
      <div class="bulletin-item">
        <div class="info">
          <div class="date">${formatDate(b.date)}</div>
          <div class="title">${esc(b.title)}</div>
        </div>
        ${b.file ? `<a class="dl" href="${esc(b.file)}" target="_blank" rel="noopener">PDF 보기</a>` : `<span class="dl" style="opacity:0.4; cursor:default;">파일 없음</span>`}
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
      grid.innerHTML = `<p class="empty-state">등록된 예배 항목이 없습니다.</p>`;
      return;
    }
    grid.innerHTML = worshipData.map((w, i) => `
      <div class="worship-card" data-idx="${i}">
        <div class="name">${esc(w.name)}</div>
        <span class="link">소식 보기 →</span>
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

  function findWorshipIndexByHash() {
    if (!location.hash || location.hash.length < 2) return -1;
    const raw = location.hash.slice(1);
    let decoded;
    try { decoded = decodeURIComponent(raw); } catch (e) { decoded = raw; }
    return worshipData.findIndex(w => (w.name || '').trim() === decoded.trim());
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
    document.getElementById('worship-detail-name').textContent = item.name || '';

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
      : `<p class="empty-state">등록된 소식이 없습니다.</p>`;

    updatesList.querySelectorAll('.update-photo').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });

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
      grid.innerHTML = `<p class="empty-state">등록된 선교 단체가 없습니다.</p>`;
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
          <div class="name">${esc(p.name)}</div>
          <div class="desc">${esc(p.description)}</div>
          <span class="link">소식 보기 →</span>
        </div>
      </div>`;
    }).join('');
    grid.querySelectorAll('.partner-card').forEach(card => {
      card.addEventListener('click', () => openPartnerDetail(partnersData[Number(card.dataset.idx)]));
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
    document.getElementById('partner-detail-name').textContent = partner.name || '';
    document.getElementById('partner-detail-desc').textContent = partner.description || '';

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
      : `<p class="empty-state">등록된 소식이 없습니다.</p>`;

    updatesList.querySelectorAll('.update-photo').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closePartnerDetail() {
    document.getElementById('partner-list-view').classList.remove('hidden');
    document.getElementById('partner-detail-view').classList.remove('open');
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
      if (pastorName) pastorName.textContent = data.pastor.name || '';
      if (pastorBio) pastorBio.textContent = data.pastor.bio || '';
    }

    // 교역자 (전임 목회자)
    const clergyIntro = document.getElementById('clergy-intro');
    if (clergyIntro) clergyIntro.textContent = data.clergy_intro || '';
    const clergyGrid = document.getElementById('clergy-grid');
    if (clergyGrid) {
      const list = data.clergy || [];
      clergyGrid.innerHTML = list.length
        ? list.map(p => `
          <div class="people-card">
            <div class="name">${esc(p.name)}</div>
            <div class="role">${esc(p.role)}</div>
          </div>`).join('')
        : `<p class="empty-state">등록된 교역자가 없습니다.</p>`;
    }

    // 장로 (시무 / 원로 / 명예)
    const eldersIntro = document.getElementById('elders-intro');
    if (eldersIntro) eldersIntro.textContent = data.elders_intro || '';
    renderElderGroup('elder-acting-grid', data.elders_acting);
    renderElderGroup('elder-emeritus-grid', data.elders_emeritus);
    renderElderGroup('elder-honorary-grid', data.elders_honorary);

    // 성도
    const note = document.getElementById('congregation-note');
    if (note) note.textContent = data.congregation_note || '';
  }

  function renderElderGroup(elId, list) {
    const el = document.getElementById(elId);
    if (!el) return;
    const items = list || [];
    el.innerHTML = items.length
      ? items.map(p => `<div class="people-card"><div class="name">${esc(p.name)}</div></div>`).join('')
      : `<p class="empty-state">등록된 분이 없습니다.</p>`;
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
          <div class="name">${esc(m.name)}</div>
          <div class="desc">${esc(m.description)}</div>
          <span class="link">소식 보기 →</span>
        </div>`).join('')
      : `<p class="empty-state">등록된 사역이 없습니다.</p>`;
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
    document.getElementById('ministry-detail-name').textContent = item.name || '';
    document.getElementById('ministry-detail-desc').textContent = item.description || '';
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
          <div class="name">${esc(d.name)}</div>
          <div class="summary">${esc(d.summary)}</div>
          <div class="leader">${esc(d.leader)}</div>
          <span class="link" style="color:var(--gold-300); font-size:14px;">소식 보기 →</span>
        </div>`).join('')
      : `<p class="empty-state">등록된 부서가 없습니다.</p>`;
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
    document.getElementById('dept-detail-name').textContent = item.name || '';
    document.getElementById('dept-detail-leader').textContent = item.leader || '';
    document.getElementById('dept-detail-summary').textContent = item.summary || '';
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
      : `<p class="empty-state">등록된 소식이 없습니다.</p>`;
    listEl.querySelectorAll('.update-photo').forEach(img => {
      img.addEventListener('click', () => openLightbox(img.src));
    });
  }

  // -------------------- 자료실 --------------------
  async function renderResources() {
    const list = document.getElementById('resource-list');
    if (!list) return;
    const data = await loadJSON('content/resources.json');
    const items = (data && data.items) || [];
    if (!items.length) {
      list.innerHTML = `<p class="empty-state">등록된 자료가 없습니다.</p>`;
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
        ${r.file ? `<a class="dl" href="${esc(r.file)}" target="_blank" rel="noopener">다운로드</a>` : `<span class="dl" style="opacity:0.4; cursor:default;">파일 없음</span>`}
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
    renderLeaders();
    renderMinistries();
    renderResources();
    renderWorship();
    renderDepartmentsPage();
  });
})();
