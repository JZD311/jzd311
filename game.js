const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;

// Адаптация размера канваса под размер экрана
function resizeCanvas() {
  const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
  let width = window.innerWidth;
  let height = window.innerHeight;
  const screenAspectRatio = width / height;

  if (screenAspectRatio > aspectRatio) {
    // Экран шире, чем игра: ограничиваем по высоте
    width = height * aspectRatio;
  } else {
    // Экран выше, чем игра: ограничиваем по ширине
    height = width / aspectRatio;
  }

  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${(window.innerWidth - width) / 2}px`;
  canvas.style.top = `${(window.innerHeight - height) / 2}px`;
// Позиционируем кнопки под canvas
  const canvasBottom = ((window.innerHeight - height) / 2) + height;
  document.getElementById('leftButton').style.bottom = `${window.innerHeight - canvasBottom + 10}px`;
  document.getElementById('rightButton').style.bottom = `${window.innerHeight - canvasBottom + 10}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Supabase
const supabaseUrl = 'https://poqlvcnqbvcnyqlvxekm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcWx2Y25xYnZjbnlxbHZ4ZWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3ODkwMDYsImV4cCI6MjA2MDM2NTAwNn0.pBPMAQia8jzNT-e-dAT0hJ_t_QrHZUdSMU6JDdcA1JE';
const client = supabase.createClient(supabaseUrl, supabaseKey);

// Звуки
const shootSound = new Audio('pew.mp3');
const bossAppearSound = new Audio('boss.mp3');
const bossDeathSound = new Audio('explode.mp3');

// Музыка
const menuMusic = document.getElementById('menuMusic');
const music = new Audio('music.mp3');
music.loop = true;
music.volume = 0.5;

let nickname = localStorage.getItem('nickname') || null;
let direction = null;
let gameStarted = false;
let gameOver = false;
let score = 0;
let missedEnemies = 0;
let boss = null;
let bossSpawned = false;
const enemies = [];
let enemySpawnTimer = 0;

// Настройки игры
const playerSpeed = 4;
const bulletSpeed = 7;
const enemySpawnInterval = 30;
const enemySpeedRange = [1, 2];
const bossAppearScore = 1500;
const bossHP = 5;
const autoFireInterval = 400;
const maxMissedEnemies = 5;

const playerImg = new Image();
playerImg.src = 'player.png';

const enemyImg = new Image();
enemyImg.src = 'enemy.png';

const bossImg = new Image();
bossImg.src = 'boss.png';

const bgImg = new Image();
bgImg.src = 'background.png';

let bgY = 0;

const player = {
  x: GAME_WIDTH / 2 - 24,
  y: GAME_HEIGHT - 70,
  width: 48,
  height: 48,
  speed: playerSpeed,
  bullets: [],
};

// Управление
document.getElementById('leftButton').addEventListener('pointerdown', () => direction = 'left');
document.getElementById('leftButton').addEventListener('pointerup', () => direction = null);
document.getElementById('rightButton').addEventListener('pointerdown', () => direction = 'right');
document.getElementById('rightButton').addEventListener('pointerup', () => direction = null);

setInterval(() => {
  if (gameStarted && !gameOver) {
    playerShoot();
  }
}, autoFireInterval);

function playerShoot() {
  player.bullets.push({
    x: player.x + player.width / 2 - 3,
    y: player.y,
    width: 6,
    height: 12,
    speed: bulletSpeed,
  });
  shootSound.currentTime = 0;
  shootSound.play();
}

function startGame() {
  if (!nickname) {
    nickname = prompt("Введи свой ник:");
    if (!nickname) nickname = "Безымянный";
    localStorage.setItem('nickname', nickname);
  }

  document.getElementById('startScreen').style.display = 'none';
  gameOver = false;
  gameStarted = true;
  missedEnemies = 0;
  score = 0;
  boss = null;
  bossSpawned = false;
  enemies.length = 0;
  player.bullets.length = 0;

  if (menuMusic) menuMusic.pause();
  music.currentTime = 0;
  music.play();

  loop();
}

async function saveScore(name, score) {
  const { error } = await client.from('scores').insert([{ nickname: name, score }]);
  if (error) console.error('Ошибка сохранения:', error);
}

async function loadLeaderboard() {
  const { data, error } = await client
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(10);
  if (error) {
    console.error('Ошибка загрузки топа:', error);
    return;
  }
  const leaderboard = document.getElementById('topScores');
  leaderboard.innerHTML = data.map((entry, i) => `${i + 1}) ${entry.nickname}: ${entry.score}`).join('<br>');
}

function update() {
  // Фон
  bgY += 1;
  if (bgY >= GAME_HEIGHT) bgY = 0;
  if (!gameStarted || gameOver) return;

  // Игрок
  if (direction === 'left') player.x -= player.speed;
  if (direction === 'right') player.x += player.speed;
  player.x = Math.max(0, Math.min(GAME_WIDTH - player.width, player.x));

  // Пули
  player.bullets = player.bullets.filter(b => b.y > 0);
  player.bullets.forEach(b => b.y -= b.speed);

  // Спавн врагов
  enemySpawnTimer++;
  if (enemySpawnTimer > enemySpawnInterval) {
    enemies.push({
      x: Math.random() * (GAME_WIDTH - 40),
      y: -40,
      width: 40,
      height: 40,
      speed: Math.random() * (enemySpeedRange[1] - enemySpeedRange[0]) + enemySpeedRange[0],
    });
    enemySpawnTimer = 0;
  }

  // Движение врагов
  enemies.forEach((e, ei) => {
    e.y += e.speed;
    if (e.y > GAME_HEIGHT) {
      enemies.splice(ei, 1);
      missedEnemies++;
      if (missedEnemies >= maxMissedEnemies) {
        gameOver = true;
      }
    }
  });

  // Столкновения врагов с пулями
  enemies.forEach((enemy, ei) => {
    player.bullets.forEach((bullet, bi) => {
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
      ) {
        enemies.splice(ei, 1);
        player.bullets.splice(bi, 1);
        score += 100;
      }
    });
  });

  // Босс
  if (score >= bossAppearScore && !bossSpawned) {
    boss = {
      x: GAME_WIDTH / 2 - 64,
      y: -128,
      width: 128,
      height: 128,
      speed: 1,
      hp: bossHP
    };
    bossSpawned = true;
    bossAppearSound.play();
  }

  if (boss) {
    boss.y += boss.speed;
    player.bullets = player.bullets.filter((bullet) => {
      if (!boss) return true;
      if (
        bullet.x < boss.x + boss.width &&
        bullet.x + bullet.width > boss.x &&
        bullet.y < boss.y + boss.height &&
        bullet.y + bullet.height > boss.y
      ) {
        boss.hp -= 1;
        if (boss.hp <= 0) {
          score += 1000;
          boss = null;
          bossDeathSound.play();
        }
        return false;
      }
      return true;
    });
  }

  document.getElementById('score').textContent = `Счёт: ${score} | Пропущено: ${missedEnemies} / ${maxMissedEnemies}`;
}

function draw() {
  ctx.drawImage(bgImg, 0, bgY - GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT);
  ctx.drawImage(bgImg, 0, bgY, GAME_WIDTH, GAME_HEIGHT);
  ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
  ctx.fillStyle = 'lime';
  player.bullets.forEach(b => ctx.fillRect(b.x, b.y, b.width, b.height));
  enemies.forEach(e => ctx.drawImage(enemyImg, e.x, e.y, e.width, e.height));
  if (boss) ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
}

function loop() {
  update();
  draw();
  if (!gameOver) {
    requestAnimationFrame(loop);
  } else {
    music.pause();
    if (menuMusic) menuMusic.play();
    saveScore(nickname, score);
    loadLeaderboard();
    document.getElementById('startText').innerText = 'Ты проиграл! Попробуешь ещё раз?';
    document.getElementById('startScreen').style.display = 'flex';
    gameStarted = false;
  }
}

loadLeaderboard();
window.startGame = startGame;

// Убираем двойной тап на кнопках управления
document.querySelectorAll('.control-button').forEach(btn => {
  btn.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  btn.addEventListener('touchend', e => e.preventDefault(), { passive: false });
  btn.addEventListener('dblclick', e => e.preventDefault());
});
