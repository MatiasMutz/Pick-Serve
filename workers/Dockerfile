FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# CMD is overridden per service in docker-compose.yml
CMD ["python", "scoring_worker.py"]
