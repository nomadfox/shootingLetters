/* Core Game Engine & Rendering Logic */
(function() {
  const sound = window.soundEngine;
  const config = window.GAME_CONFIG;

  // DOM Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const startMenu = document.getElementById('start-menu');
  const settingsMenu = document.getElementById('settings-menu');
  const pauseMenu = document.getElementById('pause-menu');
  const gameOverMenu = document.getElementById('game-over-menu');

  const startBtn = document.getElementById('start-btn');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');
  const menuBtn = document.getElementById('menu-btn');
  const audioToggle = document.getElementById('audio-toggle');

  const scoreDisplay = document.getElementById('score-display');
  const levelDisplay = document.getElementById('level-display');
  const multiplierDisplay = document.getElementById('multiplier-display');
  const healthBar = document.getElementById('health-bar');
  const highScoreDisplay = document.getElementById('high-score-display');

  const finalScoreEl = document.getElementById('final-score');
  const finalDestroyedEl = document.getElementById('final-destroyed');
  const finalStreakEl = document.getElementById('final-streak');

  // Form Controls
  const themeSelect = document.getElementById('theme-select');
  const diffSelect = document.getElementById('difficulty-select');
  const charSelect = document.getElementById('charset-select');
  const volumeSlider = document.getElementById('volume-slider');

  // Game Settings State
  let currentThemeKey = localStorage.getItem('cyber_theme') || config.defaults.theme;
  let currentDiffKey = localStorage.getItem('cyber_diff') || config.defaults.difficulty;
  let currentCharSetKey = localStorage.getItem('cyber_charset') || config.defaults.characterSet;
  let currentVolume = parseFloat(localStorage.getItem('cyber_volume') || config.defaults.volume);
  let highScore = parseInt(localStorage.getItem('cyber_highscore') || '0', 10);

  // Apply Theme
  function applyTheme(themeKey) {
    currentThemeKey = themeKey;
    localStorage.setItem('cyber_theme', themeKey);
    document.body.setAttribute('data-theme', themeKey);
  }

  // Active Settings
  function getActiveDiff() { return config.difficulties[currentDiffKey] || config.difficulties.medium; }
  function getActiveCharSet() { return config.characterSets[currentCharSetKey] || config.characterSets.alpha; }

  // Game State Variables
  let gameState = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
  let score = 0;
  let health = 100;
  let level = 1;
  let streak = 0;
  let maxStreak = 0;
  let destroyedCount = 0;
  let gridOffset = 0;
  let nextLetterId = 1;

  // Entities
  let fallingLetters = [];
  let energyBolts = [];
  let particles = [];
  let smokeParticles = [];
  let buildings = [];

  let spawnTimer = 0;
  let width, height;
  const buildingWidth = 60;

  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initBuildings();
  }
  window.addEventListener('resize', resizeCanvas);

  function initBuildings() {
    buildings = [];
    const numBuildings = Math.ceil(width / buildingWidth) + 1;
    const groundY = height - 70;

    for (let i = 0; i < numBuildings; i++) {
      const bHeight = 80 + Math.random() * 140;
      buildings.push({
        x: i * buildingWidth,
        width: buildingWidth - 4,
        height: bHeight,
        y: groundY - bHeight,
        damaged: false,
        damageRatio: 0,
        craters: [],
        windows: generateWindows(buildingWidth - 4, bHeight)
      });
    }
  }

  function generateWindows(bWidth, bHeight) {
    const windows = [];
    const rows = Math.floor(bHeight / 20);
    const cols = Math.floor(bWidth / 15);
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols; c++) {
        if (Math.random() > 0.3) {
          windows.push({
            x: c * 12,
            y: r * 18,
            active: true,
            color: Math.random() > 0.5 ? 'var(--primary-cyan)' : 'var(--primary-yellow)'
          });
        }
      }
    }
    return windows;
  }

  /* Entity Classes */
  class FallingLetter {
    constructor() {
      this.id = nextLetterId++;
      const charSet = getActiveCharSet();
      this.char = charSet[Math.floor(Math.random() * charSet.length)];
      this.x = 60 + Math.random() * (width - 120);
      this.y = -30;
      const diff = getActiveDiff();
      this.speed = diff.baseSpeed + (level - 1) * 0.25 + Math.random() * 0.4;
      this.radius = 24;
      this.targeted = false;
    }

    update() {
      this.y += this.speed;
    }

    draw() {
      ctx.save();
      const theme = config.themes[currentThemeKey] || config.themes.cyberpunk;

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(12, 16, 32, 0.88)';
      ctx.strokeStyle = this.targeted ? theme.accentColor : theme.primaryColor;
      ctx.lineWidth = this.targeted ? 4 : 3;
      ctx.shadowColor = this.targeted ? theme.accentColor : theme.primaryColor;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.stroke();

      if (this.targeted) {
        ctx.strokeStyle = theme.accentColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = theme.accentColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 5;
      ctx.fillText(this.char, this.x, this.y + 2);
      ctx.restore();
    }
  }

  class EnergyBolt {
    constructor(startX, startY, targetLetter) {
      this.startX = startX;
      this.startY = startY;
      this.x = startX;
      this.y = startY;
      this.targetLetter = targetLetter;
      this.targetX = targetLetter.x;
      this.targetY = targetLetter.y;
      this.speed = 22;
      this.reached = false;
    }

    update() {
      if (this.targetLetter) {
        this.targetX = this.targetLetter.x;
        this.targetY = this.targetLetter.y;
      }

      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= this.speed) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.reached = true;
      } else {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    }

    draw() {
      ctx.save();
      const theme = config.themes[currentThemeKey] || config.themes.cyberpunk;
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = theme.primaryColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = theme.primaryColor;
      ctx.shadowBlur = 15;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = theme.primaryColor;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 8;
      this.vy = (Math.random() - 0.5) * 8;
      this.radius = 2 + Math.random() * 3;
      this.color = color;
      this.life = 1;
      this.decay = 0.02 + Math.random() * 0.03;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class SmokeParticle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = -Math.random() * 1.5 - 0.5;
      this.radius = 4 + Math.random() * 6;
      this.life = 1;
      this.decay = 0.01 + Math.random() * 0.015;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.radius += 0.1;
      this.life -= this.decay;
    }

    draw() {
      ctx.save();
      const theme = config.themes[currentThemeKey] || config.themes.cyberpunk;
      ctx.globalAlpha = Math.max(0, this.life * 0.5);
      ctx.fillStyle = theme.secondaryColor;
      ctx.shadowColor = theme.secondaryColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function createExplosion(x, y) {
    sound.playExplosion();
    const theme = config.themes[currentThemeKey] || config.themes.cyberpunk;
    for (let i = 0; i < 25; i++) {
      particles.push(new Particle(x, y, theme.primaryColor));
    }
  }

  function damageCity(letterX, groundY) {
    sound.playCityHit();
    const diff = getActiveDiff();
    health -= diff.damage;
    streak = 0;
    updateHUD();

    const bIndex = Math.floor(letterX / buildingWidth);
    if (buildings[bIndex]) {
      const b = buildings[bIndex];
      b.damaged = true;
      b.damageRatio = Math.min(1, b.damageRatio + 0.35);

      b.craters.push({
        x: letterX - b.x,
        y: 0,
        radius: 12 + Math.random() * 8
      });

      const theme = config.themes[currentThemeKey] || config.themes.cyberpunk;
      for (let i = 0; i < 15; i++) {
        smokeParticles.push(new SmokeParticle(letterX, groundY));
        particles.push(new Particle(letterX, groundY, theme.secondaryColor));
      }
    }

    if (health <= 0) {
      gameOver();
    }
  }

  // Key Event Handlers
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (gameState === 'PLAYING') pauseGame();
      else if (gameState === 'PAUSED') resumeGame();
      return;
    }

    if (gameState !== 'PLAYING') return;

    const key = e.key.toUpperCase();
    const charSet = getActiveCharSet();
    if (charSet.includes(key) && key.length === 1) {
      let lowestLetter = null;
      let lowestY = -Infinity;

      for (const item of fallingLetters) {
        if (!item.targeted && item.char === key && item.y > lowestY) {
          lowestY = item.y;
          lowestLetter = item;
        }
      }

      if (lowestLetter) {
        sound.playLaser();
        lowestLetter.targeted = true;

        const cannonX = width / 2;
        const cannonY = height - 70;

        energyBolts.push(new EnergyBolt(cannonX, cannonY, lowestLetter));

        streak++;
        if (streak > maxStreak) maxStreak = streak;
        destroyedCount++;

        const multiplier = Math.min(5, 1 + Math.floor(streak / 5));
        score += 100 * multiplier;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('cyber_highscore', highScore);
        }

        level = 1 + Math.floor(destroyedCount / 10);
        updateHUD();
      } else {
        streak = 0;
        updateHUD();
      }
    }
  });

  /* Background & Canvas Rendering */
  function drawBackground() {
    const theme = config.themes[currentThemeKey] || config.themes.cyberpunk;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#060612');
    bgGrad.addColorStop(0.6, '#180a2b');
    bgGrad.addColorStop(1, '#05030a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const horizonY = height - 120;
    const sunRadius = 90;
    const sunGrad = ctx.createLinearGradient(width / 2, horizonY - sunRadius, width / 2, horizonY);
    sunGrad.addColorStop(0, theme.accentColor);
    sunGrad.addColorStop(0.5, theme.primaryColor);
    sunGrad.addColorStop(1, theme.secondaryColor);

    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, horizonY, sunRadius, Math.PI, 0, false);
    ctx.fillStyle = sunGrad;
    ctx.shadowBlur = 30;
    ctx.shadowColor = theme.secondaryColor;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = theme.gridColor;
    ctx.lineWidth = 1.5;

    gridOffset = (gridOffset + 0.8) % 20;

    for (let y = horizonY; y <= height; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const vanishingX = width / 2;
    const totalPerspectiveLines = 24;
    for (let i = -totalPerspectiveLines; i <= totalPerspectiveLines; i++) {
      const targetX = vanishingX + i * 80;
      ctx.beginPath();
      ctx.moveTo(vanishingX, horizonY);
      ctx.lineTo(targetX, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCitySkyline() {
    const groundY = height - 70;
    const theme = config.themes[currentThemeKey] || config.themes.cyberpunk;

    buildings.forEach(b => {
      ctx.save();
      ctx.fillStyle = b.damaged ? '#141428' : theme.buildingBg;
      ctx.strokeStyle = b.damaged ? theme.secondaryColor : theme.buildingBorder;
      ctx.lineWidth = 2;

      const effectiveHeight = b.height * (1 - b.damageRatio * 0.6);
      const effectiveY = groundY - effectiveHeight;

      ctx.fillRect(b.x, effectiveY, b.width, effectiveHeight);
      ctx.strokeRect(b.x, effectiveY, b.width, effectiveHeight);

      b.windows.forEach(w => {
        if (w.active && w.y < effectiveHeight - 10) {
          ctx.fillStyle = b.damaged ? theme.secondaryColor : theme.primaryColor;
          ctx.shadowColor = theme.primaryColor;
          ctx.shadowBlur = b.damaged ? 0 : 5;
          ctx.fillRect(b.x + w.x, effectiveY + w.y, 6, 8);
        }
      });

      if (b.craters.length > 0) {
        b.craters.forEach(c => {
          ctx.fillStyle = theme.secondaryColor;
          ctx.shadowColor = theme.secondaryColor;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(b.x + c.x, effectiveY + c.y, c.radius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.restore();
    });

    // Cannon
    ctx.save();
    const cannonX = width / 2;
    ctx.fillStyle = theme.primaryColor;
    ctx.shadowColor = theme.primaryColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cannonX, groundY, 16, Math.PI, 0, false);
    ctx.fill();
    ctx.restore();

    // Ground barrier
    ctx.save();
    ctx.strokeStyle = theme.primaryColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = theme.primaryColor;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    ctx.restore();
  }

  // Game Loop
  function gameLoop() {
    ctx.clearRect(0, 0, width, height);

    drawBackground();
    drawCitySkyline();

    if (gameState === 'PLAYING') {
      const diff = getActiveDiff();
      const currentInterval = Math.max(30, diff.spawnInterval - (level - 1) * 10);

      spawnTimer++;
      if (spawnTimer >= currentInterval) {
        spawnTimer = 0;
        fallingLetters.push(new FallingLetter());
      }

      const groundY = height - 70;

      for (let i = fallingLetters.length - 1; i >= 0; i--) {
        const letter = fallingLetters[i];
        letter.update();
        letter.draw();

        if (letter.y + letter.radius >= groundY - 20) {
          damageCity(letter.x, groundY);
          fallingLetters.splice(i, 1);
        }
      }

      for (let i = energyBolts.length - 1; i >= 0; i--) {
        const bolt = energyBolts[i];
        bolt.update();
        bolt.draw();

        if (bolt.reached) {
          createExplosion(bolt.targetX, bolt.targetY);
          if (bolt.targetLetter) {
            const index = fallingLetters.indexOf(bolt.targetLetter);
            if (index !== -1) {
              fallingLetters.splice(index, 1);
            }
          }
          energyBolts.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
      }

      for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const s = smokeParticles[i];
        s.update();
        s.draw();
        if (s.life <= 0) smokeParticles.splice(i, 1);
      }
    }

    requestAnimationFrame(gameLoop);
  }

  /* UI Actions & State Transitions */
  function startGame() {
    score = 0;
    health = 100;
    level = 1;
    streak = 0;
    maxStreak = 0;
    destroyedCount = 0;
    fallingLetters = [];
    energyBolts = [];
    particles = [];
    smokeParticles = [];

    updateHUD();
    initBuildings();

    startMenu.classList.add('hidden');
    settingsMenu.classList.add('hidden');
    pauseMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    gameState = 'PLAYING';
  }

  function pauseGame() {
    gameState = 'PAUSED';
    pauseMenu.classList.remove('hidden');
  }

  function resumeGame() {
    pauseMenu.classList.add('hidden');
    gameState = 'PLAYING';
  }

  function gameOver() {
    gameState = 'GAMEOVER';
    sound.playGameOver();

    finalScoreEl.textContent = score;
    finalDestroyedEl.textContent = destroyedCount;
    finalStreakEl.textContent = maxStreak + 'x';

    gameOverMenu.classList.remove('hidden');
  }

  function updateHUD() {
    scoreDisplay.textContent = String(score).padStart(5, '0');
    levelDisplay.textContent = `LVL ${level}`;
    multiplierDisplay.textContent = `${Math.min(5, 1 + Math.floor(streak / 5))}x`;
    highScoreDisplay.textContent = String(highScore).padStart(5, '0');
    healthBar.style.width = `${Math.max(0, health)}%`;

    if (health < 30) {
      healthBar.style.background = 'var(--primary-pink)';
      healthBar.style.boxShadow = '0 0 15px var(--primary-pink)';
    } else if (health < 60) {
      healthBar.style.background = 'var(--primary-yellow)';
      healthBar.style.boxShadow = '0 0 15px var(--primary-yellow)';
    } else {
      healthBar.style.background = 'linear-gradient(90deg, var(--primary-pink), var(--primary-yellow), var(--primary-green))';
    }
  }

  /* Initializing Settings Form Values */
  function initSettingsControls() {
    applyTheme(currentThemeKey);
    sound.setVolume(currentVolume);

    themeSelect.value = currentThemeKey;
    diffSelect.value = currentDiffKey;
    charSelect.value = currentCharSetKey;
    volumeSlider.value = currentVolume;

    themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    diffSelect.addEventListener('change', (e) => {
      currentDiffKey = e.target.value;
      localStorage.setItem('cyber_diff', currentDiffKey);
    });
    charSelect.addEventListener('change', (e) => {
      currentCharSetKey = e.target.value;
      localStorage.setItem('cyber_charset', currentCharSetKey);
    });
    volumeSlider.addEventListener('input', (e) => {
      currentVolume = parseFloat(e.target.value);
      sound.setVolume(currentVolume);
      localStorage.setItem('cyber_volume', currentVolume);
    });
  }

  /* Event Listeners */
  startBtn.addEventListener('click', () => { sound.init(); startGame(); });
  restartBtn.addEventListener('click', () => { sound.init(); startGame(); });
  resumeBtn.addEventListener('click', () => resumeGame());

  openSettingsBtn.addEventListener('click', () => {
    startMenu.classList.add('hidden');
    settingsMenu.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsMenu.classList.add('hidden');
    if (gameState === 'PAUSED') pauseMenu.classList.remove('hidden');
    else startMenu.classList.remove('hidden');
  });

  pauseBtn.addEventListener('click', () => {
    if (gameState === 'PLAYING') pauseGame();
  });

  menuBtn.addEventListener('click', () => {
    pauseMenu.classList.add('hidden');
    startMenu.classList.remove('hidden');
    gameState = 'MENU';
  });

  audioToggle.addEventListener('click', () => {
    const unmuted = sound.toggleMute();
    audioToggle.textContent = unmuted ? '🔊 Audio: ON' : '🔇 Audio: OFF';
  });

  // Init Game
  initSettingsControls();
  resizeCanvas();
  updateHUD();
  requestAnimationFrame(gameLoop);
})();
