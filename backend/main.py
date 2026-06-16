import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base
from routers import auth, rounds, predictions, admin, ranking, notifications, push
from seed import seed

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed()
    yield


app = FastAPI(title="Pick & Serve API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(rounds.router)
app.include_router(predictions.router)
app.include_router(admin.router)
app.include_router(ranking.router)
app.include_router(notifications.router)
app.include_router(push.router)


@app.get("/health")
def health():
    return {"status": "ok"}
