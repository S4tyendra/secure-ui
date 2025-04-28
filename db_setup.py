from motor.motor_asyncio import AsyncIOMotorDatabase
import fastapi as f

from helpers.mongo_manager import MongoManager
from config import Config
from helpers.logger import logger

config = Config()
mongo_manager = MongoManager(config=config)

async def get_db() -> AsyncIOMotorDatabase:
    """
    FastAPI dependency function to get the database instance.
    Relies on mongo_manager being connected.
    """
    db = mongo_manager.get_db()
    if db is None:
        logger.error("Database connection not available in get_db dependency. Ensure startup event ran.")
        raise f.HTTPException(status_code=500, detail="Database connection not available")
    return db