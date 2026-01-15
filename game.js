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
let slices = [];  
let trail = [];

const config = {
    gravity: 0.05,             // Очень медленное падение
    initialVelocity: -12,      // Мощный толчок вверх, чтобы точно вылетали
    spawnRate: 0.015,          
    objSize: 110,              
    fruitImages: ['apple.png', 'durian.png', 'mango.png', 'orange.png', 'pears.png', 'strawberry.png', 'tomato.png', 'watermelon.png'],
    mascotImages: ['maskot1.png', 'maskot2.png']
};

const images = {};

// Предзагрузка с проверкой в консоли
function preloadAssets() {
    const all = [...config.fruitImages, ...config.mascotImages];
    all.forEach(src => {
        const img = new Image();
        img.src = `./assets/${src}`; // Относительный путь для GitHub/Vercel
        images[src] = img;
        img.onload = () => console.log("Loaded:", src);
        img.onerror = () => console.error("FAILED to load:", src);
    });
}

class FruitHalf {
    constructor(x, y, img, side, vx, rotation) {
        this.x = x;
        this.y = y;
        this.img = img;
        this.side = side;
        this.w = config.objSize;
        this.h = config.objSize;
        this.vx = vx + (side === 'left' ? -2 : 2);
        this.vy = -3;
        this.rotation = rotation;
        this.rotationSpeed = side === 'left' ? -0.05 : 0.05;
    }

    update() {
        this.vy += config.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        if (this.x <= 0 || this.x + this.w/2 >= canvas.width) this.vx *= -1;
        return this.y < canvas.height + 200;
    }

    draw() {
        if (!this.img || !this.img.complete) return;
        ctx.save();
        ctx.translate(this.x + this.w / 4, this.y + this.h / 2);
        ctx.rotate(this.rotation);
        const sw = this.img.width / 2;
        const sh = this.img.height;
        if (this.side === 'left') {
            ctx.drawImage(this.img, 0, 0, sw, sh, -this.w/4, -this.h/2, this.w/2, this.h);
        } else {
            ctx.drawImage(this.img, sw, 0, sw, sh, 0, -this.h/2, this.w/2, this.h);
        }
        ctx.restore();
    }
}

class GameObject {
    constructor() {
        this.isMascot = Math.random() < 0.2;
        const list = this.isMascot ? config.mascotImages : config.fruitImages;
        this.imgKey = list[Math.floor(Math.random() * list.length)];
        this.w = config.objSize;
        this.h = config.objSize;
        this.x = Math.random() * (canvas.width - this.w);
        
        // Появляется чуть ниже экрана
        this.y = canvas.height + 10; 
        this.vx = (Math.random() - 0.5) * 4; 
        this.vy = config.initialVelocity - Math.random() * 5;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.08;
        this.isSliced = false;
        this.hasEnteredScreen = false; // Флаг: был ли фрукт виден
    }

    update() {
        this.vy += config.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;

        // Отскок от стен
        if (this.x <= 0 || this.x + this.w >= canvas.width) this.vx *= -1;

        // Проверяем, вошел ли фрукт в видимую зону
        if (this.y < canvas.height) this.hasEnteredScreen = true;

        // Удаление объекта
        if (this.y > canvas.height + 150) {
            // Штраф только если фрукт был виден и не был разрезан
            if (!this.isSliced && !this.isMascot && this.hasEnteredScreen) {
                score = Math.max(0, score - 5);
                scoreEl.innerText = score;
                showMsg("-5", "#ff4757");
            }
            return false;
        }
        return true;
    }

    draw() {
        if (this.isSliced) return;
        const img = images[this.imgKey];
        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.save();
            ctx.translate(this.x + this.w/2, this.y + this.h/2);
            ctx.rotate(this.rotation);
            ctx.drawImage(img, -this.w/2, -this.h/2, this.w, this.h);
            ctx.restore();
        }
    }

    slice() {
        this.isSliced = true;
        if (!this.isMascot) {
            const img = images[this.imgKey];
            slices.push(new FruitHalf(this.x, this.y, img, 'left', this.vx, this.rotation));
            slices.push(new FruitHalf(this.x + this.w/2, this.y, img, 'right', this.vx, this.rotation));
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
    score = 0; lives = 5; objects = []; slices = [];
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
        const cx = obj.x + obj.w/2;
        const cy = obj.y + obj.h/2;
        const dist = Math.abs((y2-y1)*cx - (x2-x1)*cy + x2*y1 - y2*x1) / Math.sqrt((y2-y1)**2 + (x2-x1)**2);

        if (dist < 55 && cx > Math.min(x1,x2)-30 && cx < Math.max(x1,x2)+30) {
            obj.slice();
            if (obj.isMascot) {
                lives--;
                livesEl.innerText = lives;
                showMsg("MASCOT! -1 LIFE", "#ff4757");
                if (lives <= 0) endGame();
            } else {
                score += 10;
                scoreEl.innerText = score;
                showMsg("NICE!", "#2ecc71");
            }
        }
    });
}

let lastX = null, lastY = null;
const handleMove = (e) => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    if (gameActive && lastX !== null) {
        checkSlice(lastX, lastY, x, y);
    }
    lastX = x; lastY = y;
    trail.push({x, y});
    if (trail.length > 8) trail.shift();
};

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove);

function endGame() {
    gameActive = false;
    overlay.style.display = 'flex';
    overlay.querySelector('h1').innerText = "Game Over!";
    overlay.querySelector('p').innerHTML = `Final Score: ${score}`;
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
    }

    if (Math.random() < config.spawnRate) objects.push(new GameObject());

    objects = objects.filter(obj => {
        const active = obj.update();
        obj.draw();
        return active && !obj.isSliced;
    });

    slices = slices.filter(s => {
        const active = s.update();
        s.draw();
        return active;
    });

    requestAnimationFrame(animate);
}
