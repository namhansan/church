// 남한산성교회 홈페이지 — content/*.json 파일을 불러와 화면에 그립니다.
// 관리자 페이지(/admin)에서 내용을 수정하면 이 파일들이 자동으로 바뀝니다.

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

function renderSite(site) {
  if (!site) return;
  document.title = site.church_name || '교회 홈페이지';
  document.querySelectorAll('[data-field="org_name"]').forEach(el => el.textContent = site.org_name || '');
  document.querySelectorAll('[data-field="church_name"]').forEach(el => el.textContent = site.church_name || '');
  document.querySelectorAll('[data-field="tagline"]').forEach(el => el.textContent = site.tagline || '');
  document.querySelectorAll('[data-field="pastor_name"]').forEach(el => el.textContent = site.pastor_name || '');
  document.querySelectorAll('[data-field="greeting"]').forEach(el => el.textContent = site.greeting || '');
  document.querySelectorAll('[data-field="history"]').forEach(el => el.textContent = site.history || '');
  document.querySelectorAll('[data-field="vision"]').forEach(el => el.textContent = site.vision || '');
  document.querySelectorAll('[data-field="address"]').forEach(el => el.textContent = site.address || '');
  document.querySelectorAll('[data-field="address_detail"]').forEach(el => el.textContent = site.address_detail || '');
  document.querySelectorAll('[data-field="phone"]').forEach(el => el.textContent = site.phone || '');
  document.querySelectorAll('[data-field="email"]').forEach(el => el.textContent = site.email || '');
  document.querySelectorAll('[data-field="offering_bank"]').forEach(el => el.textContent = site.offering_bank || '');
  document.querySelectorAll('[data-field="offering_account"]').forEach(el => el.textContent = site.offering_account || '');
  document.querySelectorAll('[data-field="offering_holder"]').forEach(el => el.textContent = site.offering_holder || '');

  const ytLink = document.querySelector('[data-field="sns_youtube"]');
  if (ytLink && site.sns_youtube) ytLink.href = site.sns_youtube;
  const igLink = document.querySelector('[data-field="sns_instagram"]');
  if (igLink && site.sns_instagram) igLink.href = site.sns_instagram;

  const phoneLink = document.querySelector('[data-field="phone_link"]');
  if (phoneLink && site.phone) phoneLink.href = `tel:${site.phone.replace(/[^0-9]/g, '')}`;
  const emailLink = document.querySelector('[data-field="email_link"]');
  if (emailLink && site.email) emailLink.href = `mailto:${site.email}`;

  // 예배 시간
  const serviceGrid = document.getElementById('service-grid');
  if (serviceGrid) {
    const times = site.service_times || [];
    serviceGrid.innerHTML = times.length
      ? times.map(s => `
        <div class="service-card">
          <div class="name">${esc(s.name)}</div>
          <div class="time">${esc(s.time)}</div>
          <div class="place">${esc(s.place)}</div>
        </div>`).join('')
      : `<p class="empty-state">등록된 예배 시간이 없습니다.</p>`;
  }

  // 지도
  const mapFrame = document.getElementById('map-embed');
  if (mapFrame && site.map_lat && site.map_lng) {
    mapFrame.src = `https://maps.google.com/maps?q=${site.map_lat},${site.map_lng}&z=16&output=embed`;
  }

  // 교회 전경 사진
  const photo = document.getElementById('church-photo');
  const photoBand = photo ? photo.closest('.photo-band') : null;
  if (photo && site.church_photo) {
    photo.src = site.church_photo;
    photo.alt = `${site.church_name || ''} 전경`;
  } else if (photoBand) {
    photoBand.style.display = 'none';
  }

  // 로고 (등록되어 있으면 배지 대신 표시)
  const logoSlot = document.querySelector('.brand');
  if (logoSlot && site.logo) {
    const mark = logoSlot.querySelector('.mark');
    const img = document.createElement('img');
    img.src = site.logo;
    img.alt = `${site.church_name || ''} 로고`;
    img.className = 'logo-img';
    if (mark) mark.replaceWith(img);
  }
}

function renderNotices(data) {
  const list = document.getElementById('notice-list');
  if (!list) return;
  const items = (data && data.items) || [];
  if (!items.length) {
    list.innerHTML = `<p class="empty-state">등록된 공지사항이 없습니다.</p>`;
    return;
  }
  const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = sorted.map(n => `
    <div class="notice-item">
      <div class="date">${formatDate(n.date)}</div>
      <div>
        <div class="title">${esc(n.title)}</div>
        <div class="body">${esc(n.body)}</div>
      </div>
    </div>
  `).join('');
}

function renderSermons(data) {
  const list = document.getElementById('sermon-list');
  if (!list) return;
  const items = (data && data.items) || [];
  if (!items.length) {
    list.innerHTML = `<p class="empty-state">등록된 설교가 없습니다.</p>`;
    return;
  }
  const sorted = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
  list.innerHTML = sorted.slice(0, 6).map(s => `
    <a class="sermon-item" href="${esc(s.youtube_url || '#')}" target="_blank" rel="noopener">
      <div>
        <div class="title">${esc(s.title)}</div>
        <div class="meta">${formatDate(s.date)} · ${esc(s.preacher)} · ${esc(s.scripture)}</div>
      </div>
      <span class="play">▶</span>
    </a>
  `).join('');
}

function renderDepartments(data) {
  const grid = document.getElementById('dept-grid');
  if (!grid) return;
  const items = (data && data.departments) || [];
  grid.innerHTML = items.length
    ? items.map(d => `
      <div class="dept-card">
        <div class="name">${esc(d.name)}</div>
        <div class="summary">${esc(d.summary)}</div>
        <div class="leader">${esc(d.leader)}</div>
      </div>`).join('')
    : `<p class="empty-state">등록된 부서가 없습니다.</p>`;
}

function initNav() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('nav.menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => menu.classList.toggle('open'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
}

async function init() {
  initNav();
  const [site, notices, sermons, departments] = await Promise.all([
    loadJSON('content/site.json'),
    loadJSON('content/notices.json'),
    loadJSON('content/sermons.json'),
    loadJSON('content/departments.json'),
  ]);
  renderSite(site);
  renderNotices(notices);
  renderSermons(sermons);
  renderDepartments(departments);
  document.getElementById('year').textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', init);
