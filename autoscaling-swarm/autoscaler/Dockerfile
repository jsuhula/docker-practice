FROM python:3.9-slim
RUN apt-get update && apt-get install -y docker.io
RUN pip install flask requests
COPY autoscaler.py /app/autoscaler.py
WORKDIR /app
CMD ["python", "autoscaler.py"]