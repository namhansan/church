// 은혜교회 홈페이지 — content/*.json 파일을 불러와 화면에 그립니다.
// 관리자 페이지(/admin)에서 내용을 수정하면 이 파일들이 자동으로 바뀝니다.

// 언어 상태 (ko/en) — extra.js에서도 window.siteLang으로 같이 사용합니다
window.siteLang = localStorage.getItem('siteLang') || 'ko';

function pickLang(obj, field) {
  if (!obj) return '';
  if (window.siteLang === 'en' && obj[field + '_en']) return obj[field + '_en'];
  return obj[field] || '';
}

// 히어로 배경 슬라이드쇼: 이미지 여러 장을 순서대로 부드럽게 크로스페이드합니다.
function initHeroSlideshow(wrap, urls, alt) {
  wrap.innerHTML = '';
  if (!urls || !urls.length) return;

  const imgs = urls.map((url, i) => {
    const img = document.createElement('img');
    img.className = 'hero-slide';
    img.src = url;
    img.alt = alt || '';
    if (i === 0) img.classList.add('active');
    wrap.appendChild(img);
    return img;
  });

  if (imgs.length < 2) return;

  let current = 0;
  const INTERVAL_MS = 4000; // 각 사진이 화면에 머무는 시간
  setInterval(() => {
    const next = (current + 1) % imgs.length;
    imgs[next].classList.add('active');
    imgs[current].classList.remove('active');
    current = next;
  }, INTERVAL_MS);
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

  // 교회 전경 사진 (히어로 배경) — 여러 장을 부드럽게 크로스페이드
  const slideWrap = document.getElementById('hero-slides');
  if (slideWrap) {
    // CMS에 등록된 사진(church_photo, 추후 hero_gallery 배열도 지원)이 있으면 그걸 쓰고,
    // 아직 없으면 느낌을 볼 수 있도록 샘플 이미지를 임시로 넣어둡니다.
    let photos = [];
    const samples = [
      'https://picsum.photos/id/1015/1600/900',
      'https://picsum.photos/id/1043/1600/900',
      'https://picsum.photos/id/1074/1600/900',
      'https://picsum.photos/id/1050/1600/900'
    ];
    if (Array.isArray(site.hero_gallery) && site.hero_gallery.length) {
      photos = site.hero_gallery;
    } else if (site.church_photo) {
      // 실제 등록된 사진 1장 + 샘플 사진들을 같이 보여줘서 여러 장 전환 느낌을 미리 확인할 수 있게 함
      photos = [site.church_photo, ...samples];
    } else {
      photos = samples;
    }
    initHeroSlideshow(slideWrap, photos, `${site.church_name || ''} 전경`);
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
      const fullCaption = pickLang(site, 'anniversary_caption') || '';
      const [sloganLine, ...restLines] = fullCaption.split('\n');
      document.getElementById('anniversary-slogan').textContent = sloganLine || '';
      document.getElementById('anniversary-subcaption').textContent = restLines.join(' ').trim();
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
  const isNew = (d) => (Date.now() - new Date(d).getTime()) < 1000 * 60 * 60 * 24 * 7;
  list.innerHTML = sorted.map(n => `
    <div class="notice-item">
      <button type="button" class="notice-row">
        <span class="notice-tag${isNew(n.date) ? ' is-new' : ''}">${isNew(n.date) ? 'NEW' : '공지'}</span>
        <span class="notice-title">${esc(n.title)}</span>
        <span class="notice-date">${formatDate(n.date)}</span>
      </button>
      <div class="notice-body">${esc(n.body)}</div>
    </div>
  `).join('');
  list.querySelectorAll('.notice-row').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.notice-item').classList.toggle('open'));
  });

  const toggleAllBtn = document.getElementById('notices-toggle-all');
  if (toggleAllBtn) {
    toggleAllBtn.onclick = () => {
      const allItems = list.querySelectorAll('.notice-item');
      const expanding = toggleAllBtn.dataset.state !== 'open';
      allItems.forEach(el => el.classList.toggle('open', expanding));
      toggleAllBtn.dataset.state = expanding ? 'open' : 'closed';
      toggleAllBtn.textContent = expanding ? '접기 ←' : '전체보기 →';
    };
  }
}

function ytThumb(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
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
  list.innerHTML = sorted.slice(0, 8).map(s => {
    const thumb = ytThumb(s.youtube_url);
    const thumbHtml = thumb
      ? `<div class="sermon-thumb" style="background-image:url('${thumb}')"></div>`
      : `<div class="sermon-thumb sermon-thumb-placeholder"></div>`;
    return `
    <a class="sermon-card" href="${esc(s.youtube_url || '#')}" target="_blank" rel="noopener">
      ${thumbHtml}
      <div class="sermon-card-body">
        <div class="tag">${esc(s.service_type || '주일예배')}</div>
        <div class="title">${esc(s.title)}</div>
        <div class="meta">${formatDate(s.date)} · ${esc(s.preacher)} · ${esc(s.scripture)}</div>
      </div>
    </a>`;
  }).join('');

  const prevBtn = document.getElementById('sermon-prev');
  const nextBtn = document.getElementById('sermon-next');
  const scrollAmount = () => (list.querySelector('.sermon-card')?.offsetWidth || 280) + 16;
  if (prevBtn) prevBtn.onclick = () => list.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
  if (nextBtn) nextBtn.onclick = () => list.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
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

  // 다른 페이지에서 #notices, #worship 같은 앵커로 넘어온 경우,
  // 콘텐츠가 비동기로 채워지며 위치가 밀리는 문제를 다시 보정합니다.
  if (window.location.hash) {
    setTimeout(() => {
      const target = document.querySelector(window.location.hash);
      if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 60);
  }
}

document.addEventListener('DOMContentLoaded', init);
