/* Game Engine Configurations & Themes */
window.GAME_CONFIG = {
  // Theme styling definitions
  themes: {
    cyberpunk: {
      name: "Cyberpunk Neon",
      bodyAttr: "cyberpunk",
      primaryColor: "#00f3ff",
      secondaryColor: "#ff0055",
      accentColor: "#ffe600",
      buildingBg: "#0c0f24",
      buildingBorder: "rgba(0, 243, 255, 0.5)",
      gridColor: "rgba(0, 243, 255, 0.25)"
    },
    matrix: {
      name: "Matrix Green",
      bodyAttr: "matrix",
      primaryColor: "#00ff66",
      secondaryColor: "#00aa33",
      accentColor: "#ccff00",
      buildingBg: "#041a0b",
      buildingBorder: "rgba(0, 255, 102, 0.5)",
      gridColor: "rgba(0, 255, 102, 0.25)"
    },
    synthwave: {
      name: "Retro Synthwave",
      bodyAttr: "synthwave",
      primaryColor: "#ff007f",
      secondaryColor: "#7928ca",
      accentColor: "#ff00d4",
      buildingBg: "#1c082b",
      buildingBorder: "rgba(255, 0, 127, 0.5)",
      gridColor: "rgba(255, 0, 212, 0.3)"
    },
    arcade: {
      name: "Classic Arcade",
      bodyAttr: "arcade",
      primaryColor: "#ff3300",
      secondaryColor: "#ff9900",
      accentColor: "#ffff00",
      buildingBg: "#1f0b0b",
      buildingBorder: "rgba(255, 51, 0, 0.5)",
      gridColor: "rgba(255, 51, 0, 0.25)"
    }
  },

  // Difficulty settings
  difficulties: {
    baby: { name: "Baby Mode (Super Easy)", baseSpeed: 0.45, spawnInterval: 200, damage: 4 },
    easy: { name: "Easy", baseSpeed: 0.9, spawnInterval: 140, damage: 8 },
    medium: { name: "Medium", baseSpeed: 1.3, spawnInterval: 110, damage: 12 },
    hard: { name: "Hard (Nightmare)", baseSpeed: 1.8, spawnInterval: 80, damage: 18 }
  },

  // Level Progression Quotas (Quota increases per level)
  levelQuota: function(level, diffKey = "medium") {
    if (diffKey === "baby") {
      let q = 5;
      for (let i = 2; i <= level; i++) {
        q = Math.floor(q * 1.5);
      }
      return q;
    }
    return 15 + (level - 1) * 10;
  },

  // Boss Spaceship Encryption Phrases / Sentences
  bossPhrases: [
    "CYBERSPACEDESTROYER",
    "MEGABYTEOVERLORD",
    "TERMINALCORRUPTION",
    "QUANTUMANNIHILATION",
    "SYSTEMDISRUPTIONGRID",
    "ENCRYPTIONBREACHMASTER",
    "SYNTHWAVEINTRUDERX",
    "EXTERMINATEALLNETWORKS"
  ],

  // Lives Configuration
  initialLives: 3,

  // Boss frequency: Boss spawns every 5 levels
  bossLevelInterval: 5,

  // Rest period duration in seconds when advancing levels
  levelRestDuration: 2.5,

  // Boss Attack intervals (frames) - gets faster with level
  bossAttackInterval: function(bossLevel) {
    return Math.max(40, 120 - (Math.floor(bossLevel / 5) - 1) * 15);
  },

  // Letter Character Sets
  characterSets: {
    alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    symbols: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  },

  // Default Game Settings
  defaults: {
    theme: "cyberpunk",
    difficulty: "medium",
    characterSet: "alpha",
    volume: 0.8
  }
};
