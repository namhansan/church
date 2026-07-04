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

  // -------------------- 후원 단체 --------------------
  let partnersData = [];

  async function renderPartners() {
    const grid = document.getElementById('partner-grid');
    if (!grid) return;
    const data = await loadJSON('content/partners.json');
    partnersData = (data && data.items) || [];
    if (!partnersData.length) {
      grid.innerHTML = `<p class="empty-state">등록된 후원 단체가 없습니다.</p>`;
      return;
    }
    grid.innerHTML = partnersData.map((p, i) => `
      <div class="partner-card" data-idx="${i}">
        ${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.name)}" loading="lazy">` : ''}
        <div class="body">
          ${p.region ? `<span class="region">${esc(p.region)}</span>` : ''}
          <div class="name">${esc(p.name)}</div>
          <div class="desc">${esc(p.description)}</div>
          <span class="link">소식 보기 →</span>
        </div>
      </div>
    `).join('');
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
          ${u.photo ? `<img src="${esc(u.photo)}" alt="${esc(u.title)}" loading="lazy" class="update-photo">` : ''}
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
  async function renderMinistries() {
    const grid = document.getElementById('ministry-grid');
    if (!grid) return;
    const data = await loadJSON('content/ministries.json');
    const items = (data && data.items) || [];
    grid.innerHTML = items.length
      ? items.map(m => `
        <div class="ministry-card">
          <div class="name">${esc(m.name)}</div>
          <div class="desc">${esc(m.description)}</div>
        </div>`).join('')
      : `<p class="empty-state">등록된 사역이 없습니다.</p>`;
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
    renderLive();
    renderGallery();
    renderBulletins();
    renderPartners();
    renderLeaders();
    renderMinistries();
    renderResources();
  });
})();
