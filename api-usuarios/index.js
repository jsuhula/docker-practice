const express = require('express');
const redis = require('redis');
const os = require('os');
const app = express();
const PORT = 3000;

const redisClient = redis.createClient({ url: 'redis://redis-queue:6379' });
redisClient.connect().catch(console.error);

app.get('/', (req, res) => {
    res.send('API Usuarios: Online');
});

app.post('/login', async (req, res) => {
    const user = "JuanPerez";
    const instancia = os.hostname();
    const logData = JSON.stringify({ servicio: 'usuarios', evento: 'login', fecha: new Date(), instancia });
    await redisClient.lPush('bitacora_queue', logData);

    res.json({ mensaje: `Bienvenido ${user}`, token: 'abc-123' });
});

app.listen(PORT, () => console.log(`API Usuarios corriendo en puerto ${PORT}`));