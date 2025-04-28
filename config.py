import os
class Config:
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "secure_ui"
    APP_HOST: str = "localhost"
    APP_PORT: int = 8000
    SESSION_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    ALLOWED_ORIGINS: list[str] = []