import fastapi as f
from contextlib import asynccontextmanager
import os
from fastapi import staticfiles, Depends, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi.middleware.cors import CORSMiddleware
from auth.security import get_current_user 

from db_setup import mongo_manager, get_db, config
from helpers.logger import logger, ic
from auth.login import auth_router
from admin.routes import admin_router
from nginx.routes import nginx_router
import os
from fastapi import HTTPException
from fastapi.staticfiles import StaticFiles

app = f.FastAPI(
    title="Secure UI Backend",
    # lifespan=lifespan #lifespan for cleaner startup/shutdown
)

origins = [
    "http://localhost:5173",
    "http://localhost",
    *config.ALLOWED_ORIGINS,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Login"],
)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the FastAPI application.")
    await mongo_manager.connect()
    db_instance = mongo_manager.get_db()
    try:
        await db_instance.users.create_index("username", unique=True)
        await db_instance.users.create_index("email", unique=True)
        logger.info("Ensured indexes on 'users' collection (username, email).")

        await db_instance.login_sessions.create_index("token", unique=True)
        await db_instance.login_sessions.create_index("expires_at", expireAfterSeconds=1)
        logger.info("Ensured indexes on 'login_sessions' collection (token, expires_at TTL).")

    except Exception as e:
        logger.error(f"Error creating database indexes during startup: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the FastAPI application.")
    await mongo_manager.disconnect()
    logger.info("FastAPI application has been shut down.")



app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(nginx_router, prefix="/api/nginx", tags=["Nginx Management"], dependencies=[Depends(get_current_user)]) # Add Nginx router


static_dir = "dist"

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """
    Serves the index.html for SPA routing, or specific files if they exist.
    Handles requests that weren't matched by API routes or /static mount.
    """
    spa_index = os.path.join(static_dir, "index.html")
    abs_static_dir = os.path.abspath(static_dir)

    # Check if path exists with .html extension for Next.js pages
    if not full_path.endswith(".html") and not full_path.endswith(".svg") and not full_path.endswith(".ico"):
        html_path = os.path.join(abs_static_dir, f"{full_path}.html")
        if os.path.isfile(html_path):
            return f.responses.FileResponse(html_path)
    
    # If this is a specific path request, try to serve it
    abs_requested_path = os.path.abspath(os.path.join(abs_static_dir, full_path))
    if not abs_requested_path.startswith(abs_static_dir):
        logger.warning(f"Directory traversal attempt blocked: {full_path}")
        raise f.HTTPException(status_code=404, detail="Not Found")
    
    if os.path.isfile(abs_requested_path):
        return f.responses.FileResponse(abs_requested_path)
    
    # Fallback to SPA index
    if os.path.exists(spa_index):
        return f.responses.FileResponse(spa_index)
    else:
        logger.error(f"SPA index file '{spa_index}' not found.")
        raise f.HTTPException(status_code=404, detail="SPA index not found")

if os.path.isdir(static_dir):
    app.mount("/_next", staticfiles.StaticFiles(directory=os.path.join(static_dir, "_next")), name="next_assets")
    app.mount("/", staticfiles.StaticFiles(directory=static_dir), name="static_assets")
else:
    logger.error(f"Static files directory '{static_dir}' still not found after check. SPA serving will fail.")

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Uvicorn server on http://{config.APP_HOST}:{config.APP_PORT}")
    uvicorn.run(
        "main:app",
        host=config.APP_HOST,
        port=config.APP_PORT,
        reload=True
    )