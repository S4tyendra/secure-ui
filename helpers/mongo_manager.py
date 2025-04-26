import motor.motor_asyncio
from config import Config
from helpers.logger import logger
from typing import Optional

class MongoManager:
    client: Optional[motor.motor_asyncio.AsyncIOMotorClient] = None
    db: Optional[motor.motor_asyncio.AsyncIOMotorDatabase] = None

    def __init__(self, config: Config):
        self.config = config

    async def connect(self):
        if self.client is None:
            logger.info(f"Connecting to MongoDB at {self.config.MONGO_URI}...")
            try:
                self.client = motor.motor_asyncio.AsyncIOMotorClient(self.config.MONGO_URI)
                self.db = self.client[self.config.MONGO_DB_NAME]
                await self.client.admin.command('ping')
                logger.info(f"Successfully connected to MongoDB database '{self.config.MONGO_DB_NAME}'.")
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
                self.client = None
                self.db = None
                raise

    async def disconnect(self):
        if self.client is not None:
            logger.info("Disconnecting from MongoDB...")
            self.client.close()
            self.client = None
            self.db = None
            logger.info("MongoDB connection closed.")

    def get_db(self) -> motor.motor_asyncio.AsyncIOMotorDatabase:
        if self.db is None:
            logger.error("MongoDB database instance is not available. Ensure connect() was called.")
            raise Exception("Database not connected")
        return self.db