import time
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

logger = logging.getLogger(__name__)

DATABASE_URL = "postgresql://postgres:postgres@postgres:5432/pickserve"

def get_engine(retries=10, delay=5):
    for attempt in range(retries):
        try:
            engine = create_engine(DATABASE_URL)
            with engine.connect() as conn:
                pass
            logger.info("✅ Connected to PostgreSQL")
            return engine
        except Exception as e:
            logger.warning(f"⏳ Waiting for PostgreSQL... attempt {attempt+1}/{retries}: {e}")
            time.sleep(delay)
    raise RuntimeError("Could not connect to PostgreSQL after multiple attempts")

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
