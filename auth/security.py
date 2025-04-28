from fastapi import Depends, HTTPException, status, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from bson import ObjectId

from config import Config
from helpers.logger import logger
from db_setup import get_db
from typing import Annotated

async def get_current_user(
    x_login: Annotated[str | None, Header()] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> dict:
    """
    Validates the session token from the X-Login header against the login_sessions collection
    and fetches the corresponding user from the users collection.
    Raises HTTPException for invalid/expired tokens or missing users.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "X-Login"},
    )

    if x_login is None:
        logger.warning("Authentication failed: Missing X-Login header.")
        raise credentials_exception

    session = await db.login_sessions.find_one({"token": x_login})

    if session is None:
        logger.warning(f"Authentication failed: Session token not found in DB.")
        raise credentials_exception

    expires_at_naive = session.get("expires_at")
    if expires_at_naive:
        expires_at_aware = expires_at_naive.replace(tzinfo=timezone.utc)
        if expires_at_aware < datetime.now(timezone.utc):
            logger.warning(f"Authentication failed: Session token expired for user_id {session.get('user_id')}.")
            await db.login_sessions.delete_one({"_id": session["_id"]})
            raise credentials_exception 


    user_id = session.get("user_id")
    if not user_id: 
         logger.error(f"Critical: Session found ({session['_id']}) but user_id is missing.")
         raise credentials_exception
    try:
        user_object_id = ObjectId(user_id)
    except Exception:
        logger.warning(f"Authentication failed: Invalid user_id format '{user_id}' in session.")
        raise credentials_exception

    user = await db.users.find_one({"_id": user_object_id})

    if user is None:
        logger.warning(f"Authentication failed: User with ID '{user_id}' not found in DB (referenced by valid session).")
        raise credentials_exception
    if user.get("disabled"):
        logger.warning(f"Authentication failed: User '{user.get('username')}' (ID: {user_id}) is disabled.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )

    user["_id"] = str(user["_id"])
    logger.debug(f"Successfully validated session token for user: {user.get('username')}")
    return user
