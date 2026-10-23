const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// تحديد مجلد الملفات الثابتة (Public) حيث يوجد index.html وباقي الملفات
app.use(express.static(path.join(__dirname, 'public')));

// مسار افتراضي للتأكد من عمل السيرفر
app.get('/health', (req, res) => {
    res.status(200).send('Fecta Game Server is running successfully!');
});

// تخزين بيانات اللاعبين المتصلين حالياً أونلاين
const players = {};

io.on('connection', (socket) => {
    console.log(`لاعب متصل جديد: ${socket.id}`);

    // استقبال بيانات تهيئة اللاعب وانضمامه للعبة
    socket.on('joinGame', (playerData) => {
        players[socket.id] = {
            id: socket.id,
            name: playerData.name || `Driver_${socket.id.substr(0, 4)}`,
            carColor: playerData.carColor || '#ff3333',
            x: playerData.x || 0,
            y: playerData.y || 0.5,
            z: playerData.z || 0,
            rotation: playerData.rotation || 0,
            speed: 0
        };

        // إرسال قائمة اللاعبين الحاليين للاعب الجديد
        socket.emit('currentPlayers', players);

        // إخبار باقي اللاعبين بوجود لاعب جديد انضم
        socket.broadcast.emit('newPlayer', players[socket.id]);
    });

    // استقبال تحديثات حركة وموقع السيارة من اللاعب وبثها لباقي اللاعبين
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].z = movementData.z;
            players[socket.id].rotation = movementData.rotation;
            players[socket.id].speed = movementData.speed;

            // بث حركة اللاعب لباقي المتصلين في الغرفة/اللعبة
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // عند انقطاع اتصال اللاعب
    socket.on('disconnect', () => {
        console.log(`انقطع اتصال اللاعب: ${socket.id}`);
        delete players[socket.id];
        // إعلام الجميع بخروج هذا اللاعب
        io.emit('playerDisconnected', socket.id);
    });
});

// منفذ التشغيل (يتوافق مع إعدادات Render تلقائياً باستخدام process.env.PORT)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 سيرفر Fecta يعمل الآن على المنفذ: ${PORT}`);
});
