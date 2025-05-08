import os
import re
import shutil
import asyncio
import aiofiles
import aiofiles.os as aios
import tempfile
from urllib.parse import urlparse
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta, timezone

from config import Config
from helpers.logger import logger
from .models import SiteInfo, LogInfo, NginxCommandStatus, StructuredLogEntry


class NginxManagementError(Exception):
    """Custom exception for Nginx management operations."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


def _get_site_path(site_name: str, enabled: bool = False) -> Path:
    """Gets the Path object for a site file."""
    if '../' in site_name or '/' in site_name:
        raise NginxManagementError(f"Invalid site name containing path separators: {site_name}", 400)
    base_dir = Path(Config.NGINX_SITES_ENABLED if enabled else Config.NGINX_SITES_AVAILABLE)
    site_file = base_dir / site_name
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
    from icecream import ic
    ic(sites)
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
                lines = f.readlines()
                return "".join(lines[-tail_lines:])
    except OSError as e:
        logger.error(f"Error reading log file {log_file_path}: {e}")
        raise NginxManagementError(f"Could not read log file '{log_name}'. Check permissions.", 500)

async def get_combined_access_logs() -> List[StructuredLogEntry]:
    """
    Asynchronously reads access.log. If the file is larger than 10MB,
    it processes the last 10MB chunk from a temporary file (with the first line of the chunk removed).
    Parses lines and returns up to 1000 most recent structured log entries, sorted by timestamp.
    """
    log_dir = Path(Config.NGINX_LOG_DIR)
    main_log_path = log_dir / "access.log"
    combined_data: List[StructuredLogEntry] = []
    TEN_MB = 10 * 1024 * 1024
    actual_file_to_process_path: Path = main_log_path
    temp_file_name: Optional[str] = None


    if not await aios.path.isfile(main_log_path):
        logger.warning(f"Main access log file not found: {main_log_path}")
        return []

    try:
        file_size = await aios.path.getsize(main_log_path)

        if file_size > TEN_MB:
            logger.info(f"{main_log_path.name} is larger than 10MB ({file_size} bytes). Processing last 10MB.")
            
            # Create a temporary file to write the chunk into
            # delete=False is important as aiofiles.open will open it by name
            # and we need to manage its lifecycle.
            with tempfile.NamedTemporaryFile(delete=False, mode='w') as tmp_sync_fp:
                temp_file_name = tmp_sync_fp.name
            
            actual_file_to_process_path = Path(temp_file_name)

            async with aiofiles.open(main_log_path, mode='rb') as main_fp_rb: # Read as bytes
                await main_fp_rb.seek(file_size - TEN_MB)
                chunk_bytes = await main_fp_rb.read(TEN_MB)
            
            # Decode and split into lines, then remove the first line
            try:
                chunk_str = chunk_bytes.decode('utf-8', errors='ignore')
                lines_in_chunk = chunk_str.splitlines(keepends=True)
                if lines_in_chunk:
                    logger.debug(f"Removing potentially partial first line from 10MB chunk: {lines_in_chunk[0].strip()}")
                    lines_to_write = lines_in_chunk[1:]
                else:
                    lines_to_write = []
            except Exception as decode_err:
                logger.error(f"Error decoding 10MB chunk from {main_log_path.name}: {decode_err}")
                # Fallback to empty list or re-raise, for now, proceed with empty.
                lines_to_write = []


            async with aiofiles.open(temp_file_name, mode='w', encoding='utf-8') as tmp_aio_fp_w:
                for line in lines_to_write:
                    await tmp_aio_fp_w.write(line)
            
            logger.info(f"Last 10MB (minus first line) written to temporary file: {temp_file_name}")
        else:
            logger.info(f"{main_log_path.name} is {file_size} bytes. Processing directly.")
            # actual_file_to_process_path is already main_log_path by default

        log_pattern = re.compile(
            r'(?P<ip>\S+)\s+-\s+-\s+'           # IP address
            r'\[(?P<timestamp>[^\]]+)\]\s+'   # Timestamp
            r'"(?P<request>[^"]+)"\s+'        # Request line
            r'(?P<status>\d+)\s+'             # Status code
            r'(?P<size>\d+|-)\s+'             # Response size
            r'"(?P<referer>[^"]*)"\s+'        # Referer
            r'"(?P<user_agent>[^"]*)"'        # User Agent
        )

        logger.info(f"Starting to parse log data from: {actual_file_to_process_path.name}")
        
        # Collect all lines from the file to be processed, then reverse
        all_lines_from_file = []
        async with aiofiles.open(actual_file_to_process_path, mode='r', encoding='utf-8', errors='ignore') as f_process:
            async for line in f_process:
                all_lines_from_file.append(line)

        # Process lines from the end of the list (effectively end of file/chunk)
        for line_num_in_reversed_list, line_content in enumerate(reversed(all_lines_from_file), 1):
            if len(combined_data) >= 1000:
                logger.info(f"Collected 1000 entries from {actual_file_to_process_path.name}, stopping further processing of this file.")
                break
            
            match = log_pattern.match(line_content)
            if match:
                log_entry = match.groupdict()
                log_timestamp = None

                try:
                    log_timestamp = datetime.strptime(log_entry['timestamp'], '%d/%b/%Y:%H:%M:%S %z')
                except ValueError:
                    logger.warning(f"Skipping line in {actual_file_to_process_path.name} (original line number unknown due to chunking/reversal): Invalid timestamp '{log_entry['timestamp']}'")
                    continue

                method, path, query, protocol = None, None, None, None
                request_parts = log_entry['request'].split(' ', 2)
                if len(request_parts) == 3:
                    method = request_parts[0]
                    path_query = request_parts[1]
                    protocol = request_parts[2]
                    parsed_url = urlparse(path_query)
                    path = parsed_url.path
                    query = parsed_url.query
                else:
                    logger.warning(f"Skipping line in {actual_file_to_process_path.name}: Malformed request line '{log_entry['request']}'")

                try:
                   size = int(log_entry['size']) if log_entry['size'] != '-' else 0
                except ValueError:
                     logger.warning(f"Skipping line in {actual_file_to_process_path.name}: Invalid size value '{log_entry['size']}'")
                     size = 0

                try:
                    entry = StructuredLogEntry(
                       timestamp=log_timestamp.isoformat(),
                       date=log_timestamp.date().isoformat(),
                       ip=log_entry['ip'],
                       method=method,
                       path=path,
                       query=query if query else None,
                       protocol=protocol,
                       status_code=int(log_entry['status']),
                       response_size=size,
                       referer=log_entry['referer'] if log_entry['referer'] != '-' else None,
                       user_agent=log_entry['user_agent'] if log_entry['user_agent'] != '-' else None,
                    )
                    combined_data.append(entry)
                except Exception as model_err:
                     logger.warning(f"Skipping line in {actual_file_to_process_path.name}: Error creating model instance - {model_err}")
            else:
                if line_content.strip():
                   logger.debug(f"Line in {actual_file_to_process_path.name} did not match log pattern: {line_content.strip()}")

    except OSError as e:
        logger.error(f"OSError during log processing for {main_log_path}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during log processing for {main_log_path}: {e}")
    finally:
        if temp_file_name:
            try:
                await aios.remove(temp_file_name)
                logger.info(f"Successfully deleted temporary log file: {temp_file_name}")
            except OSError as e_remove:
                logger.error(f"Error deleting temporary log file {temp_file_name}: {e_remove}")

    combined_data.sort(key=lambda x: x.timestamp, reverse=True)
    # Limit is applied during collection, but sort is final.
    # The list 'combined_data' will already contain at most 1000 entries.
    logger.info(f"Returning {len(combined_data)} most recent entries from access.log processing (up to 1000 requested).")
    return combined_data

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


# --- Nginx Service Management (Requires sudo) ---

async def _run_nginx_command(command_args: List[str]) -> NginxCommandStatus:
    """Helper function to run an Nginx command with sudo and capture output."""
    command_str = " ".join(command_args)
    logger.info(f"Attempting to run command: {command_str}")
    try:
        process = await asyncio.create_subprocess_exec(
            *command_args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        # Ensure return_code is int, default to -1 if process terminates unexpectedly
        return_code = process.returncode if process.returncode is not None else -1

        stdout_decoded = stdout.decode('utf-8', errors='ignore').strip() if stdout else None
        stderr_decoded = stderr.decode('utf-8', errors='ignore').strip() if stderr else None

        success = return_code == 0
        # Adjust success specifically for 'systemctl status' which returns 3 if inactive
        if 'systemctl' in command_args and 'status' in command_args and return_code == 3:
            success = True # Treat inactive status as a 'successful' query in terms of command execution
            message = f"Command '{command_str}' executed; service is likely inactive (code {return_code})."
        else:
             message = f"Command '{command_str}' {'succeeded' if success else 'failed'} with code {return_code}."

        if not success and stderr_decoded:
            message += f" Error: {stderr_decoded}"
        elif not success and stdout_decoded: # Some errors go to stdout
             message += f" Output: {stdout_decoded}"

        logger.info(message)
        if stdout_decoded: logger.debug(f"STDOUT:\n{stdout_decoded}")
        if stderr_decoded: logger.debug(f"STDERR:\n{stderr_decoded}")

        return NginxCommandStatus(
            success=success, # Reflects if the command itself ran okay (or found inactive service)
            command=command_str,
            stdout=stdout_decoded,
            stderr=stderr_decoded,
            return_code=return_code, # The actual return code
            message=message
        )

    except FileNotFoundError:
        logger.error(f"Command not found: '{command_args[0]}'. Is it installed and in PATH?")
        raise NginxManagementError(f"Command '{command_args[0]}' not found. Ensure it's installed and accessible.", 500)
    except Exception as e:
        logger.exception(f"Error running command '{command_str}': {e}")
        raise NginxManagementError(f"An unexpected error occurred while running '{command_str}': {e}", 500)

async def test_nginx_config() -> NginxCommandStatus:
    """Tests the Nginx configuration using 'sudo nginx -t'."""
    # Consider finding the actual nginx binary path if needed, e.g., shutil.which('nginx')
    # For now, assuming 'nginx' is in sudo path
    return await _run_nginx_command(['sudo', 'nginx', '-t'])

async def reload_nginx() -> NginxCommandStatus:
    """Reloads the Nginx service using 'sudo systemctl reload nginx'."""
    return await _run_nginx_command(['sudo', 'systemctl', 'reload', 'nginx'])

async def restart_nginx() -> NginxCommandStatus:
    """Restarts the Nginx service using 'sudo systemctl restart nginx'."""
    return await _run_nginx_command(['sudo', 'systemctl', 'restart', 'nginx'])

async def stop_nginx() -> NginxCommandStatus:
    """Stops the Nginx service using 'sudo systemctl stop nginx'."""
    return await _run_nginx_command(['sudo', 'systemctl', 'stop', 'nginx'])

async def start_nginx() -> NginxCommandStatus:
    """Starts the Nginx service using 'sudo systemctl start nginx'."""
    return await _run_nginx_command(['sudo', 'systemctl', 'start', 'nginx'])

async def enable_nginx() -> NginxCommandStatus:
    """Enables the Nginx service to start on boot using 'sudo systemctl enable nginx'."""
    return await _run_nginx_command(['sudo', 'systemctl', 'enable', 'nginx'])

async def disable_nginx() -> NginxCommandStatus:
    """Disables the Nginx service from starting on boot using 'sudo systemctl disable nginx'."""
    return await _run_nginx_command(['sudo', 'systemctl', 'disable', 'nginx'])

async def get_nginx_status() -> NginxCommandStatus:
    """Gets the Nginx service status using 'sudo systemctl status nginx'."""
    # Note: systemctl status often returns non-zero code even if service is inactive but found.
    # The success flag in the result will reflect the direct command success (code 0).
    # Consumers should check stdout/stderr for actual status details.
    return await _run_nginx_command(['sudo', 'systemctl', 'status', 'nginx'])
