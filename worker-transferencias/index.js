const redis = require('redis');

const procesarTransferenciaBancaria = (datos) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`[BANCO] Moviendo dinero de ${datos.origen} a ${datos.destino}: $${datos.monto}`);
            resolve(true);
        }, 2000);
    });
};

async function iniciarWorker() {

    const client = redis.createClient({ url: 'redis://redis-queue:6379' });
    await client.connect();
    
    console.log("Worker Transferencias: Esperando órdenes en 'transferencias_queue'...");

    while (true) {
        try {

            const resultado = await client.brPop('transferencias_queue', 0);
            const datos = JSON.parse(resultado.element);

            console.log(`--> Procesando orden ID: ${datos.id_transaccion}`);

            await procesarTransferenciaBancaria(datos);

            const logExito = JSON.stringify({
                servicio: 'worker-transferencias',
                evento: 'transferencia_completada',
                detalle: `ID ${datos.id_transaccion} procesada con éxito`,
                fecha: new Date()
            });

            await client.lPush('bitacora_queue', logExito);
            console.log(`<-- Orden ID: ${datos.id_transaccion} finalizada y bitacoreada.`);

        } catch (error) {
            console.error("Error procesando transferencia:", error);
        }
    }
}

iniciarWorker();