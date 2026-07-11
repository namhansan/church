// 은혜교회 홈페이지 — content/*.json 파일을 불러와 화면에 그립니다.
// 관리자 페이지(/admin)에서 내용을 수정하면 이 파일들이 자동으로 바뀝니다.

// 언어 상태 (ko/en) — extra.js에서도 window.siteLang으로 같이 사용합니다
window.siteLang = localStorage.getItem('siteLang') || 'ko';

function pickLang(obj, field) {
  if (!obj) return '';
  if (window.siteLang === 'en' && obj[field + '_en']) return obj[field + '_en'];
  return obj[field] || '';
}

function applyStaticI18n() {
  document.body.classList.toggle('lang-en', window.siteLang === 'en');
  document.querySelectorAll('[data-en]').forEach(el => {
    if (!el.dataset.ko) el.dataset.ko = el.textContent;
    el.textContent = window.siteLang === 'en' ? el.dataset.en : el.dataset.ko;
  });
}

function initLangToggle() {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  btn.textContent = window.siteLang === 'ko' ? 'EN' : '한국어';
  btn.addEventListener('click', () => {
    window.siteLang = window.siteLang === 'ko' ? 'en' : 'ko';
    localStorage.setItem('siteLang', window.siteLang);
    location.reload();
  });
}

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
  document.querySelectorAll('[data-field="org_name"]').forEach(el => el.textContent = pickLang(site, 'org_name'));
  document.querySelectorAll('[data-field="church_name"]').forEach(el => el.textContent = pickLang(site, 'church_name'));
  document.querySelectorAll('[data-field="church_name_en"]').forEach(el => {
    el.textContent = site.church_name_en || '';
    el.style.display = (site.church_name_en && window.siteLang !== 'en') ? '' : 'none';
  });
  document.querySelectorAll('[data-field="tagline"]').forEach(el => el.textContent = pickLang(site, 'tagline'));
  document.querySelectorAll('[data-field="pastor_name"]').forEach(el => el.textContent = pickLang(site, 'pastor_name'));
  document.querySelectorAll('[data-field="greeting"]').forEach(el => el.textContent = pickLang(site, 'greeting'));
  document.querySelectorAll('[data-field="history"]').forEach(el => el.textContent = pickLang(site, 'history'));
  document.querySelectorAll('[data-field="vision"]').forEach(el => el.textContent = pickLang(site, 'vision'));
  document.querySelectorAll('[data-field="address"]').forEach(el => el.textContent = site.address || '');
  document.querySelectorAll('[data-field="address_en"]').forEach(el => {
    el.textContent = site.address_en || '';
    el.style.display = site.address_en ? '' : 'none';
  });
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

  const socialContainer = document.querySelector('.footer-social');
  if (socialContainer && Array.isArray(site.social_links)) {
    const iconMap = {
      '페이스북': 'f',
      '카카오톡채널': 'K',
      '네이버블로그': 'N',
      'X(트위터)': 'X',
      '쓰레드': '@',
      '밴드': 'B',
      '기타': '●',
    };
    site.social_links.forEach(link => {
      if (!link.url) return;
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', link.platform || '소셜 링크');
      a.textContent = iconMap[link.platform] || '●';
      socialContainer.appendChild(a);
    });
  }

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
        <a href="worship.html" class="service-card">
          <div class="name">${esc(s.name)}</div>
          <div class="time">${esc(s.time)}</div>
          <div class="place">${esc(s.place)}</div>
        </a>`).join('')
      : `<p class="empty-state">등록된 예배 시간이 없습니다.</p>`;
  }

  // 지도
  const mapFrame = document.getElementById('map-embed');
  if (mapFrame && site.map_lat && site.map_lng) {
    mapFrame.src = `https://maps.google.com/maps?q=${site.map_lat},${site.map_lng}&z=16&output=embed`;
  }

  // 교회 전경 사진 (히어로 배경)
  const photo = document.getElementById('hero-photo');
  if (photo && site.church_photo) {
    photo.src = site.church_photo;
    photo.alt = `${site.church_name || ''} 전경`;
    photo.style.display = '';
  } else if (photo) {
    photo.style.display = 'none';
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

  // 100주년 배너
  const annivSection = document.getElementById('anniversary');
  if (annivSection) {
    const annivImg = document.getElementById('anniversary-image');
    if (site.anniversary_enabled) {
      if (site.anniversary_image) {
        annivImg.src = site.anniversary_image;
        annivImg.style.display = '';
      } else {
        annivImg.style.display = 'none';
      }
      document.getElementById('anniversary-caption').textContent = pickLang(site, 'anniversary_caption');
      const annivLink = document.getElementById('anniversary-link');
      if (annivLink) {
        if (site.anniversary_link) {
          annivLink.href = site.anniversary_link;
          annivLink.textContent = site.anniversary_link_text || (window.siteLang === 'en' ? 'Learn more' : '자세히 보기');
          annivLink.style.display = 'inline-block';
        } else {
          annivLink.style.display = 'none';
        }
      }
      annivSection.classList.add('show');
    } else {
      annivSection.classList.remove('show');
    }
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
  // 최근 설교(홈페이지)는 영상이 있는 주일예배·수요예배만 보여줍니다
  const featured = items.filter(s => {
    const type = s.service_type || '주일예배';
    return (type === '주일예배' || type === '수요예배' || type === '특별예배') && s.youtube_url;
  });
  if (!featured.length) {
    list.innerHTML = `<p class="empty-state">등록된 설교가 없습니다.</p>`;
    return;
  }
  const sorted = [...featured].sort((a, b) => new Date(b.date) - new Date(a.date));
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

function initScrollTop() {
  const btn = document.getElementById('scroll-top-btn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btn.classList.add('show');
    else btn.classList.remove('show');
  });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function initNav() {
  const toggle = document.querySelector('.menu-toggle');
  const overlay = document.getElementById('mega-menu-overlay');
  const closeBtn = document.getElementById('mega-menu-close');
  if (!toggle || !overlay) return;
  toggle.addEventListener('click', () => overlay.classList.add('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', () => overlay.classList.remove('open')));
}

async function init() {
  initNav();
  initScrollTop();
  initLangToggle();
  applyStaticI18n();
  const [site, notices, sermons, leaders] = await Promise.all([
    loadJSON('content/site.json'),
    loadJSON('content/notices.json'),
    loadJSON('content/sermons.json'),
    loadJSON('content/leaders.json'),
  ]);
  renderSite(site);
  renderNotices(notices);
  renderSermons(sermons);

  const homePastorPhoto = document.getElementById('home-pastor-photo');
  if (homePastorPhoto && leaders && leaders.pastor && leaders.pastor.photo) {
    homePastorPhoto.src = leaders.pastor.photo;
    homePastorPhoto.alt = `${leaders.pastor.name || ''} 사진`;
    homePastorPhoto.style.display = '';
  }

  document.getElementById('year').textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', init);
