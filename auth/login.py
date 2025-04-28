from fastapi import APIRouter, HTTPException, Body, Depends, Response
from pydantic import BaseModel, Field, EmailStr # Import Field and EmailStr here
from helpers.password_helpers import check_password
from helpers.logger import logger
import secrets
from datetime import datetime, timedelta, timezone # Import datetime here
from config import Config
from motor.motor_asyncio import AsyncIOMotorDatabase
from db_setup import get_db # Import from db_setup
from auth.security import get_current_user

auth_router = APIRouter()

# --- Request Models ---
class UserLogin(BaseModel):
    username: str
    password: str

# --- Response Models ---
class LoginResponse(BaseModel):
    token: str
    username: str

class UserProfileResponse(BaseModel):
    id: str = Field(..., alias="_id")
    username: str
    email: EmailStr
    created_at: datetime
    disabled: bool

    class Config:
        populate_by_name = True


# --- Endpoints ---
@auth_router.post("/login", response_model=LoginResponse)
async def login(
    response: Response,
    user_credentials: UserLogin = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Authenticate user, create a session token, store it, and return it
    in the response body and X-Login header.
    """
    user_in_db = await db.users.find_one({"username": user_credentials.username})

    if not user_in_db:
        logger.warning(f"Login attempt failed for non-existent user: {user_credentials.username}")
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    hashed_password = user_in_db.get("password")
    if not hashed_password or not check_password(user_credentials.password, hashed_password):
        logger.warning(f"Login attempt failed for user: {user_credentials.username} (incorrect password)")
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    if user_in_db.get("disabled"):
         logger.warning(f"Login attempt failed for disabled user: {user_credentials.username}")
         raise HTTPException(status_code=400, detail="Inactive user")

    logger.info(f"User '{user_credentials.username}' successfully authenticated.")

    session_token = secrets.token_urlsafe(32)
    expires_delta = timedelta(minutes=Config.SESSION_TOKEN_EXPIRE_MINUTES)
    expires_at = datetime.now(timezone.utc) + expires_delta
    user_id = str(user_in_db["_id"])

    session_data = {
        "token": session_token,
        "user_id": user_id,
        "username": user_in_db["username"],
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
    }
    try:
        await db.login_sessions.insert_one(session_data)
        logger.info(f"Created session token for user: {user_credentials.username}")
    except Exception as e:
        logger.error(f"Failed to insert session token for user {user_credentials.username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to create login session")

    response.headers["X-Login"] = session_token
    return LoginResponse(token=session_token, username=user_in_db["username"])

@auth_router.get("/users/me", response_model=UserProfileResponse) # Apply the correct response model
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """
    Fetch the current logged-in user's details using the session token.
    Requires authentication via X-Login header.
    Returns a subset of the user's details (excluding sensitive information).
    """
    return current_user

@auth_router.get("/firsttime", response_model=bool)
async def is_first_time_setup(db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Checks if any users exist in the database.
    Returns True if no users exist, False otherwise.
    """
    user_count = await db.users.count_documents({})
    is_first = user_count == 0
    logger.info(f"First time setup check: {'Yes' if is_first else 'No'} ({user_count} users found).")
    return is_first
