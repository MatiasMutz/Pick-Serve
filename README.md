# 🎾 Pick & Serve

**Plataforma de pronósticos de tenis ATP con arquitectura PUB/SUB en RabbitMQ**
*Trabajo Práctico — Ingeniería de Software II*

---

## Índice

1. [Descripción](#descripción)
2. [Arquitectura de Eventos](#arquitectura-de-eventos)
3. [Requisitos previos](#requisitos-previos)
4. [Configuración local paso a paso](#configuración-local-paso-a-paso)
5. [Datos de prueba](#datos-de-prueba)
6. [Guión de demo](#guión-de-demo)
7. [Tests](#tests)
8. [GitHub Actions](#github-actions)
9. [Estructura del proyecto](#estructura-del-proyecto)
10. [Deploy en Railway](#deploy-en-railway)

---

## Descripción

Pick & Serve digitaliza una liga privada de pronósticos de tenis. Los usuarios pronostican ganadores de partidos ATP; cuando un administrador carga el resultado, el sistema recalcula puntajes, actualiza el ranking y genera notificaciones — todo de forma automática y desacoplada a través de RabbitMQ.

El eje técnico es la **arquitectura orientada a eventos**: un solo evento dispara tres workers independientes en paralelo (fan-out), y uno de ellos encadena un segundo evento (event chaining).

---

## Arquitectura de Eventos

```
┌─────────────────────────────────────────────────────────────────┐
│  POST /admin/matches/{id}/result                                │
│         (Admin carga resultado de un partido)                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ publica
                          ▼
            ┌─────────────────────────┐
            │  Exchange: pickandserve.events  │
            │  Tipo: topic (durable)          │
            └──────────┬──────────────┘
                       │ routing key: match.result.loaded
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            │
  scoring.queue  notifications.queue│
  scoring-worker notification-worker│
          │            │            │
          │  +3 pts    │  Crea      │
          │  correcto  │  notif     │
          │  +2 bonus  │  por user  │
          │  finals    │            │
          │            └────────────┘
          │ publica scores.updated
          ▼
   ranking.queue
   ranking-worker
          │
          │ Recalcula posiciones globales
          ▼
     rankings table
     (EVENT CHAINING: scoring → ranking)


Segundo tipo de evento (scheduler + admin manual):

  POST /admin/rounds/{id}/close  ─┐
  Scheduler (cada 60s)            ├──► round.closed ──► notifications.round.queue
                                  │                      notification-worker
                                  └──► Round cerrada en DB
```

### Colas y bindings

| Cola | Routing key | Worker |
|---|---|---|
| `scoring.queue` | `match.result.loaded` | scoring-worker |
| `notifications.queue` | `match.result.loaded` | notification-worker |
| `notifications.round.queue` | `round.closed` | notification-worker |
| `ranking.queue` | `scores.updated` | ranking-worker |

---

## Requisitos previos

Antes de empezar, asegurate de tener instalado:

- **Docker Desktop** (incluye Docker Compose) — https://www.docker.com/products/docker-desktop/
  - Mac/Windows: instalar Docker Desktop
  - Linux: instalar Docker Engine + Docker Compose plugin

Para verificar que funciona:
```bash
docker --version          # Docker version 24.x o superior
docker compose version    # Docker Compose version v2.x o superior
```

> ⚠️ **No se necesita** Python, Node.js, ni ninguna otra dependencia local. Todo corre dentro de Docker.

---

## Configuración local paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/matiasmutz/pick-serve.git
cd pick-serve
```

### 2. (Opcional) Verificar que Docker esté corriendo

```bash
docker info
```
Si ves información del daemon, Docker está activo. Si da error, abrí Docker Desktop primero.

### 3. Levantar todos los servicios

```bash
docker compose up --build
```

Este comando:
- Construye las imágenes de backend, workers y frontend (puede tardar 2-3 minutos la primera vez)
- Levanta PostgreSQL y RabbitMQ
- Espera a que la DB y el broker estén listos (healthchecks automáticos)
- Corre el backend con FastAPI
- Inicia los 4 workers (scoring, notification, ranking, scheduler)
- Levanta el frontend con nginx

> La primera ejecución descarga las imágenes base (~800MB). Las siguientes son instantáneas gracias al cache de Docker.

### 4. Esperar que todo esté listo

Vas a ver logs de todos los servicios mezclados. Esperar hasta ver algo similar a:

```
backend-1            | INFO:     Application startup complete.
backend-1            | INFO:seed:✅ Seed complete!
scoring-worker-1     | ✅ Connected to PostgreSQL
scoring-worker-1     | ✅ Connected to RabbitMQ
scoring-worker-1     | 👂 Listening on 'scoring.queue' → 'match.result.loaded'
notification-worker-1| 👂 Listening on 'notifications.queue' → 'match.result.loaded'
ranking-worker-1     | 👂 Listening on 'ranking.queue' → 'scores.updated'
scheduler-1          | 🕐 Checking for overdue rounds every 60s
```

Eso significa que todo está listo.

### 5. Acceder a los servicios

| Servicio | URL | Descripción |
|---|---|---|
| **Frontend** | http://localhost:3000 | App web principal |
| **API (docs interactivos)** | http://localhost:8000/docs | Swagger UI de FastAPI |
| **RabbitMQ Management** | http://localhost:15672 | UI de RabbitMQ (guest/guest) |

### 6. Abrir en el navegador

- Ir a **http://localhost:3000**
- Vas a ver la pantalla de login con los 10 usuarios del seed

### 7. Para detener todo

```bash
# Ctrl+C en la terminal donde corre docker compose, luego:
docker compose down

# Para también borrar la base de datos y empezar desde cero:
docker compose down -v
```

### Solución de problemas comunes

**Puerto ya en uso:**
```bash
# Ver qué proceso usa el puerto
lsof -i :3000  # o :8000 o :15672

# Cambiar el puerto en docker-compose.yml si es necesario
# Ejemplo: "3001:80" en vez de "3000:80"
```

**Workers no conectan a RabbitMQ:**
Los workers tienen retry automático. Si RabbitMQ tarda, los workers intentan reconectar cada 5 segundos hasta 15 veces. Si persiste el problema:
```bash
docker compose restart scoring-worker notification-worker ranking-worker
```

**Base de datos con datos viejos:**
```bash
docker compose down -v  # borra volúmenes
docker compose up --build
```

**Ver logs de un servicio específico:**
```bash
docker compose logs -f backend
docker compose logs -f scoring-worker
docker compose logs -f notification-worker
docker compose logs -f ranking-worker
```

---

## Datos de prueba

El seed se ejecuta automáticamente al iniciar el backend. Crea:

### Usuarios

| Nombre | Email | Rol |
|---|---|---|
| Admin | admin@pickserve.com | 👑 Administrador |
| Martín García | martin@example.com | Jugador |
| Sofía López | sofia@example.com | Jugador |
| Agustín Pérez | agustin@example.com | Jugador |
| Valentina Torres | valentina@example.com | Jugador |
| Tomás Rodríguez | tomas@example.com | Jugador |
| Camila Fernández | camila@example.com | Jugador |
| Nicolás Martínez | nicolas@example.com | Jugador |
| Lucía Sánchez | lucia@example.com | Jugador |
| Federico Álvarez | federico@example.com | Jugador |

### Torneos y jornadas

| Torneo | Jornada | Estado |
|---|---|---|
| ATP 500 - Buenos Aires | Cuartos de Final | 🟢 Abierta |
| ATP 500 - Buenos Aires | Semifinal | 🟢 Abierta |
| ATP 250 - Córdoba | Cuartos de Final | 🟢 Abierta |
| ATP 250 - Córdoba | Final | 🟢 Abierta |

### Partidos

| # | Partido | Jornada | Bonus |
|---|---|---|---|
| 1 | Carlos Alcaraz 🇪🇸 vs Daniil Medvedev 🇷🇺 | QF Buenos Aires | — |
| 2 | Novak Djokovic 🇷🇸 vs Alexander Zverev 🇩🇪 | QF Buenos Aires | — |
| 3 | Jannik Sinner 🇮🇹 vs Andrey Rublev 🇷🇺 | QF Buenos Aires | — |
| 4 | Stefanos Tsitsipas 🇬🇷 vs Taylor Fritz 🇺🇸 | SF Buenos Aires | — |
| 5 | Tommy Paul 🇺🇸 vs Casper Ruud 🇳🇴 | QF Córdoba | — |
| 6 | Carlos Alcaraz 🇪🇸 vs Novak Djokovic 🇷🇸 | **Final** Córdoba | **+2 bonus** |

### Pronósticos pre-cargados

Los 9 jugadores ya tienen pronósticos cargados en los partidos 1, 2, 3, 5 y 6. Distribución variada para que el ranking se mueva visiblemente al cargar resultados.

### Resultados esperados si ganó Alcaraz en el Partido 1:
- 6 usuarios acertaron (predijeron `player_a`) → +3 puntos cada uno
- 3 usuarios fallaron → 0 puntos
- El ranking se reorganiza visiblemente

---

## Guión de demo

### Paso 1 — Preparar las ventanas

Abrir **3 ventanas/tabs** del navegador:
1. **App:** http://localhost:3000
2. **RabbitMQ UI:** http://localhost:15672 (guest/guest)
3. **Terminal con logs:**
   ```bash
   docker compose logs -f scoring-worker notification-worker ranking-worker scheduler
   ```

### Paso 2 — Explorar RabbitMQ antes de disparar eventos

En RabbitMQ UI:
- **Exchanges** → ver `pickandserve.events` (topic, durable)
- **Queues** → ver las 4 colas: `scoring.queue`, `notifications.queue`, `notifications.round.queue`, `ranking.queue`
- Todas deben mostrar `0` mensajes en Ready y 1 consumer activo cada una

### Paso 3 — Login como jugador

1. Ir a http://localhost:3000
2. Seleccionar **Martín García**
3. Ver la pestaña "Jornada" → partidos del seed con sus pronósticos pre-cargados
4. Ir a "Ranking" → todos en 0 puntos (aún no hay resultados)
5. Ir a "Alertas" → vacío

### Paso 4 — Login como admin (en otra tab o incógnito)

1. En otra ventana del navegador, ir a http://localhost:3000
2. Seleccionar **Admin**
3. Ver la lista de partidos con botones para cargar resultado

### Paso 5 — Disparar el evento PUB/SUB ⚡

**En la vista Admin:**
- Partido: **Carlos Alcaraz vs Daniil Medvedev**
- Click en **"← Ganó este"** (para que gane Alcaraz)

**Observar en la terminal de logs (en tiempo real):**
```
scoring-worker      | 📥 Received match.result.loaded | match_id=1 winner=player_a
scoring-worker      | 📊 Found 9 predictions for match 1
scoring-worker      | ✅ user_id=2 predicted=player_a winner=player_a → 3 pts
scoring-worker      | ✅ user_id=3 predicted=player_a winner=player_a → 3 pts
...
scoring-worker      | 📤 Published [scores.updated]: {...}   ← EVENT CHAINING!

notification-worker | 📥 match.result.loaded | match_id=1
notification-worker | 🔔 Notification for user_id=2: ✅ ¡Acertaste!...
notification-worker | 🔔 Notification for user_id=3: ❌ No acertaste...
...

ranking-worker      | 📥 scores.updated | match_id=1  ← viene del scoring-worker
ranking-worker      | 🏆 #1 user_id=2 → 3 pts
ranking-worker      | 🏆 #2 user_id=3 → 3 pts
...
ranking-worker      | ✅ Ranking updated for 9 users
```

**Los 3 workers procesaron el evento en paralelo.** El ranking-worker procesó un evento diferente (`scores.updated`) disparado por el scoring-worker.

### Paso 6 — Verificar en RabbitMQ UI

En **Queues**:
- Ver el contador de mensajes entregados (Delivered / acked)
- Cada cola debe mostrar `message_stats.deliver_get`

En **Exchanges** → `pickandserve.events`:
- Ver estadísticas de publicación

### Paso 7 — Verificar en la App (jugador)

1. Volver a la ventana del jugador (Martín García)
2. **Pestaña "Ranking"** → auto-refresca cada 5 segundos → ver posición con puntos
3. **Pestaña "Alertas"** → click en refrescar → ver notificación de acierto/fallo
4. **Pestaña "Stats"** → ver puntos totales, aciertos, precisión

### Paso 8 — Cargar más resultados

Volver al admin y cargar el resultado del **Partido 6 (Final: Alcaraz vs Djokovic)**:
- Es una **FINAL** → los que aciertan reciben **+5 puntos** (3 + 2 bonus)
- El ranking cambia más notoriamente

Luego cargar partidos 2 y 3 para ver el ranking final completo.

### Paso 9 — Demostrar cierre de jornada

En la vista Admin:
- Click en **"🔒 Cerrar"** en la jornada de Cuartos de Final - Buenos Aires
- En los logs: `notification-worker | 📥 round.closed`
- Todos los jugadores reciben notificación de cierre
- Los jugadores ya no pueden cargar pronósticos en esa jornada

---

## Tests

Los tests corren con SQLite en memoria — no necesitan Docker ni servicios externos.

### Correr los tests localmente

```bash
# Instalar dependencias (recomendado en un virtual env)
python -m venv venv
source venv/bin/activate          # Linux/Mac
# venv\Scripts\activate           # Windows

pip install -r backend/requirements.txt
pip install pytest pytest-asyncio httpx

# Correr tests
cd backend
pytest tests/ -v
```

Salida esperada:
```
tests/test_admin.py::test_load_result_publishes_event PASSED
tests/test_admin.py::test_load_result_marks_match_finished PASSED
tests/test_admin.py::test_cannot_load_result_twice PASSED
tests/test_admin.py::test_invalid_winner_rejected PASSED
tests/test_admin.py::test_close_round_publishes_event PASSED
tests/test_admin.py::test_close_round_twice_rejected PASSED
tests/test_admin.py::test_prediction_blocked_on_closed_round PASSED
tests/test_auth.py ...
tests/test_predictions.py ...
tests/test_ranking.py ...
tests/test_rounds.py ...
25 passed in 2.4s
```

### Qué cubren los tests

| Módulo | Tests |
|---|---|
| `test_auth.py` | Listar usuarios, login, usuario admin |
| `test_rounds.py` | Jornadas abiertas, partidos, partido final |
| `test_predictions.py` | Crear, upsert, validaciones, pronósticos propios |
| `test_admin.py` | Cargar resultado, publicación de evento, validaciones, cierre de jornada |
| `test_ranking.py` | Ranking vacío, ranking post-seed, notificaciones |

---

## GitHub Actions

El proyecto tiene 3 workflows:

### `ci.yml` — Corre en cada push/PR

| Job | Qué hace |
|---|---|
| `frontend` | TypeScript type-check + `npm run build` |
| `backend-syntax` | `py_compile` de todos los módulos |
| `workers-syntax` | `py_compile` de todos los workers |
| `backend-tests` | 25 tests con pytest + SQLite (sin Docker) |

### `docker-build.yml` — Corre en push a main/PR

| Job | Qué hace |
|---|---|
| `build-backend` | `docker build` del backend con cache |
| `build-workers` | `docker build` de los workers con cache |
| `build-frontend` | `docker build` multi-stage del frontend |
| `compose-validate` | `docker compose config --quiet` |

### `integration.yml` — Corre en push a main / dispatch manual

Tests de integración con PostgreSQL y RabbitMQ reales como GitHub Services.

---

## Endpoints API

Documentación interactiva completa: **http://localhost:8000/docs**

```
GET  /health                         → Health check

GET  /auth/users                     → Lista usuarios (para login)
POST /auth/login                     → Login mock { user_id }

GET  /rounds/open                    → Jornadas abiertas con partidos
POST /predictions                    → Cargar pronóstico { user_id, match_id, predicted_winner }
GET  /predictions/me?user_id=X       → Mis pronósticos

GET  /ranking                        → Ranking global

GET  /notifications/me?user_id=X     → Mis notificaciones
PUT  /notifications/{id}/read        → Marcar como leída

GET  /admin/matches                  → Todos los partidos (admin)
POST /admin/matches/{id}/result      → Cargar resultado ← DISPARA match.result.loaded
POST /admin/rounds/{id}/close        → Cerrar jornada   ← DISPARA round.closed
```

### Reglas de puntuación

| Resultado | Puntos |
|---|---|
| Pronóstico correcto | **+3 pts** |
| Pronóstico incorrecto | 0 pts |
| Bonus partido con `is_final=true` | **+2 pts adicionales** |

---

## Estructura del proyecto

```
Pick-Serve/
├── .github/
│   └── workflows/
│       ├── ci.yml              # TypeScript + Python syntax + pytest
│       ├── docker-build.yml    # Verifica que las imágenes buildeen
│       └── integration.yml     # Tests con Postgres y RabbitMQ reales
├── docker-compose.yml          # Orquesta todos los servicios
├── .gitignore
├── README.md
│
├── backend/                    # FastAPI API
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                 # App + lifespan (seed en startup)
│   ├── database.py             # SQLAlchemy engine con retry + env var
│   ├── models.py               # Modelos ORM
│   ├── schemas.py              # Schemas Pydantic
│   ├── seed.py                 # Datos de prueba (idempotente)
│   ├── events/
│   │   └── publisher.py        # Publicador async de eventos via aio-pika
│   ├── routers/
│   │   ├── auth.py
│   │   ├── rounds.py
│   │   ├── predictions.py
│   │   ├── admin.py            # ← POST result publica match.result.loaded
│   │   ├── ranking.py
│   │   └── notifications.py
│   └── tests/
│       ├── conftest.py         # SQLite + mocks de publisher
│       ├── test_auth.py
│       ├── test_rounds.py
│       ├── test_predictions.py
│       ├── test_admin.py       # Verifica publicación de eventos
│       └── test_ranking.py
│
├── workers/                    # Workers independientes
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── base.py                 # Helpers compartidos (DB + RabbitMQ)
│   ├── models.py               # Espejo de modelos para workers
│   ├── scoring_worker.py       # Consume match.result.loaded → calcula puntos
│   ├── notification_worker.py  # Consume match.result.loaded + round.closed
│   ├── ranking_worker.py       # Consume scores.updated → recalcula ranking
│   └── scheduler.py            # Cierra jornadas vencidas automáticamente
│
└── frontend/                   # React + Vite + TypeScript
    ├── Dockerfile              # Multi-stage: build Vite → serve nginx
    ├── nginx.conf              # Proxy /api → backend
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── App.tsx             # Router, auth state, layout
        ├── api.ts              # Todas las llamadas HTTP
        ├── types.ts            # Tipos TypeScript
        ├── index.css           # Diseño tennis-themed (cancha oscura + glassmorphism)
        ├── components/
        │   ├── TennisBg.tsx    # Pelotas decorativas CSS (sin imágenes)
        │   └── Toast.tsx       # Notificaciones toast
        └── pages/
            ├── Login.tsx       # Selección de usuario
            ├── Player/
            │   ├── Dashboard.tsx
            │   ├── Predictions.tsx
            │   ├── Ranking.tsx   # Auto-refresh cada 5s
            │   ├── Notifications.tsx
            │   └── Stats.tsx
            └── Admin/
                └── Dashboard.tsx # Cargar resultados, cerrar jornadas
```

---

## Deploy en Railway

### Opción A: Docker Compose en Railway (más simple)

Railway soporta `docker-compose.yml` directamente desde un repositorio.

1. Crear cuenta en https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. Seleccionar este repositorio
4. Railway detecta el `docker-compose.yml` automáticamente
5. Agregar los addons de Railway:
   - **PostgreSQL** (Railway Plugin) → reemplaza el servicio postgres del compose
   - Para RabbitMQ usar **CloudAMQP** (plan gratuito: https://www.cloudamqp.com)

### Opción B: Servicios separados (más control)

Crear un servicio por componente en Railway:

```
Proyecto Railway
├── postgres     ← Railway PostgreSQL Plugin
├── backend      ← Docker build: ./backend
├── scoring      ← Docker build: ./workers, Start: python scoring_worker.py
├── notification ← Docker build: ./workers, Start: python notification_worker.py
├── ranking      ← Docker build: ./workers, Start: python ranking_worker.py
├── scheduler    ← Docker build: ./workers, Start: python scheduler.py
└── frontend     ← Docker build: ./frontend
```

### Variables de entorno para Railway

**Backend, workers y scheduler:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/pickserve
RABBITMQ_URL=amqp://user:pass@host.cloudamqp.com/vhost
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@pickserve.com
```

**Frontend** (build-time + runtime):
```env
# Build arg / variable al deployar el frontend:
VITE_API_URL=https://tu-backend.up.railway.app

# No setear BACKEND_PROXY_URL en Railway (solo aplica en docker-compose local).
```

> El frontend en Railway es un servicio **separado**: no existe el hostname `backend` de Docker. La app llama al backend por su URL pública (`VITE_API_URL`). Railway ya provee HTTPS en el edge — no hace falta puerto 3443 ni certificado local.

> Las variables se configuran en Railway → Service → Variables

---

*PoC — Ingeniería de Software II · Pick & Serve*
