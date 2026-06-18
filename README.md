# 🎾 Pick & Serve

**Plataforma de pronósticos de tenis ATP con arquitectura PUB/SUB en RabbitMQ**

*Trabajo Práctico Integrador Final — Ingeniería de Software II · Primer Cuatrimestre 2026*

**Instituto Tecnológico de Buenos Aires** · Ingeniería Informática

| | |
|---|---|
| **Integrantes** | Lucila Borinsky (Leg. 63039) · Matías Ignacio Mutz (Leg. 63590) |
| **Profesor** | Emilio Esteban Rasic |
| **Entrega** | 18 de junio de 2026 |
| **Presentación y Defensa** | 25 de junio de 2026 |

---

## Índice

1. [Descripción](#descripción)
2. [Arquitectura de Eventos](#arquitectura-de-eventos)
3. [Requisitos previos](#requisitos-previos)
4. [Configuración local paso a paso](#configuración-local-paso-a-paso)
5. [Datos de prueba](#datos-de-prueba)
6. [Guión de demo](#guión-de-demo)

---

## Descripción

Pick & Serve digitaliza una liga privada de pronósticos de tenis. Los usuarios pronostican ganadores de partidos ATP; cuando un administrador carga el resultado, el sistema recalcula puntajes, actualiza el ranking y genera notificaciones — todo de forma automática y desacoplada a través de RabbitMQ.

El eje técnico es la **arquitectura orientada a eventos**: un solo evento dispara tres workers independientes en paralelo (fan-out), y uno de ellos encadena un segundo evento (event chaining).

---

## Arquitectura de Eventos

```
                 FLUJO PRINCIPAL · match.result.loaded
                 =====================================

      ┌────────────────────────────────────────────────┐
      │ POST /admin/matches/{id}/result                │
      │ Admin carga resultado de un partido            │
      └───────────────────────┬────────────────────────┘
                              │ publica
                              ▼
      ┌────────────────────────────────────────────────┐
      │ Exchange: pickandserve.events                  │
      │ topic · durable                                │
      └───────────────────────┬────────────────────────┘
                              │
               routing key: match.result.loaded
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
 ┌─────────────────────────┐     ┌─────────────────────────┐
 │     scoring.queue       │     │  notifications.queue    │
 └────────────┬────────────┘     └────────────┬────────────┘
              │                               │
              ▼                               ▼
 ┌─────────────────────────┐     ┌─────────────────────────┐
 │     scoring-worker      │     │  notification-worker    │
 │  +3 pts si acierto      │     │  notif. por usuario     │
 │  +2 bonus en final      │     └─────────────────────────┘
 └────────────┬────────────┘
              │
              │ publica scores.updated  ◄── EVENT CHAINING
              ▼
 ┌─────────────────────────┐
 │     ranking.queue       │
 └────────────┬────────────┘
              ▼
 ┌─────────────────────────┐
 │     ranking-worker      │
 │  recalcula posiciones   │
 └────────────┬────────────┘
              ▼
 ┌─────────────────────────┐
 │     tabla rankings      │
 └─────────────────────────┘


                 FLUJO SECUNDARIO · round.closed
                 =================================

 POST /admin/rounds/{id}/close ──┐
                                 ├──► round.closed ──► notifications.round.queue
 Scheduler (poll cada 60s) ──────┘                              │
                                                                ▼
                                                  notification-worker
                                                  (notifica cierre global)
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
git clone https://github.com/MatiasMutz/Pick-Serve.git
cd Pick-Serve
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

**Puerto ya en uso:** cerrá otros servicios que usen los puertos 3000, 8000 o 15672, o reiniciá Docker Desktop.

**Workers no conectan a RabbitMQ:**
Los workers tienen retry automático. Si persiste el problema:
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

Solo la **primera jornada de cada torneo** arranca abierta. Las siguientes quedan `pending` hasta que el admin carga todos los resultados de la ronda anterior (progresión automática).

| Torneo | Jornada | Estado inicial |
|---|---|---|
| ATP 500 - Buenos Aires | Octavos de Final | 🟢 Abierta |
| ATP 500 - Buenos Aires | Cuartos de Final | ⏳ Pending |
| ATP 250 - Córdoba | Octavos de Final | 🟢 Abierta |
| ATP 250 - Córdoba | Final | ⏳ Pending |

### Partidos

| # | Partido | Jornada | Visible al inicio | Bonus |
|---|---|---|---|---|
| 1 | Carlos Alcaraz 🇪🇸 vs Daniil Medvedev 🇷🇺 | Octavos BA | ✅ Sí | — |
| 2 | Novak Djokovic 🇷🇸 vs Alexander Zverev 🇩🇪 | Octavos BA | ✅ Sí | — |
| 3 | Jannik Sinner 🇮🇹 vs Andrey Rublev 🇷🇺 | Octavos BA | ✅ Sí | — |
| 4 | Stefanos Tsitsipas 🇬🇷 vs Taylor Fritz 🇺🇸 | Cuartos BA | ❌ Pending | — |
| 5 | Tommy Paul 🇺🇸 vs Casper Ruud 🇳🇴 | Octavos Córdoba | ✅ Sí | — |
| 6 | Carlos Alcaraz 🇪🇸 vs Novak Djokovic 🇷🇸 | Final Córdoba | ❌ Pending | **+2 bonus** |

### Pronósticos pre-cargados

Los 9 jugadores ya tienen pronósticos cargados en los partidos **1, 2, 3 y 5** (jornadas abiertas al inicio). Distribución variada para que el ranking se mueva visiblemente al cargar resultados.

### Reset de demo

Si no quedan jornadas abiertas, el admin puede crear un torneo nuevo desde el panel con el botón **Resetear demo**. Agrega un ATP Masters 1000 - Madrid con 3 jornadas y 6 partidos.

### Reglas de puntuación

| Resultado | Puntos |
|---|---|
| Pronóstico correcto | **+3 pts** |
| Pronóstico incorrecto | 0 pts |
| Bonus partido con `is_final=true` | **+2 pts adicionales** |

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
3. Ver la pestaña **Dashboard** → partidos de octavos con pronósticos pre-cargados
4. Ir a **Rankings** → todos en 0 puntos (aún no hay resultados)
5. Ir a **Alertas** → vacío

### Paso 4 — Login como admin (en otra tab o incógnito)

1. En otra ventana del navegador, ir a http://localhost:3000
2. Seleccionar **Admin**
3. Ver las jornadas abiertas (Octavos BA y Octavos Córdoba) con botones **Ganó {jugador}**

### Paso 5 — Disparar el evento PUB/SUB ⚡

**En la vista Admin:**
- Partido: **Carlos Alcaraz vs Daniil Medvedev** (Partido #1)
- Click en **Ganó Carlos Alcaraz 🇪🇸**

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
2. **Rankings** → auto-refresca cada 5 segundos → ver posición con puntos
3. **Alertas** → ver notificación de acierto/fallo
4. **Stats** → ver puntos totales, aciertos, precisión

### Paso 8 — Cargar más resultados y progresión de jornadas

Volver al admin y cargar resultados en este orden:

1. **Partidos 2 y 3** (Octavos BA) → al completar los 3 octavos, se abre automáticamente **Cuartos BA** con el Partido 4
2. **Partido 4** (Tsitsipas vs Fritz)
3. **Partido 5** (Octavos Córdoba) → al completarlo, se abre la **Final Córdoba** con el Partido 6
4. **Partido 6 (Final: Alcaraz vs Djokovic)** → los que aciertan reciben **+5 puntos** (3 + 2 bonus)

### Paso 9 — Demostrar cierre de jornada

En la vista Admin (con alguna jornada aún abierta):
- Click en **Cerrar Jornada** en **Octavos de Final - Buenos Aires** (o la jornada que siga abierta)
- En los logs: `notification-worker | 📥 round.closed`
- Todos los jugadores reciben notificación de cierre
- Los jugadores ya no pueden cargar pronósticos en esa jornada

### Paso 10 — Resetear la demo (opcional)

Si cerraste todas las jornadas y querés volver a empezar:
- En el panel Admin, click en **Resetear demo**

---

*Ingeniería de Software II · ITBA · 2026*
