import os
class Config:
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "secure_ui"
    APP_HOST: str = "localhost"
    APP_PORT: int = 5423
    SESSION_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    ALLOWED_ORIGINS: list[str] = ["*"]
    NGINX_HOST: str = "localhost"
    NGINX_SITES_AVAILABLE: str = "/etc/nginx/sites-available"
    NGINX_SITES_ENABLED: str = "/etc/nginx/sites-enabled"
    NGINX_LOG_DIR: str = "/var/log/nginx"
    NGINX_CONF_FILE: str = "/etc/nginx/nginx.conf"