from time import time
from flask import Flask, request
import subprocess

app = Flask(__name__)

SERVICE_NAME = "autoscale-stack_rest-app"
REQ_PER_REPLICA_UP = 20
MAX_REPLICAS = 10
MIN_REPLICAS = 2
TIME_COOLDOWN = 60

ultimo_escalado = 0

def calculate_target_replicas(request_rate):
    # Una lógica más estándar: (tráfico total / capacidad por réplica) redondeado hacia arriba
    import math
    target = math.ceil(request_rate / REQ_PER_REPLICA_UP)
    return max(MIN_REPLICAS, min(MAX_REPLICAS, target))

def get_current_replicas():
    # Usamos inspect para obtener el número de réplicas DESEADAS, no solo las actuales
    result = subprocess.run(
        ["docker", "service", "inspect", SERVICE_NAME, "--format", "{{.Spec.Mode.Replicated.Replicas}}"],
        capture_output=True, text=True
    )
    output = result.stdout.strip()
    return int(output) if output.isdigit() else 0

def scale_to_replicas(target_replicas):
    subprocess.run(["docker", "service", "scale", f"{SERVICE_NAME}={target_replicas}"])
    print(f"Escalado servicio {SERVICE_NAME} a {target_replicas} réplicas.")

@app.route("/alert", methods=["POST"])
def autoscale():
    global ultimo_escalado
    data = request.json or {}

    alerts = data.get("alerts", [])

    ahora = time()

    if ahora - ultimo_escalado < TIME_COOLDOWN:
        return "Escalado reciente, ignorando alerta.", 200
    
    for alerta in alerts:

        current = get_current_replicas()

        current_request_rate = int(alerta.get("annotations", {}).get("value", 0))

        if current_request_rate > 0:
            target = calculate_target_replicas(current_request_rate)

            if current >= MAX_REPLICAS and target >= MAX_REPLICAS:
                return f"Ya en máximo de réplicas ({MAX_REPLICAS}).", 200

            if target != current:
                scale_to_replicas(target)
                ultimo_escalado = ahora
                return f"Escalado de {current} a {target} réplicas.", 200
            
    return "No se requiere escalado.", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)