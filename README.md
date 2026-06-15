# 🎾 Pick & Serve

**Plataforma de pronósticos de tenis con arquitectura PUB/SUB — Trabajo Práctico de Ingeniería de Software II**

Pick & Serve digitaliza una liga privada de pronósticos ATP. El eje técnico es la arquitectura orientada a eventos con RabbitMQ: cuando un administrador carga el resultado de un partido, un único evento dispara tres workers independientes en paralelo (fan-out), y uno de ellos encadena un segundo evento.

---

## Stack

| Capa | Tecnología |
|---|---|
| API | Python + FastAPI (async) |
| Broker | RabbitMQ 3 (management UI habilitada) |
| Cliente MQ | aio-pika |
| Base de datos | PostgreSQL 16 + SQLAlchemy |
| Frontend | React + Vite + TypeScript |
| Orquestación | Docker Compose |

---

## Arquitectura de Eventos

```
POST /admin/matches/{id}/result
           │
           ▼
   Exchange: pickandserve.events  (topic)
           │
     ┌─────┴──────────────────────┐
     │                            │
     ▼                            ▼
scoring.queue              notifications.queue
scoring-worker             notification-worker
     │                            │
     │ Calcula puntos             │ Crea notificación
     │ por pronóstico             │ por usuario
     │                            │
     ▼                            │
scores.updated ──────────────────►│
     │                            │
     ▼
ranking.queue
ranking-worker
     │
     │ Recalcula posiciones
     │ globales (EVENT CHAINING)
     ▼
  rankings table


Segundo tipo de evento (scheduler / admin):

POST /admin/rounds/{id}/close  ─┐
Scheduler (cada 60s)            ├─► round.closed ─► notifications.round.queue
                                │                    notification-worker
                                └─► Round marcada cerrada en DB
```

### Colas y bindings

| Cola | Binding key | Worker |
|---|---|---|
| `scoring.queue` | `match.result.loaded` | scoring-worker |
| `notifications.queue` | `match.result.loaded` | notification-worker |
| `notifications.round.queue` | `round.closed` | notification-worker |
| `ranking.queue` | `scores.updated` | ranking-worker |

### Encadenamiento de eventos

`match.result.loaded` → **scoring-worker** → `scores.updated` → **ranking-worker**

El ranking nunca escucha directamente el resultado del partido; lo hace indirectamente a través del evento de puntajes. Esto demuestra desacople real: el scoring-worker no sabe que existe un ranking-worker.

---

## Ejecución

### Requisitos
- Docker y Docker Compose instalados

### Levantar todo

```bash
docker compose up --build
```

El seed de datos de prueba corre automáticamente al iniciar el backend (idempotente: no repite datos si ya existen).

### URLs disponibles

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API (FastAPI docs) | http://localhost:8000/docs |
| RabbitMQ Management UI | http://localhost:15672 |

### Credenciales RabbitMQ

- **Usuario:** `guest`
- **Contraseña:** `guest`

---

## Datos de prueba (Seed)

El seed crea automáticamente:

**Usuarios (10)**
| Nombre | Email | Rol |
|---|---|---|
| Admin | admin@pickserve.com | Administrador |
| Martín García | martin@example.com | Jugador |
| Sofía López | sofia@example.com | Jugador |
| Agustín Pérez | agustin@example.com | Jugador |
| Valentina Torres | valentina@example.com | Jugador |
| Tomás Rodríguez | tomas@example.com | Jugador |
| Camila Fernández | camila@example.com | Jugador |
| Nicolás Martínez | nicolas@example.com | Jugador |
| Lucía Sánchez | lucia@example.com | Jugador |
| Federico Álvarez | federico@example.com | Jugador |

**Torneos:** ATP 500 - Buenos Aires · ATP 250 - Córdoba

**Jornadas:** Cuartos de Final y Semifinal por torneo

**Partidos (con jugadores ATP reales):**
1. Carlos Alcaraz 🇪🇸 vs Daniil Medvedev 🇷🇺
2. Novak Djokovic 🇷🇸 vs Alexander Zverev 🇩🇪
3. Jannik Sinner 🇮🇹 vs Andrey Rublev 🇷🇺
4. Stefanos Tsitsipas 🇬🇷 vs Taylor Fritz 🇺🇸
5. Tommy Paul 🇺🇸 vs Casper Ruud 🇳🇴
6. Carlos Alcaraz 🇪🇸 vs Novak Djokovic 🇷🇸 *(FINAL — +2 bonus)*

**Pronósticos pre-cargados:** Los 9 jugadores ya tienen pronósticos en los partidos 1, 2, 3, 5 y 6. Al cargar el resultado del partido 1, los 9 usuarios reciben puntos/notificaciones y el ranking se mueve visiblemente.

---

## Guión de Demo paso a paso

### 1. Levantar el sistema
```bash
docker compose up --build
```
Esperar a que todos los servicios estén listos (el backend imprime `✅ Seed complete!`).

### 2. Abrir las interfaces

- **Frontend:** http://localhost:3000
- **RabbitMQ UI:** http://localhost:15672 (guest/guest)
  - Ir a **Exchanges** → ver `pickandserve.events` (topic)
  - Ir a **Queues** → ver las 4 colas creadas

### 3. Logueo como jugador
- En el frontend, elegir cualquier jugador (ej: **Martín García**)
- Ver los partidos disponibles en "Jornada"
- Verificar que ya tiene pronósticos pre-cargados en la vista

### 4. Abrir los logs (en otra terminal)
```bash
docker compose logs -f scoring-worker notification-worker ranking-worker
```
Dejar visible esta terminal durante la demo.

### 5. Logueo como admin
- Volver al login, elegir **Admin**
- Vista admin: lista de partidos con botón "Cargar resultado"

### 6. Cargar el resultado del Partido 1 (Alcaraz vs Medvedev)
- Click en **"← Ganó este"** (Alcaraz) o **"Ganó este →"** (Medvedev)
- **Observar en los logs:**
  ```
  [scoring-worker]      📥 Received match.result.loaded | match_id=1
  [scoring-worker]      ✅ user_id=2 predicted=player_a winner=player_a → 3 pts
  [notification-worker] 📥 match.result.loaded | match_id=1
  [notification-worker] 🔔 Notification for user_id=2: ✅ ¡Acertaste!...
  [scoring-worker]      📤 Published [scores.updated]: {...}   ← EVENT CHAINING
  [ranking-worker]      📥 scores.updated | match_id=1
  [ranking-worker]      🏆 #1 user_id=X → Y pts
  ```

### 7. Verificar resultados
- **Volver al jugador** → pestaña "Ranking" → el ranking cambió y muestra puntos
- **Pestaña "Alertas"** → notificación de acierto/fallo
- **RabbitMQ UI** → Queues → ver el contador de mensajes procesados

### 8. Demostrar cierre de jornada
- Como admin, click en **"🔒 Cerrar"** en una jornada
- Ver en logs que notification-worker recibe `round.closed`
- Los jugadores reciben notificación "La jornada ha sido cerrada"

### 9. Cargar más resultados
- Repetir con partidos 2, 3, 5, 6 (la final da +2 bonus adicionales)
- Ver cómo el ranking se reorganiza con cada resultado

---

## Endpoints API

```
GET  /health                         → Health check
GET  /auth/users                     → Lista de usuarios (para login)
POST /auth/login                     → Login mock {user_id}

GET  /rounds/open                    → Jornadas abiertas con partidos
POST /predictions                    → Cargar pronóstico
GET  /predictions/me?user_id=X       → Mis pronósticos

GET  /ranking                        → Ranking global

GET  /notifications/me?user_id=X     → Mis notificaciones
PUT  /notifications/{id}/read        → Marcar como leída

GET  /admin/matches                  → Todos los partidos (admin)
POST /admin/matches/{id}/result      → Cargar resultado ← DISPARA EVENTO PUB/SUB
POST /admin/rounds/{id}/close        → Cerrar jornada ← DISPARA EVENTO
```

Documentación interactiva: http://localhost:8000/docs

---

## Estructura del proyecto

```
Pick-Serve/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py              # FastAPI app + startup seed
│   ├── database.py          # SQLAlchemy engine con retry
│   ├── models.py            # Modelos ORM
│   ├── schemas.py           # Schemas Pydantic
│   ├── seed.py              # Datos de prueba (idempotente)
│   ├── events/
│   │   └── publisher.py     # Publicador de eventos aio-pika
│   └── routers/
│       ├── auth.py
│       ├── rounds.py
│       ├── predictions.py
│       ├── admin.py         # ← publica match.result.loaded / round.closed
│       ├── ranking.py
│       └── notifications.py
├── workers/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── base.py              # Helpers compartidos (DB + RabbitMQ)
│   ├── models.py            # Espejo de modelos para workers
│   ├── scoring_worker.py    # Consume match.result.loaded → calcula puntos
│   ├── notification_worker.py # Consume match.result.loaded + round.closed
│   ├── ranking_worker.py    # Consume scores.updated → recalcula ranking
│   └── scheduler.py         # Cierra jornadas vencidas automáticamente
└── frontend/
    ├── Dockerfile           # Multi-stage: build Vite → serve nginx
    ├── nginx.conf           # Proxy /api → backend
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── api.ts           # Llamadas a la API
        ├── types.ts
        ├── index.css        # Diseño tennis-themed
        ├── components/
        │   ├── TennisBg.tsx # Pelotas decorativas CSS
        │   └── Toast.tsx
        └── pages/
            ├── Login.tsx
            ├── Player/      # Dashboard, Predictions, Ranking, Notifications, Stats
            └── Admin/       # Dashboard con gestión de partidos
```

---

## Deploy en Railway

### Opción A: Docker Compose (recomendada)

Railway soporta despliegue desde `docker-compose.yml` directamente.

1. Crear proyecto en Railway: https://railway.app/new
2. Conectar el repositorio de GitHub
3. Railway detecta automáticamente el `docker-compose.yml`
4. Configurar variables de entorno si es necesario:
   - `DATABASE_URL` (Railway puede proveer PostgreSQL como plugin)
   - `RABBITMQ_URL` (usar CloudAMQP u otro provider externo)

### Opción B: Servicios separados

1. **PostgreSQL:** Add Plugin → PostgreSQL (Railway provee la URL automáticamente)
2. **RabbitMQ:** Add Plugin → usar `cloudamqp` addon o imagen custom
3. **Backend:** New Service → conectar repo → Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
4. **Workers:** Crear un servicio por worker, configurar Start Command según el worker
5. **Frontend:** New Service → Build Command: `npm run build` → Start Command: `nginx`

### Variables de entorno para Railway

```env
DATABASE_URL=postgresql://user:pass@host:5432/pickserve
RABBITMQ_URL=amqp://user:pass@host:5672/
```

---

## Reglas de puntuación

| Resultado | Puntos |
|---|---|
| Pronóstico correcto | +3 pts |
| Pronóstico incorrecto | 0 pts |
| Bonus partido final/semifinal (`is_final=true`) | +2 pts adicionales |

---

*PoC — Ingeniería de Software II · Pick & Serve Team*
