/* Core Game Engine, Boss Mechanics, Level Progression & City Repair */
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
  const lifeLostMenu = document.getElementById('life-lost-menu');

  const startBtn = document.getElementById('start-btn');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const restartBtn = document.getElementById('restart-btn');
  const menuBtn = document.getElementById('menu-btn');
  const retryLevelBtn = document.getElementById('retry-level-btn');
  const audioToggle = document.getElementById('audio-toggle');

  const scoreDisplay = document.getElementById('score-display');
  const levelDisplay = document.getElementById('level-display');
  const multiplierDisplay = document.getElementById('multiplier-display');
  const healthBar = document.getElementById('health-bar');
  const highScoreDisplay = document.getElementById('high-score-display');
  const livesDisplay = document.getElementById('lives-display');
  const progressDisplay = document.getElementById('progress-display');
  const bossBanner = document.getElementById('boss-banner');
  const bossHealthBar = document.getElementById('boss-health-bar');

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

  function applyTheme(themeKey) {
    currentThemeKey = themeKey;
    localStorage.setItem('cyber_theme', themeKey);
    document.body.setAttribute('data-theme', themeKey);
  }

  function getActiveDiff() { return config.difficulties[currentDiffKey] || config.difficulties.medium; }
  function getActiveCharSet() { return config.characterSets[currentCharSetKey] || config.characterSets.alpha; }

  // Game State Variables
  let gameState = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, LIFELOST
  let score = 0;
  let health = 100;
  let currentLevel = 1;
  let lives = config.initialLives;
  let streak = 0;
  let maxStreak = 0;
  let levelDestroyedCount = 0;
  let totalDestroyedCount = 0;
  let nextLetterId = 1;
  let gridOffset = 0;

  // Boss & Level Tracking
  let currentBoss = null;
  let spawnTimer = 0;
  let lettersSinceLastBoss = 0;

  // Entities
  let fallingLetters = [];
  let energyBolts = [];
  let particles = [];
  let smokeParticles = [];
  let buildings = [];

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
            color: 'var(--primary-cyan)'
          });
        }
      }
    }
    return windows;
  }

  function repairCity() {
    health = 100;
    buildings.forEach(b => {
      b.damaged = false;
      b.damageRatio = 0;
      b.craters = [];
    });
    updateHUD();
  }

  /* Entity Classes */
  class FallingLetter {
    constructor(overrideChar = null, startX = null, startY = null, overrideSpeed = null) {
      this.id = nextLetterId++;
      const charSet = getActiveCharSet();
      this.char = overrideChar || charSet[Math.floor(Math.random() * charSet.length)];
      this.x = startX !== null ? startX : (60 + Math.random() * (width - 120));
      this.y = startY !== null ? startY : -30;
      const diff = getActiveDiff();
      this.speed = overrideSpeed !== null ? overrideSpeed : (diff.baseSpeed + (currentLevel - 1) * 0.25 + Math.random() * 0.4);
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

  class BossSpaceship {
    constructor(level) {
      this.level = level;
      const phraseIndex = (level - 1) % config.bossPhrases.length;
      this.phrase = config.bossPhrases[phraseIndex];
      this.x = width / 2;
      this.y = 130;
      this.vx = 1.8;
      this.width = Math.max(320, this.phrase.length * 28 + 60);
      this.height = 70;

      // Letter targets array inside spaceship
      this.letters = [];
      const charWidth = 26;
      const startX = -((this.phrase.length - 1) * charWidth) / 2;
      for (let i = 0; i < this.phrase.length; i++) {
        this.letters.push({
          char: this.phrase[i],
          relX: startX + i * charWidth,
          relY: 0,
          hit: false,
          targeted: false
        });
      }

      this.dying = false;
      this.dead = false;
      this.vy = 0;
      this.attackTimer = 0;
    }

    getRemainingCount() {
      return this.letters.filter(l => !l.hit).length;
    }

    update() {
      if (this.dying) {
        // Continuous explosions while frame flies away
        if (Math.random() < 0.6) {
          const rx = this.x + (Math.random() - 0.5) * this.width;
          const ry = this.y + (Math.random() - 0.5) * this.height;
          createExplosion(rx, ry);
        }
        this.y += this.vy;
        this.vy -= 0.15; // Accelerate upwards
        if (this.y < -150) {
          this.dead = true;
        }
        return;
      }

      // Horizontal hovering movement
      this.x += this.vx;
      if (this.x - this.width / 2 < 40 || this.x + this.width / 2 > width - 40) {
        this.vx *= -1;
      }

      // Boss shooting attacks
      this.attackTimer++;
      const interval = config.bossAttackInterval(this.level);
      if (this.attackTimer >= interval) {
        this.attackTimer = 0;
        this.shootLetter();
      }
    }

    shootLetter() {
      sound.playLaser();
      const charSet = getActiveCharSet();
      const projChar = charSet[Math.floor(Math.random() * charSet.length)];
      const projSpeed = 1.5 + this.level * 0.35;
      fallingLetters.push(new FallingLetter(projChar, this.x, this.y + 35, projSpeed));
    }

    draw() {
      ctx.save();
      const theme = config.themes[currentThemeKey] || config.themes.cyberpunk;

      // Draw Spaceship Hull / Wings Frame
      ctx.translate(this.x, this.y);

      ctx.beginPath();
      ctx.moveTo(-this.width / 2, 0);
      ctx.lineTo(-this.width / 2 + 30, -this.height / 2);
      ctx.lineTo(this.width / 2 - 30, -this.height / 2);
      ctx.lineTo(this.width / 2, 0);
      ctx.lineTo(this.width / 2 - 30, this.height / 2);
      ctx.lineTo(-this.width / 2 + 30, this.height / 2);
      ctx.closePath();

      ctx.fillStyle = 'rgba(15, 10, 30, 0.9)';
      ctx.strokeStyle = this.dying ? theme.secondaryColor : theme.primaryColor;
      ctx.lineWidth = 4;
      ctx.shadowColor = this.dying ? theme.secondaryColor : theme.primaryColor;
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.stroke();

      // Wing cannons
      ctx.fillStyle = theme.accentColor;
      ctx.fillRect(-this.width / 2 - 12, -10, 12, 20);
      ctx.fillRect(this.width / 2, -10, 12, 20);

      // Draw Bunched Sentence Letters inside frame
      this.letters.forEach(l => {
        if (!l.hit) {
          ctx.font = 'bold 24px monospace';
          ctx.fillStyle = l.targeted ? theme.accentColor : '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = l.targeted ? theme.accentColor : theme.primaryColor;
          ctx.shadowBlur = l.targeted ? 15 : 8;
          ctx.fillText(l.char, l.relX, l.relY);

          if (l.targeted) {
            ctx.strokeStyle = theme.accentColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(l.relX - 12, l.relY - 14, 24, 28);
          }
        } else {
          // Damaged frame slot spark effect
          ctx.fillStyle = 'rgba(255, 0, 85, 0.3)';
          ctx.fillRect(l.relX - 10, l.relY - 12, 20, 24);
        }
      });

      ctx.restore();
    }
  }

  class EnergyBolt {
    constructor(startX, startY, targetObj, isBossLetter = false, bossLetterRef = null) {
      this.startX = startX;
      this.startY = startY;
      this.x = startX;
      this.y = startY;
      this.targetObj = targetObj;
      this.isBossLetter = isBossLetter;
      this.bossLetterRef = bossLetterRef;
      this.speed = 24;
      this.reached = false;
    }

    getTargetCoords() {
      if (this.isBossLetter && currentBoss) {
        return {
          x: currentBoss.x + this.bossLetterRef.relX,
          y: currentBoss.y + this.bossLetterRef.relY
        };
      } else if (this.targetObj) {
        return { x: this.targetObj.x, y: this.targetObj.y };
      }
      return { x: this.x, y: this.y };
    }

    update() {
      const coords = this.getTargetCoords();
      const dx = coords.x - this.x;
      const dy = coords.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= this.speed) {
        this.x = coords.x;
        this.y = coords.y;
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
      handleCityShieldFailure();
    }
  }

  function handleCityShieldFailure() {
    lives--;
    updateHUD();

    if (lives > 0) {
      gameState = 'LIFELOST';
      lifeLostMenu.classList.remove('hidden');
    } else {
      gameOver();
    }
  }

  function restartCurrentLevel() {
    lifeLostMenu.classList.add('hidden');
    fallingLetters = [];
    energyBolts = [];
    particles = [];
    smokeParticles = [];
    currentBoss = null;
    lettersSinceLastBoss = 0;

    repairCity();
    gameState = 'PLAYING';
  }

  // Key Event Handling
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (gameState === 'PLAYING') pauseGame();
      else if (gameState === 'PAUSED') resumeGame();
      return;
    }

    if (gameState !== 'PLAYING') return;

    const key = e.key.toUpperCase();
    if (key.length !== 1) return;

    const cannonX = width / 2;
    const cannonY = height - 70;

    // First check if key matches falling letter
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
      energyBolts.push(new EnergyBolt(cannonX, cannonY, lowestLetter, false, null));
      registerHit();
      return;
    }

    // Next check if key matches un-hit character on Boss Spaceship
    if (currentBoss && !currentBoss.dying) {
      const targetBossChar = currentBoss.letters.find(l => !l.hit && !l.targeted && l.char === key);
      if (targetBossChar) {
        sound.playLaser();
        targetBossChar.targeted = true;
        energyBolts.push(new EnergyBolt(cannonX, cannonY, currentBoss, true, targetBossChar));
        registerHit();
        return;
      }
    }

    // Key miss resets streak
    streak = 0;
    updateHUD();
  });

  function registerHit() {
    streak++;
    if (streak > maxStreak) maxStreak = streak;
    totalDestroyedCount++;
    levelDestroyedCount++;
    lettersSinceLastBoss++;

    const multiplier = Math.min(5, 1 + Math.floor(streak / 5));
    score += 100 * multiplier;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('cyber_highscore', highScore);
    }

    // Check Boss Spawn condition (Every 5 letters destroyed)
    if (lettersSinceLastBoss >= 5 && !currentBoss) {
      lettersSinceLastBoss = 0;
      currentBoss = new BossSpaceship(currentLevel);
    }

    // Check Level Complete condition
    const quota = config.levelQuota(currentLevel);
    if (levelDestroyedCount >= quota && (!currentBoss || currentBoss.dead)) {
      advanceLevel();
    }

    updateHUD();
  }

  function advanceLevel() {
    currentLevel++;
    levelDestroyedCount = 0;
    lettersSinceLastBoss = 0;
    currentBoss = null;
    repairCity();
    updateHUD();
  }

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
      const currentInterval = Math.max(35, diff.spawnInterval - (currentLevel - 1) * 10);

      // Normal Letter Spawning (if no active boss or level quota not yet met)
      const quota = config.levelQuota(currentLevel);
      if (levelDestroyedCount < quota) {
        spawnTimer++;
        if (spawnTimer >= currentInterval) {
          spawnTimer = 0;
          fallingLetters.push(new FallingLetter());
        }
      }

      const groundY = height - 70;

      // Update & Render Boss Spaceship
      if (currentBoss) {
        currentBoss.update();
        currentBoss.draw();

        if (currentBoss.dead) {
          currentBoss = null;
          repairCity();
          if (levelDestroyedCount >= quota) {
            advanceLevel();
          }
        }
      }

      // Update & Render Falling Letters
      for (let i = fallingLetters.length - 1; i >= 0; i--) {
        const letter = fallingLetters[i];
        letter.update();
        letter.draw();

        if (letter.y + letter.radius >= groundY - 20) {
          damageCity(letter.x, groundY);
          fallingLetters.splice(i, 1);
        }
      }

      // Update & Render Energy Bolts
      for (let i = energyBolts.length - 1; i >= 0; i--) {
        const bolt = energyBolts[i];
        bolt.update();
        bolt.draw();

        if (bolt.reached) {
          createExplosion(bolt.x, bolt.y);

          if (bolt.isBossLetter && bolt.bossLetterRef) {
            bolt.bossLetterRef.hit = true;
            bolt.bossLetterRef.targeted = false;

            if (currentBoss && currentBoss.getRemainingCount() === 0) {
              currentBoss.dying = true;
              currentBoss.vy = -1;
            }
          } else if (bolt.targetObj) {
            const index = fallingLetters.indexOf(bolt.targetObj);
            if (index !== -1) {
              fallingLetters.splice(index, 1);
            }
          }

          energyBolts.splice(i, 1);
        }
      }

      // Update & Render Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Update & Render Smoke Particles
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
    currentLevel = 1;
    lives = config.initialLives;
    streak = 0;
    maxStreak = 0;
    levelDestroyedCount = 0;
    totalDestroyedCount = 0;
    lettersSinceLastBoss = 0;
    currentBoss = null;

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
    lifeLostMenu.classList.add('hidden');
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
    finalDestroyedEl.textContent = totalDestroyedCount;
    finalStreakEl.textContent = maxStreak + 'x';

    gameOverMenu.classList.remove('hidden');
  }

  function updateHUD() {
    scoreDisplay.textContent = String(score).padStart(5, '0');
    levelDisplay.textContent = `LVL ${currentLevel}`;
    multiplierDisplay.textContent = `${Math.min(5, 1 + Math.floor(streak / 5))}x`;
    highScoreDisplay.textContent = String(highScore).padStart(5, '0');

    // Lives UI Display
    let livesText = "";
    for (let i = 0; i < lives; i++) livesText += "❤️ ";
    livesDisplay.textContent = livesText || "NONE";

    // Progress UI Display
    const quota = config.levelQuota(currentLevel);
    progressDisplay.textContent = `${levelDestroyedCount}/${quota}`;

    // Boss UI Banner Display
    if (currentBoss && !currentBoss.dying) {
      bossBanner.classList.remove('hidden');
      const rem = currentBoss.getRemainingCount();
      const total = currentBoss.phrase.length;
      bossHealthBar.style.width = `${Math.max(0, (rem / total) * 100)}%`;
    } else {
      bossBanner.classList.add('hidden');
    }

    // Health Bar Color
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

  /* Initializing Settings Form Controls */
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
  retryLevelBtn.addEventListener('click', () => { sound.init(); restartCurrentLevel(); });
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

  // Init
  initSettingsControls();
  resizeCanvas();
  updateHUD();
  requestAnimationFrame(gameLoop);
})();
