const express = require('express');
const redis = require('redis');
const app = express();
const PORT = 3000; 

const redisClient = redis.createClient({ url: 'redis://redis-queue:6379' });
redisClient.connect().catch(console.error);

app.post('/transferir', async (req, res) => {
    const datosTransferencia = {
        id_transaccion: 'TX-' + Math.floor(Math.random() * 10000), // ID generado
        origen: 'Cuenta-A',
        destino: 'Cuenta-B',
        monto: 500
    };

    // AHORA: Enviamos a la cola de TRABAJO, no de logs
    await redisClient.lPush('transferencias_queue', JSON.stringify(datosTransferencia));

    // Opcional: También mandamos un log inicial de "Solicitud Recibida"
    const logInicio = JSON.stringify({ 
        servicio: 'api-transacciones', 
        evento: 'solicitud_recibida', 
        id: datosTransferencia.id_transaccion 
    });
    await redisClient.lPush('bitacora_queue', logInicio);

    // Respuesta inmediata al usuario (No espera los 2 segundos del banco)
    res.json({ 
        estado: 'PENDIENTE', 
        mensaje: 'Tu transferencia se está procesando en segundo plano.',
        id_seguimiento: datosTransferencia.id_transaccion
    });
});

app.listen(PORT, () => console.log(`API Transacciones corriendo en puerto ${PORT}`));