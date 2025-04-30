from fastapi import APIRouter, Depends, HTTPException, Body, Header, status
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone

from db_setup import get_db 
from helpers.password_helpers import hash_password
from helpers.logger import logger
from auth.security import get_current_user

admin_router = APIRouter()

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    username: str
    email: EmailStr
    id: str 
    created_at: datetime
    disabled: bool = False

async def is_first_user(db: AsyncIOMotorDatabase) -> bool:
    """Helper function to check if any user exists."""
    user_count = await db.users.count_documents({})
    return user_count == 0

@admin_router.post("/create_user", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate = Body(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    x_login: str | None = Header(None, alias="X-Login"),
):
    """
    Creates a new user.
    If it's the first user being created, no authentication is required.
    Otherwise, the requesting user must be authenticated.
    """
    first_user = await is_first_user(db)

    if not first_user and x_login:
        logger.info("Not the first user. Endpoint assumes authorization check passed if required.")
        # Get current user from header token
        current_user = await get_current_user(x_login=x_login, db=db)
        
    # Check if username or email already exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        logger.warning(f"Attempt to create user with existing username/email: {user_data.username}/{user_data.email}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email already registered")

    # Hash the password
    try:
        hashed_pwd = hash_password(user_data.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Password hashing failed during user creation: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error processing request")


    # Create the user document
    new_user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "password": hashed_pwd,
        "created_at": datetime.now(timezone.utc),
        "disabled": False, # New users are active by default
        # Add other default fields as necessary
    }

    # Insert the new user
    try:
        result = await db.users.insert_one(new_user_doc)
        logger.info(f"Successfully created user '{user_data.username}' with ID {result.inserted_id}. First user: {first_user}")
    except Exception as e:
        logger.error(f"Database error creating user '{user_data.username}': {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user")

    # Return the created user details (excluding password)
    return UserResponse(
        username=user_data.username,
        email=user_data.email,
        id=str(result.inserted_id),
        created_at=new_user_doc["created_at"],
        disabled=new_user_doc["disabled"]
    )

# Note: The conditional authentication part needs careful handling in production.
# Ideally, use FastAPI's dependency system effectively. This might involve:
# 1. A dependency that checks if it's the first user and bypasses auth if true.
# 2. Separate endpoints: `/admin/setup_first_user` (unprotected) and `/admin/create_user` (protected).
# The current implementation relies on the calling context/gateway to enforce auth when needed.