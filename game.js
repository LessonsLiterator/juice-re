const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const msgEl = document.getElementById('msg');

let score = 0;
let lives = 5;
let gameActive = false;
let objects = []; // Целые фрукты и маскоты
let slices = [];  // Разрезанные части (декор)
let trail = [];

const config = {
    gravity: 0.1,             // Гравитация
    initialVelocity: -10,      // Сила броска
    spawnRate: 0.02,           // Частота появления
    objSize: 110,              // Размер
    fruitNames: ['apple', 'durian', 'mango', 'orange', 'pears', 'strawberry', 'tomato', 'watermelon'],
    mascotImages: ['maskot1.png', 'maskot2.png']
};

const images = {};

// Предзагрузка всех картинок
function preloadAssets() {
    // Грузим целые фрукты и их разрезы
    config.fruitNames.forEach(name => {
        const imgFull = new Image();
        imgFull.src = `assets/${name}.png`;
        images[name] = imgFull;

        const imgCut = new Image();
        imgCut.src = `assets/${name}_cut.png`;
        images[`${name}_cut`] = imgCut;
    });

    // Грузим маскотов
    config.mascotImages.forEach(src => {
        const img = new Image();
        img.src = `assets/${src}`;
        images[src] = img;
    });
}

// Класс для половинок разрезанного фрукта
class FruitSlice {
    constructor(x, y, imgKey, side, vx) {
        this.x = x;
        this.y = y;
        this.imgKey = imgKey;
        this.w = config.objSize / 2;
        this.h = config.objSize;
        this.vx = vx + (side === 'left' ? -2 : 2); // Разлетаются в стороны
        this.vy = -3; // Немного подпрыгивают при разрезе
        this.rotation = 0;
        this.rotationSpeed = side === 'left' ? -0.1 : 0.1;
        this.side = side;
    }

    update() {
        this.vy += config.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        return this.y < canvas.height + 100;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.rotate(this.rotation);
        // Рисуем нужную половинку картинки _cut.png
        const img = images[`${this.imgKey}_cut`];
        if (img) {
            if (this.side === 'left') {
                ctx.drawImage(img, 0, 0, img.width / 2, img.height, -this.w/2, -this.h/2, this.w, this.h);
            } else {
                ctx.drawImage(img, img.width / 2, 0, img.width / 2, img.height, -this.w/2, -this.h/2, this.w, this.h);
            }
        }
        ctx.restore();
    }
}

class GameObject {
    constructor() {
        this.isMascot = Math.random() < 0.2;
        this.fruitName = config.fruitNames[Math.floor(Math.random() * config.fruitNames.length)];
        this.imgKey = this.isMascot 
            ? config.mascotImages[Math.floor(Math.random() * config.mascotImages.length)]
            : this.fruitName;
        
        this.w = config.objSize;
        this.h = config.objSize;
        this.x = Math.random() * (canvas.width - this.w);
        this.y = canvas.height + this.h;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = config.initialVelocity - Math.random() * 4;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.04;
        this.isSliced = false;
    }

    update() {
        this.vy += config.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;

        // ПРОВЕРКА ПРОПУСКА (только для целых неразрезанных фруктов)
        if (this.y > canvas.height + 50 && !this.isSliced) {
            if (!this.isMascot) {
                score = Math.max(0, score - 5);
                scoreEl.innerText = score;
            }
            return false; // Удаляем объект
        }
        return this.y < canvas.height + 100;
    }

    draw() {
        if (this.isSliced) return; // Разрезанные рисуются классом FruitSlice
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.rotate(this.rotation);
        ctx.drawImage(images[this.imgKey], -this.w/2, -this.h/2, this.w, this.h);
        ctx.restore();
    }

    slice() {
        this.isSliced = true;
        if (!this.isMascot) {
            // Создаем две летящие половинки
            slices.push(new FruitSlice(this.x, this.y, this.fruitName, 'left', this.vx));
            slices.push(new FruitSlice(this.x + this.w/2, this.y, this.fruitName, 'right', this.vx));
        }
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();
preloadAssets();

function startGame() {
    score = 0;
    lives = 5;
    objects = [];
    slices = [];
    gameActive = true;
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    overlay.style.display = 'none';
    animate();
}

function showMsg(text, color = "#fff") {
    msgEl.innerText = text;
    msgEl.style.color = color;
    msgEl.style.opacity = 1;
    setTimeout(() => msgEl.style.opacity = 0, 500);
}

function checkSlice(x1, y1, x2, y2) {
    objects.forEach(obj => {
        if (obj.isSliced) return;

        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;

        const dist = Math.abs((y2 - y1) * cx - (x2 - x1) * cy + x2 * y1 - y2 * x1) / 
                     Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

        if (dist < 55 && cx > Math.min(x1, x2) - 30 && cx < Math.max(x1, x2) + 30) {
            obj.slice();
            if (obj.isMascot) {
                lives--;
                livesEl.innerText = lives;
                showMsg("МАСКОТ! -1 ЖИЗНЬ", "#ff4757");
                if (lives <= 0) endGame();
            } else {
                const precision = Math.max(0, 100 - Math.round(dist * 1.8));
                score += Math.floor(precision / 5);
                scoreEl.innerText = score;
                showMsg(precision > 90 ? "ИДЕАЛЬНО!" : "ХОРОШО!", "#2ecc71");
            }
        }
    });
}

let lastX = null, lastY = null;
const handleMove = (e) => {
    if (!gameActive) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    if (lastX !== null) checkSlice(lastX, lastY, x, y);
    lastX = x; lastY = y;
    trail.push({x, y});
    if (trail.length > 8) trail.shift();
};

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove);

function endGame() {
    gameActive = false;
    overlay.style.display = 'flex';
    overlay.querySelector('h1').innerText = "Игра окончена!";
    overlay.querySelector('p').innerText = `Твой результат: ${score}`;
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Шлейф
    if (trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
    }

    if (Math.random() < config.spawnRate) objects.push(new GameObject());

    // Фрукты и маскоты
    objects = objects.filter(obj => {
        const active = obj.update();
        obj.draw();
        return active && !obj.isSliced;
    });

    // Осколки (теперь они не влияют на счет)
    slices = slices.filter(s => {
        const active = s.update();
        s.draw();
        return active;
    });

    requestAnimationFrame(animate);
}
