import os
import shutil
from pathlib import Path
from typing import List, Dict, Optional, Tuple

from config import Config
from helpers.logger import logger
from .models import SiteInfo, LogInfo


class NginxManagementError(Exception):
    """Custom exception for Nginx management operations."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


def _get_site_path(site_name: str, enabled: bool = False) -> Path:
    """Gets the Path object for a site file."""
    base_dir = Path(Config.NGINX_SITES_ENABLED if enabled else Config.NGINX_SITES_AVAILABLE)
    site_file = base_dir / site_name
    if site_file.resolve().parent != base_dir.resolve():
         raise NginxManagementError(f"Invalid site name causing path traversal: {site_name}", 400)
    return site_file

def list_sites() -> List[SiteInfo]:
    """Lists all available sites and indicates if they are enabled."""
    available_path = Path(Config.NGINX_SITES_AVAILABLE)
    enabled_path = Path(Config.NGINX_SITES_ENABLED)
    sites = []

    if not available_path.is_dir():
        logger.warning(f"Sites available directory not found: {available_path}")
        return []

    enabled_site_names = {f.name for f in enabled_path.iterdir() if f.is_symlink() or f.is_file()}

    for site_file in available_path.iterdir():
        if site_file.is_file() and not site_file.name.startswith('.'):
            sites.append(SiteInfo(
                name=site_file.name,
                is_enabled=site_file.name in enabled_site_names
            ))
    return sites

def get_site_info(site_name: str) -> SiteInfo:
    """Gets information and content for a single site."""
    available_site_path = _get_site_path(site_name, enabled=False)
    enabled_site_path = _get_site_path(site_name, enabled=True)

    if not available_site_path.is_file():
        raise NginxManagementError(f"Site '{site_name}' not found in available sites.", 404)

    try:
        content = available_site_path.read_text()
        is_enabled = enabled_site_path.exists() 
        return SiteInfo(name=site_name, is_enabled=is_enabled, content=content)
    except OSError as e:
        logger.error(f"Error reading site file {available_site_path}: {e}")
        raise NginxManagementError(f"Could not read site file '{site_name}'. Check permissions.", 500)


def create_site(site_name: str, content: str) -> SiteInfo:
    """Creates a new site file in sites-available."""
    available_site_path = _get_site_path(site_name, enabled=False)
    if available_site_path.exists():
        raise NginxManagementError(f"Site '{site_name}' already exists.", 409) 

    try:
        available_site_path.parent.mkdir(parents=True, exist_ok=True)
        available_site_path.write_text(content)
        logger.info(f"Created Nginx site configuration: {available_site_path}")
        return SiteInfo(name=site_name, is_enabled=False, content=content)
    except OSError as e:
        logger.error(f"Error creating site file {available_site_path}: {e}")
        raise NginxManagementError(f"Could not create site file '{site_name}'. Check permissions.", 500)

def update_site_content(site_name: str, content: str) -> SiteInfo:
    """Updates the content of an existing site file in sites-available."""
    available_site_path = _get_site_path(site_name, enabled=False)
    if not available_site_path.is_file():
        raise NginxManagementError(f"Site '{site_name}' not found in available sites.", 404)

    try:
        available_site_path.write_text(content)
        logger.info(f"Updated Nginx site configuration: {available_site_path}")
        return get_site_info(site_name)
    except OSError as e:
        logger.error(f"Error updating site file {available_site_path}: {e}")
        raise NginxManagementError(f"Could not update site file '{site_name}'. Check permissions.", 500)


def enable_site(site_name: str) -> None:
    """Enables a site by creating a symlink in sites-enabled."""
    available_site_path = _get_site_path(site_name, enabled=False)
    enabled_site_path = _get_site_path(site_name, enabled=True)

    if not available_site_path.is_file():
        raise NginxManagementError(f"Cannot enable site '{site_name}': Not found in available sites.", 404)
    if enabled_site_path.exists():
         logger.warning(f"Site '{site_name}' is already enabled or a file/link with the same name exists.")
         return 

    try:
        enabled_site_path.parent.mkdir(parents=True, exist_ok=True) 
        os.symlink(available_site_path.resolve(), enabled_site_path)
        logger.info(f"Enabled Nginx site: {site_name}")
    except OSError as e:
        logger.error(f"Error creating symlink from {available_site_path} to {enabled_site_path}: {e}")
        raise NginxManagementError(f"Could not enable site '{site_name}'. Check permissions.", 500)

def disable_site(site_name: str) -> None:
    """Disables a site by removing the symlink from sites-enabled."""
    enabled_site_path = _get_site_path(site_name, enabled=True)

    if not enabled_site_path.exists():
         logger.warning(f"Site '{site_name}' is not enabled or does not exist.")
         return

    if not enabled_site_path.is_symlink() and enabled_site_path.is_file():
         logger.warning(f"Path {enabled_site_path} exists but is a regular file, not a symlink. Skipping removal.")
         raise NginxManagementError(f"Cannot disable site '{site_name}': Path exists but is not a symlink.", 400)


    try:
        enabled_site_path.unlink()
        logger.info(f"Disabled Nginx site: {site_name}")
    except OSError as e:
        logger.error(f"Error removing symlink {enabled_site_path}: {e}")
        raise NginxManagementError(f"Could not disable site '{site_name}'. Check permissions.", 500)

def delete_site(site_name: str) -> None:
    """Deletes a site from available and removes the enabled symlink."""
    available_site_path = _get_site_path(site_name, enabled=False)
    enabled_site_path = _get_site_path(site_name, enabled=True)

    site_existed = False
    if available_site_path.is_file():
        try:
            available_site_path.unlink()
            logger.info(f"Deleted site file: {available_site_path}")
            site_existed = True
        except OSError as e:
            logger.error(f"Error deleting site file {available_site_path}: {e}")
            raise NginxManagementError(f"Could not delete site file '{site_name}'. Check permissions.", 500)

    if enabled_site_path.is_symlink():
        try:
            enabled_site_path.unlink()
            logger.info(f"Removed symlink for deleted site: {enabled_site_path}")
            site_existed = True 
        except OSError as e:
            logger.error(f"Error removing symlink {enabled_site_path} during delete: {e}")
            # Don't necessarily fail the whole delete if the available file was removed
            logger.warning(f"Could not remove symlink for '{site_name}', it might need manual removal.")

    # Check if the enabled path was a file, not a link
    if not site_existed and not enabled_site_path.exists(): 
         raise NginxManagementError(f"Site '{site_name}' not found.", 404)



def _get_log_path(log_name: str) -> Path:
    """Gets the Path object for a log file."""
    log_dir = Path(Config.NGINX_LOG_DIR)
    log_file = log_dir / log_name
    if log_file.resolve().parent != log_dir.resolve():
         raise NginxManagementError(f"Invalid log name causing path traversal: {log_name}", 400)
    return log_file


def list_logs() -> List[LogInfo]:
    """Lists Nginx log files."""
    log_dir = Path(Config.NGINX_LOG_DIR)
    logs = []
    if not log_dir.is_dir():
        logger.warning(f"Nginx log directory not found: {log_dir}")
        return []

    try:
        for log_file in log_dir.iterdir():
            if log_file.is_file() and not log_file.name.startswith('.'):
                stats = log_file.stat()
                logs.append(LogInfo(
                    name=log_file.name,
                    size_bytes=stats.st_size,
                    last_modified=stats.st_mtime
                ))
        return logs
    except OSError as e:
        logger.error(f"Error listing log directory {log_dir}: {e}")
        raise NginxManagementError("Could not list log files. Check permissions.", 500)


def get_log_content(log_name: str, tail_lines: Optional[int] = 100) -> str:
    """Reads the end of a log file."""
    log_file_path = _get_log_path(log_name)
    if not log_file_path.is_file():
        raise NginxManagementError(f"Log file '{log_name}' not found.", 404)

    try:
        with open(log_file_path, 'r', encoding='utf-8', errors='ignore') as f:
            if tail_lines is None or tail_lines <= 0:
                return f.read()
            else:
                # More efficient way to read last N lines might be needed for large files
                # This is a simple approach
                lines = f.readlines()
                return "".join(lines[-tail_lines:])
    except OSError as e:
        logger.error(f"Error reading log file {log_file_path}: {e}")
        raise NginxManagementError(f"Could not read log file '{log_name}'. Check permissions.", 500)

def delete_log(log_name: str) -> None:
    """Deletes a log file."""
    log_file_path = _get_log_path(log_name)
    if not log_file_path.is_file():
        raise NginxManagementError(f"Log file '{log_name}' not found.", 404)

    try:
        log_file_path.unlink()
        logger.info(f"Deleted log file: {log_file_path}")
    except OSError as e:
        logger.error(f"Error deleting log file {log_file_path}: {e}")
        raise NginxManagementError(f"Could not delete log file '{log_name}'. Check permissions.", 500)


def get_nginx_conf() -> str:
    """Reads the main Nginx configuration file."""
    conf_path = Path(Config.NGINX_CONF_FILE)
    if not conf_path.is_file():
        raise NginxManagementError(f"Nginx config file not found: {conf_path}", 404)

    try:
        return conf_path.read_text()
    except OSError as e:
        logger.error(f"Error reading Nginx config file {conf_path}: {e}")
        raise NginxManagementError("Could not read Nginx config file. Check permissions.", 500)

def update_nginx_conf(content: str) -> None:
    """Writes content to the main Nginx configuration file."""
    conf_path = Path(Config.NGINX_CONF_FILE)
    backup_path = conf_path.with_suffix(conf_path.suffix + '.bak')

    if not conf_path.is_file():
         raise NginxManagementError(f"Nginx config file not found, cannot update: {conf_path}", 404)

    try:
        # Create a backup
        shutil.copy2(conf_path, backup_path)
        logger.info(f"Created backup of Nginx config: {backup_path}")

        conf_path.write_text(content)
        logger.info(f"Updated Nginx config file: {conf_path}")
        # trigger an Nginx config test and reload,
        # logger.warning("Nginx config updated, but reload/test was not triggered.")

    except OSError as e:
        logger.error(f"Error writing Nginx config file {conf_path}: {e}")
        if backup_path.exists():
             try:
                 shutil.move(backup_path, conf_path)
                 logger.info(f"Restored Nginx config from backup due to write error.")
             except OSError as restore_e:
                 logger.error(f"CRITICAL: Failed to restore Nginx config backup after write error: {restore_e}")
        raise NginxManagementError("Could not write Nginx config file. Check permissions.", 500)
    except Exception as e:
        logger.error(f"Unexpected error updating Nginx config: {e}")
        raise NginxManagementError(f"An unexpected error occurred: {e}", 500)