import threading
import math
import subprocess
import logging
import os
from time import time
from flask import Flask, request

# Configuración de Logs para monitoreo
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

# --- CONFIGURACIÓN ---
SERVICE_NAME = str(os.getenv("SERVICE_NAME", "stack-autoscaler_rest-app"))
REQ_PER_REPLICA_UP = int(os.getenv("REQ_PER_REPLICA_UP", 20))  # Capacidad teórica por réplica
MAX_REPLICAS = int(os.getenv("MAX_REPLICAS", 10))
MIN_REPLICAS = int(os.getenv("MIN_REPLICAS", 2))
TIME_COOLDOWN = int(os.getenv("TIME_COOLDOWN", 60))      # Segundos de espera entre acciones de escalado
SAFETY_MARGIN = float(os.getenv("SAFETY_MARGIN", 1.15))  # Margen de seguridad para evitar escalados frecuentes

# --- ESTADO GLOBAL ---
ultimo_escalado = 0
scale_lock = threading.Lock()

def get_current_replicas():
    """Consulta a Docker Swarm las réplicas configuradas actualmente."""
    try:
        result = subprocess.run(
            ["docker", "service", "inspect", SERVICE_NAME, "--format", "{{.Spec.Mode.Replicated.Replicas}}"],
            capture_output=True, text=True, check=True
        )
        output = result.stdout.strip()
        return int(output) if output.isdigit() else MIN_REPLICAS
    except Exception as e:
        logger.error(f"Error al consultar réplicas: {e}")
        return None

def scale_to_replicas(target_replicas):
    """Ejecuta el comando de escalado en el orquestador."""
    try:
        subprocess.run(["docker", "service", "scale", f"{SERVICE_NAME}={target_replicas}"], check=True)
        logger.info(f"ÉXITO: Servicio {SERVICE_NAME} escalado a {target_replicas} réplicas.")
        return True
    except Exception as e:
        logger.error(f"FALLO al escalar: {e}")
        return False

def calculate_target_replicas(request_rate):
    """Calcula cuántas réplicas se necesitan con margen de seguridad."""
    # (Tráfico total / Capacidad por réplica) * Margen
    needed = math.ceil((request_rate / REQ_PER_REPLICA_UP) * SAFETY_MARGIN)
    # Aplicar límites (Clamp)
    return max(MIN_REPLICAS, min(MAX_REPLICAS, needed))

@app.route("/alert", methods=["POST"])
def autoscale():
    global ultimo_escalado
    
    data = request.json or {}
    alerts = data.get("alerts", [])
    
    if not alerts:
        return "No hay alertas en el payload", 400

    # Bloqueamos el hilo para evitar que múltiples alertas procesen al mismo tiempo
    with scale_lock:
        ahora = time()
        
        # 1. Verificar Cooldown
        tiempo_pasado = ahora - ultimo_escalado
        if tiempo_pasado < TIME_COOLDOWN:
            msg = f"Cooldown activo. Faltan {int(TIME_COOLDOWN - tiempo_pasado)}s."
            logger.info(msg)
            return msg, 200

        # 2. Procesar la alerta (tomamos la primera activa con valor)
        for alerta in alerts:
            try:
                # Extraemos el valor de la métrica que viene de Prometheus
                # Importante: Asegúrate de que tu alerta envíe este valor en annotations
                raw_value = alerta.get("annotations", {}).get("value", 0)
                current_request_rate = float(raw_value)
                
                current_replicas = get_current_replicas()
                if current_replicas is None:
                    continue

                target = calculate_target_replicas(current_request_rate)

                # 3. Lógica de decisión
                if target == current_replicas:
                    return f"Carga estable. Se mantienen {current_replicas} réplicas.", 200

                if current_replicas >= MAX_REPLICAS and target >= MAX_REPLICAS:
                    return f"Ya se alcanzó el máximo ({MAX_REPLICAS}).", 200

                # Ejecutar escalado
                if scale_to_replicas(target):
                    ultimo_escalado = ahora
                    return f"Escalado realizado: {current_replicas} -> {target}", 200
                
            except Exception as e:
                logger.error(f"Error procesando alerta individual: {e}")
                continue

    return "Procesado sin cambios", 200

if __name__ == "__main__":
    logger.info(f"Escalador iniciado. Objetivo: {SERVICE_NAME} (Min: {MIN_REPLICAS}, Max: {MAX_REPLICAS})")
    app.run(host="0.0.0.0", port=5000, debug=False)