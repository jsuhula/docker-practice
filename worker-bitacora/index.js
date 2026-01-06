const redis = require('redis');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
    host: process.env.DB_HOST || 'mysql-db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'rootpassword',
    database: process.env.DB_NAME || 'db_microservicios'
};

const escribirLogTexto = (servicio, mensaje) => {
    const rutaCarpeta = `/app/logs/${servicio}`;
    const rutaArchivo = path.join(rutaCarpeta, 'historial.log');
    const linea = `[${new Date().toISOString()}] ${mensaje}\n`;

    try {
        if (!fs.existsSync(rutaCarpeta)){
            fs.mkdirSync(rutaCarpeta, { recursive: true });
        }

        fs.appendFileSync(rutaArchivo, linea);
    } catch (err) {
        console.error("Error escribiendo archivo de texto:", err);
    }
};

async function iniciarWorker() {
    console.log("Iniciando Worker Bitácora...");

    const redisClient = redis.createClient({ url: 'redis://redis-queue:6379' });
    await redisClient.connect();

    let connection;
    while (!connection) {
        try {
            connection = await mysql.createConnection(dbConfig);
            console.log("--> Conectado a MySQL exitosamente.");
        } catch (e) {
            console.log("... Esperando a MySQL (reintentando en 5s) ...");
            await new Promise(res => setTimeout(res, 5000));
        }
    }

    await connection.execute(`
        CREATE TABLE IF NOT EXISTS bitacora (
            id INT AUTO_INCREMENT PRIMARY KEY,
            servicio VARCHAR(50),
            evento VARCHAR(100),
            detalle TEXT,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log("Worker Bitácora: Escuchando cola 'bitacora_queue'...");

    while (true) {
        try {

            const resultado = await redisClient.brPop('bitacora_queue', 0);
            const mensaje = JSON.parse(resultado.element);
            
            const detalleStr = mensaje.detalle || JSON.stringify(mensaje);
            await connection.execute(
                'INSERT INTO bitacora (servicio, evento, detalle) VALUES (?, ?, ?)',
                [mensaje.servicio, mensaje.evento, detalleStr]
            );

            console.log(`[DB SAVED] ID Generado. Servicio: ${mensaje.servicio}`);

            escribirLogTexto(mensaje.servicio, `Evento: ${mensaje.evento} | Detalle: ${detalleStr}`);

        } catch (error) {
            console.error("Error procesando log:", error);
            if (error.code === 'PROTOCOL_CONNECTION_LOST') {
                 connection = await mysql.createConnection(dbConfig);
            }
        }
    }
}

iniciarWorker();