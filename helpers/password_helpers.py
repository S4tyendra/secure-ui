from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from helpers.logger import logger

ph = PasswordHasher()

def hash_password(password: str) -> str:
    """
    Hash a password using Argon2.
    """
    if not password:
        raise ValueError("Password cannot be empty")
    try:
        hashed = ph.hash(password)
        return hashed
    except Exception as e:
        logger.error(f"Error hashing password: {e}")
        raise

def check_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check a plain password against an Argon2 hashed password.
    Returns True if the password matches, False otherwise.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        ph.verify(hashed_password, plain_password)
        if ph.check_needs_rehash(hashed_password):
             logger.info(f"Password hash for user needs rehashing.")
        return True
    except VerifyMismatchError:
        return False
    except Exception as e:
        logger.error(f"Error verifying password: {e}")
        return False
