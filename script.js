const openScreen = document.getElementById('openScreen');
const mainVideo = document.getElementById('mainVideo');
const heroContent = document.querySelector('.hero-content');
const audio = document.getElementById('myAudio');
const curtainImg = document.getElementsByClassName('curtain-img');

document.body.classList.add('no-scroll');
window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});

let started = false;

// mainVideo.pause();
mainVideo.loop = false;

// Ensure video preloading
mainVideo.preload = 'auto';

mainVideo.addEventListener('ended', () => {
  mainVideo.currentTime = mainVideo.duration - 0.001;
  mainVideo.pause();
});

openScreen.addEventListener('click', () => {
  if (started) return;
  mainVideo.play().catch(err => console.log('video play:', err));
  document.body.classList.remove('no-scroll');

  started = true;
  
  /* Fade out curtain image smoothly */
  if (curtainImg[0]) {
    gsap.to(curtainImg[0], {
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      onComplete: () => {
        curtainImg[0].style.display = 'none';
      }
    });
  }


  /* 2 ─ Fade in music */
  if (audio) {
    audio.currentTime = 0;
    audio.volume = 0;

    let vol = 0;
    const fadeAudio = setInterval(() => {
      if (vol < 1) {
        vol = Math.min(1, vol + 0.05);
        audio.volume = vol;
      } else {
        clearInterval(fadeAudio);
      }
    }, 120);
  }

  /* 3 ─ Fade out hint */
  gsap.to('.open-hint', {
    opacity: 0,
    duration: 0.8,
    ease: 'power2.out',
    onComplete: () => {
      const hint = document.querySelector('.open-hint');
      if (hint) hint.style.display = 'none';
    }
  });

  /* 4 ─ After 1.5 s → reveal hero content over the video */
  setTimeout(() => {
    gsap.to(heroContent, {
      opacity: 1,
      y: 0,
      duration: 1.5,
      ease: 'power3.out'
    });
  }, 1500);
});


/* ════════════════════════════════
   3-COIN SCRATCH SYSTEM
════════════════════════════════ */
const NUM_COINS = 3;
const REVEAL_PCT = 0.5;  // 50% scratched triggers full reveal per coin
let coinsRevealed = 0;
let allDone = false;

function initCoin(index) {
  const canvas = document.getElementById('canvas-' + index);
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  let isDrawing = false;
  let revealed = false;

  // --- Draw gold coin surface ---
  const grad = ctx.createRadialGradient(W * 0.4, H * 0.35, W * 0.05, W * 0.5, H * 0.5, W * 0.55);
  grad.addColorStop(0, '#f0d070');
  grad.addColorStop(0.4, '#c9a030');
  grad.addColorStop(0.75, '#a07820');
  grad.addColorStop(1, '#7a5810');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2);
  ctx.fill();

  // Coin rim
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
  ctx.stroke();

  // Coin texture lines
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, H / 2);
    ctx.lineTo(W / 2 + Math.cos(angle) * W * 0.45, H / 2 + Math.sin(angle) * H * 0.45);
    ctx.stroke();
  }

  // Coin center circle
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, W * 0.28, 0, Math.PI * 2);
  ctx.stroke();

  // Now switch to destination-out for scratching
  ctx.globalCompositeOperation = 'destination-out';

  // --- Pointer helpers ---
  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY
    };
  }

  function scratchAt(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function checkProgress() {
    if (revealed) return;
    const data = ctx.getImageData(0, 0, W, H).data;
    let cleared = 0;
    // sample every 4th pixel for performance
    for (let i = 3; i < data.length; i += 16) {
      if (data[i] < 128) cleared++;
    }
    const pct = cleared / (W * H / 4);
    if (pct > REVEAL_PCT) {
      revealed = true;
      // Fully clear this canvas
      ctx.clearRect(0, 0, W, H);
      coinsRevealed++;
      checkAllRevealed();
    }
  }

  // Mouse
  canvas.addEventListener('mousedown', e => {
    isDrawing = true;
    const p = getXY(e); scratchAt(p.x, p.y);
  });
  canvas.addEventListener('mousemove', e => {
    if (!isDrawing || revealed) return;
    const p = getXY(e); scratchAt(p.x, p.y); checkProgress();
  });
  canvas.addEventListener('mouseup', () => { isDrawing = false; });
  canvas.addEventListener('mouseleave', () => { isDrawing = false; });

  // Touch
  canvas.addEventListener('touchstart', e => {
    e.preventDefault(); isDrawing = true;
    const p = getXY(e); scratchAt(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!isDrawing || revealed) return;
    const p = getXY(e); scratchAt(p.x, p.y); checkProgress();
  }, { passive: false });
  canvas.addEventListener('touchend', () => { isDrawing = false; });
}

function checkAllRevealed() {
  if (coinsRevealed >= NUM_COINS && !allDone) {
    allDone = true;
    document.getElementById('scratch-hint').classList.add('done');
    setTimeout(() => {
      fireConfetti();
      document.getElementById('married-msg').classList.add('show');
      document.body.classList.remove('no-scroll');
    }, 300);
  } else if (coinsRevealed === 1) {
    document.getElementById('scratch-hint').textContent = '✦ Keep scratching ✦';
  } else if (coinsRevealed === 2) {
    document.getElementById('scratch-hint').textContent = '✦ One more! ✦';
  }
}

// Initialize all 3 coins
for (let i = 0; i < NUM_COINS; i++) {
  initCoin(i);
}

const scratchSection = document.querySelector('.hero');
let heroEndLocked = false;

function checkHeroEnd() {
  if (!scratchSection) return;

  const heroRect = scratchSection.getBoundingClientRect();
  const hasHeroEnded = heroRect.bottom <= 0;

  if (hasHeroEnded && !heroEndLocked) {
    heroEndLocked = true;
    document.body.classList.add('no-scroll');
    console.log('Hero ended - scroll locked');
  }
  else if (!hasHeroEnded && heroEndLocked) {
    heroEndLocked = true;
    document.body.classList.remove('no-scroll');
    console.log('Hero visible - scroll unlocked');
  }
}

let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      checkHeroEnd();
      ticking = false;
    });
    ticking = true;
  }
});

window.addEventListener('load', checkHeroEnd);
window.addEventListener('resize', checkHeroEnd);

checkHeroEnd();

/* ════════════════════════════════
   CONFETTI EXPLOSION
════════════════════════════════ */
function fireConfetti() {
  const wrap = document.getElementById('confetti-wrap');
  wrap.style.display = 'block';

  const colors = [
    '#c96a7a', '#e898a8', '#c9a84c', '#d4af5a',
    '#fff', '#fce8ee', '#e07860', '#f5c0cc',
    '#a04058', '#f0d070'
  ];
  const shapes = ['rect', 'circle'];

  for (let i = 0; i < 100; i++) {
    const cf = document.createElement('div');
    cf.className = 'cf';
    const size = 5 + Math.random() * 9;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const drift = (Math.random() - 0.5) * 200;
    const dur = 1.8 + Math.random() * 2.5;
    const delay = Math.random() * 0.8;
    cf.style.cssText = `
      left: ${10 + Math.random() * 80}%;
      width: ${size}px;
      height: ${shape === 'circle' ? size : size * 1.4}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: ${shape === 'circle' ? '50%' : '2px'};
      --drift: ${drift}px;
      animation-duration: ${dur}s;
      animation-delay: ${delay}s;
    `;
    wrap.appendChild(cf);
  }

  setTimeout(() => {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
  }, 5000);
}

/* ════════════════════════════════
   COUNTDOWN TIMER
════════════════════════════════ */
const eventDate = new Date('2026-09-12T19:00:00');
const pad = n => String(n).padStart(2, '0');

function updateCountdown() {
  const diff = eventDate - Date.now();
  if (diff <= 0) {
    ['d', 'h', 'm', 's'].forEach(id => {
      document.getElementById(id).textContent = '00';
    });
    return;
  }
  document.getElementById('d').textContent = pad(Math.floor(diff / 86400000));
  document.getElementById('h').textContent = pad(Math.floor((diff % 86400000) / 3600000));
  document.getElementById('m').textContent = pad(Math.floor((diff % 3600000) / 60000));
  document.getElementById('s').textContent = pad(Math.floor((diff % 60000) / 1000));
}

updateCountdown();
setInterval(updateCountdown, 1000);


/* ════════════════════════════════
   SCROLL REVEAL
════════════════════════════════ */
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('show');
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


/* ════════════════════════════════
   FLOATING SPARKLES
════════════════════════════════ */
function spawnSparkle() {
  const el = document.createElement('div');
  el.className = 'sparkle';

  const shapes = ['✨', '💖', '💫', '🌸'];
  const duration = 4 + Math.random() * 3;

  el.innerHTML = shapes[Math.floor(Math.random() * shapes.length)];
  el.style.position = 'fixed';
  el.style.left = Math.random() * 100 + 'vw';
  el.style.top = '-20px';
  el.style.fontSize = (12 + Math.random() * 10) + 'px';
  el.style.animation = `fall ${duration}s linear forwards`;
  el.style.zIndex = '1';
  el.style.pointerEvents = 'none';

  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration * 1000 + 200);
}

setInterval(spawnSparkle, 800);
