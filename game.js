const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const msgEl = document.getElementById('msg');

let score = 0;
let lives = 3;
let gameActive = false;
let objects = [];
let trail = [];

const config = {
    gravity: 0.15,
    initialVelocity: -12,
    spawnRate: 0.02,
    fruitImages: ['apple.png', 'durian.png', 'mango.png', 'orange.png', 'pears.png', 'strawberry.png', 'tomato.png', 'watermelon.png'],
    mascotImages: ['maskot1.png', 'maskot2.png']
};

const images = {};

// Предзагрузка ресурсов
function preloadAssets() {
    const allImgs = [...config.fruitImages, ...config.mascotImages];
    let loaded = 0;
    allImgs.forEach(src => {
        const img = new Image();
        img.src = `assets/${src}`;
        img.onload = () => {
            loaded++;
            if (loaded === allImgs.length) console.log('Assets loaded');
        };
        images[src] = img;
    });
}

class GameObject {
    constructor() {
        this.isMascot = Math.random() < 0.2;
        this.imgKey = this.isMascot 
            ? config.mascotImages[Math.floor(Math.random() * config.mascotImages.length)]
            : config.fruitImages[Math.floor(Math.random() * config.fruitImages.length)];
        
        this.w = 80;
        this.h = 80;
        this.x = Math.random() * (canvas.width - this.w);
        this.y = canvas.height + this.h;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = config.initialVelocity - Math.random() * 5;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.sliced = false;
    }

    update() {
        this.vy += config.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        return this.y < canvas.height + 200;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.w/2, this.y + this.h/2);
        ctx.rotate(this.rotation);
        if (this.sliced) {
            // Эффект разреза (две половинки)
            ctx.drawImage(images[this.imgKey], -this.w/2, -this.h/2, this.w/2, this.h);
            ctx.drawImage(images[this.imgKey], 5, -this.h/2, this.w/2, this.h);
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
    lives = 3;
    objects = [];
    gameActive = true;
    scoreEl.innerText = score;
    livesEl.innerText = lives;
    overlay.style.display = 'none';
    animate();
}

function showMsg(text) {
    msgEl.innerText = text;
    msgEl.style.opacity = 1;
    setTimeout(() => msgEl.style.opacity = 0, 800);
}

function checkSlice(x1, y1, x2, y2) {
    objects.forEach(obj => {
        if (obj.sliced) return;

        const centerX = obj.x + obj.w / 2;
        const centerY = obj.y + obj.h / 2;

        // Дистанция от центра объекта до линии разреза
        const dist = Math.abs((y2 - y1) * centerX - (x2 - x1) * centerY + x2 * y1 - y2 * x1) / 
                     Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

        if (dist < 40 && centerX > Math.min(x1, x2) && centerX < Math.max(x1, x2)) {
            if (obj.isMascot) {
                lives = 0;
                endGame();
            } else {
                obj.sliced = true;
                const precision = Math.max(0, 100 - Math.round(dist * 2));
                score += Math.floor(precision / 10);
                showMsg(precision > 90 ? `PERFECT ${precision}%` : `NICE ${precision}%`);
                scoreEl.innerText = score;
            }
        }
    });
}

// Управление
let isDrawing = false;
const handleInput = (e) => {
    if (!gameActive) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    
    if (isDrawing && trail.length > 0) {
        const last = trail[trail.length - 1];
        checkSlice(last.x, last.y, x, y);
    }
    
    trail.push({x, y});
    if (trail.length > 10) trail.shift();
};

window.addEventListener('mousedown', () => isDrawing = true);
window.addEventListener('mouseup', () => { isDrawing = false; trail = []; });
window.addEventListener('mousemove', handleInput);
window.addEventListener('touchstart', (e) => { isDrawing = true; handleInput(e); });
window.addEventListener('touchend', () => { isDrawing = false; trail = []; });
window.addEventListener('touchmove', handleInput);

function endGame() {
    gameActive = false;
    overlay.style.display = 'flex';
    overlay.querySelector('h1').innerText = "Игра окончена!";
    overlay.querySelector('p').innerText = `Твой счет: ${score}`;
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем шлейф (разрез)
    if (trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
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
        if (!onScreen && !obj.sliced && !obj.isMascot) {
            lives--;
            livesEl.innerText = lives;
            if (lives <= 0) endGame();
        }
        obj.draw();
        return onScreen;
    });

    requestAnimationFrame(animate);
}