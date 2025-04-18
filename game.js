const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = 480;
const GAME_HEIGHT = 640;

// Адаптация размера канваса и позиционирование кнопок
function resizeCanvas() {
  const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
  let width = window.innerWidth;
  let height = window.innerHeight;
  const screenAspectRatio = width / height;

  if (screenAspectRatio > aspectRatio) {
    width = height * aspectRatio;
  } else {
    height = width / aspectRatio;
  }

  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${(window.innerWidth - width) / 2}px`;
  canvas.style.top = `0px`;

  const canvasBottom = height;
  const buttonOffset = 10;
  document.getElementById('leftButton').style.bottom = `${buttonOffset}px`;
  document.getElementById('rightButton').style.bottom = `${buttonOffset}px`;
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
const playerSpeed = 4; // Пикселей/кадр при 60 FPS
const bulletSpeed = 7;
const enemySpawnInterval = 30; // Кадров при 60 FPS
const enemySpeedRange = [1, 2];
const bossAppearScore = 1500;
const bossHP = 5;
const autoFireInterval = 400; // Миллисекунды (не зависит от FPS)
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

// Учёт времени для нормализации скорости
const targetFPS = 60;
const targetFrameTime = 1000 / targetFPS; // 16.67 мс при 60 FPS
let lastTime = performance.now();

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

  lastTime = performance.now(); // Сбрасываем время для нового
