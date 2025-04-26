import os
class Config:
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "secure_ui"
    APP_HOST: str = "localhost"
    APP_PORT: int = 8000
    SECRET_KEY: str = os.getenv("SECRET_KEY", "YOUR_VERY_SECRET_KEY_HERE")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 