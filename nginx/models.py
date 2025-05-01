from pydantic import BaseModel, Field
from typing import List, Optional

class SiteInfo(BaseModel):
    name: str
    is_enabled: bool
    content: Optional[str] = None # Optionally include content on GET single site

class SiteCreate(BaseModel):
    name: str = Field(..., pattern=r"^[a-zA-Z0-9._-]+$", description="Site name (filename in sites-available, no spaces or special chars)")
    content: str

class SiteUpdate(BaseModel):
    # Used for PUT /api/nginx/sites/{site_name}
    # Can be used to enable/disable or update content
    enable: Optional[bool] = None
    content: Optional[str] = None

class NginxConf(BaseModel):
    content: str

class LogInfo(BaseModel):
    name: str
    size_bytes: int
    last_modified: float # timestamp

class SiteActionStatus(BaseModel):
    success: bool
    message: str
    site_name: str
    action: str # e.g., 'created', 'enabled', 'disabled', 'deleted', 'updated'

class LogActionStatus(BaseModel):
    success: bool
    message: str
    log_name: str
    action: str # e.g., 'deleted'

class ConfActionStatus(BaseModel):
    success: bool
    message: str
    action: str # e.g., 'updated'

class NginxCommandStatus(BaseModel):
    success: bool # Based on return code
    command: str
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    return_code: int
    message: str # User-friendly summary message

class StructuredLogEntry(BaseModel):
    """Pydantic model for a structured log entry."""
    timestamp: str # ISO 8601 string
    date: str      # YYYY-MM-DD string
    ip: str
    method: Optional[str]
    path: Optional[str]
    query: Optional[str]
    protocol: Optional[str]
    status_code: int
    response_size: int
    referer: Optional[str]
    user_agent: Optional[str]
