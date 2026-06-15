import os
import time
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/pickserve")


def get_engine(retries: int = 10, delay: int = 5):
    for attempt in range(retries):
        try:
            connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
            eng = create_engine(DATABASE_URL, connect_args=connect_args)
            with eng.connect():
                pass
            logger.info("✅ Connected to database")
            return eng
        except Exception as exc:
            logger.warning(f"⏳ Waiting for database... attempt {attempt + 1}/{retries}: {exc}")
            time.sleep(delay if not DATABASE_URL.startswith("sqlite") else 0)
    raise RuntimeError("Could not connect to database after multiple attempts")


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
