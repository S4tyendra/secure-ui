import fastapi as f
from contextlib import asynccontextmanager
import os
from fastapi import staticfiles
from helpers.mongo_manager import MongoManager
from config import Config
from helpers.logger import logger, ic


app = f.FastAPI()
mongo_manager = MongoManager(config=Config())


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up the FastAPI application.")
    await mongo_manager.connect()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down the FastAPI application.")
    await mongo_manager.disconnect()
    logger.info("FastAPI application has been shut down.")



@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    dir = "dist"
    if full_path and not full_path.startswith("api/"):
        if os.path.exists(os.path.join(dir, full_path)):
            return f.responses.FileResponse(os.path.join(dir, full_path))
    return f.responses.FileResponse(os.path.join(dir, "index.html"))



app.mount("/", staticfiles.StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=Config.APP_HOST, port=Config.APP_PORT, reload=True)
    logger.info(f"Running FastAPI application at http://{Config.APP_HOST}:{Config.APP_PORT}")