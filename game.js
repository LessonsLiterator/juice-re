const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const msgEl = document.getElementById('msg');

let score = 0;
let lives = 5;
let gameActive = false;
let objects = [];
let trail = [];

const config = {
    gravity: 0.08,             // Еще медленнее
    initialVelocity: -9,       // Плавный взлет
    spawnRate: 0.015,          // Частота появления
    objSize: 120,              // Крупные объекты
    fruitImages: ['apple.png', 'durian.png', 'mango.png', 'orange.png', 'pears.png', 'strawberry.png', 'tomato.png', 'watermelon.png'],
    mascotImages: ['maskot1.png', 'maskot2.png']
};

const images = {};

function preloadAssets() {
    const allImgs = [...config.fruitImages, ...config.mascotImages];
    allImgs.forEach(src => {
        const img = new Image();
        img.src = `assets/${src}`;
        images[src] = img;
    });
}

class GameObject {
    constructor() {
        this.isMascot = Math.random() < 0.25; // 25% шанс маскота
        this.imgKey = this.isMascot 
            ? config.mascotImages[Math.floor(Math.random() * config.mascotImages.length)]
            : config.fruitImages[Math.floor(Math.random() * config.fruitImages.length)];
        
        this.w = config.objSize;
        this.h = config.objSize;
        this.x = Math.random() * (canvas.width - this.w);
        this.y = canvas.height + this.h;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = config.initialVelocity - Math.random() * 4;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        this.sliced = false;
        this.missedHandled = false;
    }

    update() {
        this.vy += config.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        
        // Логика пропуска фрукта
        if (this.y > canvas.height && !this.sliced && !this.isMascot && !this.missedHandled) {
            score = Math.max(0, score - 5);
            scoreEl.innerText = score;
            this.missedHandled = true;
        }

        return this.y < canvas.height + 200;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.rotate(this.rotation);
        
        if (this.sliced) {
            // Рисуем две половинки при разрезе
            ctx.drawImage(images[this.imgKey], -this.w/2, -this.h/2, this.w/2 - 2, this.h);
            ctx.drawImage(images[this.imgKey], 5, -this.h/2, this.w/2 - 2, this.h);
        } else {
            ctx.drawImage(images[this.imgKey], -this.w/2, -this.h/2, this.w, this.h);
        }
        ctx.restore();
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
    setTimeout(() => msgEl.style.opacity = 0, 600);
}

function checkSlice(x1, y1, x2, y2) {
    objects.forEach(obj => {
        if (obj.sliced) return;

        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;

        // Расстояние от центра объекта до линии движения мыши
        const dist = Math.abs((y2 - y1) * cx - (x2 - x1) * cy + x2 * y1 - y2 * x1) / 
                     Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

        // Если мышка прошла через область объекта
        if (dist < 50 && cx > Math.min(x1, x2) - 20 && cx < Math.max(x1, x2) + 20) {
            if (obj.isMascot) {
                obj.sliced = true; // Визуально разрезаем
                lives--;
                livesEl.innerText = lives;
                showMsg("МАСКОТ! -1 ЖИЗНЬ", "#ff4757");
                if (lives <= 0) endGame();
            } else {
                obj.sliced = true;
                const precision = Math.max(0, 100 - Math.round(dist * 1.5));
                score += Math.floor(precision / 5);
                scoreEl.innerText = score;
                showMsg(precision > 90 ? `ИДЕАЛЬНО ${precision}%` : `ХОРОШО ${precision}%`, "#2ecc71");
            }
        }
    });
}

// Управление: слежение за мышью без клика
let lastX = null;
let lastY = null;

const handleMove = (e) => {
    if (!gameActive) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    
    if (lastX !== null && lastY !== null) {
        checkSlice(lastX, lastY, x, y);
    }
    
    lastX = x;
    lastY = y;

    trail.push({x, y});
    if (trail.length > 8) trail.shift();
};

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove);

function endGame() {
    gameActive = false;
    overlay.style.display = 'flex';
    overlay.querySelector('h1').innerText = "Игра окончена!";
    overlay.querySelector('p').innerText = `Итоговый счет: ${score}`;
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем шлейф меча
    if (trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
        }
        ctx.stroke();
    }

    // Создание объектов
    if (Math.random() < config.spawnRate) {
        objects.push(new GameObject());
    }

    // Обновление и отрисовка
    objects = objects.filter(obj => {
        const onScreen = obj.update();
        obj.draw();
        return onScreen;
    });

    requestAnimationFrame(animate);
}
