from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import List, Optional

from .models import (
    SiteInfo, SiteCreate, SiteUpdate, NginxConf, LogInfo,
    SiteActionStatus, LogActionStatus, ConfActionStatus
)
from . import nginx_manager
from .nginx_manager import NginxManagementError
from auth.security import get_current_user
from helpers.logger import logger

nginx_router = APIRouter()

CurrentUser = Depends(get_current_user)

def handle_nginx_error(e: NginxManagementError):
    logger.error(f"Nginx API Error: {e.message} (Status Code: {e.status_code})")
    raise HTTPException(status_code=e.status_code, detail=e.message)



@nginx_router.get("/sites", response_model=List[SiteInfo], summary="List Nginx Sites")
async def get_nginx_sites(current_user: dict = CurrentUser):
    """
    Retrieves a list of all available Nginx sites and their enabled status.
    Requires authentication.
    """
    try:
        sites = nginx_manager.list_sites()
        return sites
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error listing Nginx sites")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")


@nginx_router.post("/sites", response_model=SiteActionStatus, status_code=status.HTTP_201_CREATED, summary="Create Nginx Site")
async def create_nginx_site(site_data: SiteCreate, current_user: dict = CurrentUser):
    """
    Creates a new Nginx site configuration in sites-available.
    Requires authentication. The site is NOT enabled automatically.
    """
    try:
        created_site = nginx_manager.create_site(site_data.name, site_data.content)
        return SiteActionStatus(
            success=True,
            message=f"Site '{created_site.name}' created successfully in sites-available.",
            site_name=created_site.name,
            action="created"
         )
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception(f"Unexpected error creating Nginx site {site_data.name}")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")

@nginx_router.get("/sites/{site_name}", response_model=SiteInfo, summary="Get Specific Nginx Site")
async def get_nginx_site(site_name: str, current_user: dict = CurrentUser):
    """
    Retrieves details and content for a specific Nginx site.
    Requires authentication.
    """
    try:
        site_info = nginx_manager.get_site_info(site_name)
        return site_info
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception(f"Unexpected error getting Nginx site {site_name}")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")


@nginx_router.put("/sites/{site_name}", response_model=SiteActionStatus, summary="Update or Enable/Disable Nginx Site")
async def update_nginx_site(site_name: str, site_update: SiteUpdate, current_user: dict = CurrentUser):
    """
    Updates an Nginx site configuration or enables/disables it.
    - To update content, provide the `content` field.
    - To enable/disable, provide the `enable` field (true/false).
    Requires authentication.
    """
    action_taken = "updated" 
    try:
        nginx_manager.get_site_info(site_name)

        if site_update.content is not None:
            nginx_manager.update_site_content(site_name, site_update.content)
            logger.info(f"Site '{site_name}' content updated by user '{current_user.get('username')}'.")
            action_taken = "content_updated"


        if site_update.enable is not None:
            if site_update.enable:
                nginx_manager.enable_site(site_name)
                action_taken = "enabled" if action_taken == "updated" else f"{action_taken}_and_enabled"
                logger.info(f"Site '{site_name}' enabled by user '{current_user.get('username')}'.")

            else:
                nginx_manager.disable_site(site_name)
                action_taken = "disabled" if action_taken == "updated" else f"{action_taken}_and_disabled"
                logger.info(f"Site '{site_name}' disabled by user '{current_user.get('username')}'.")

        return SiteActionStatus(
                success=True,
                message=f"Site '{site_name}' action '{action_taken}' completed successfully.",
                site_name=site_name,
                action=action_taken
            )

    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception(f"Unexpected error updating/enabling/disabling Nginx site {site_name}")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")


@nginx_router.delete("/sites/{site_name}", response_model=SiteActionStatus, summary="Delete Nginx Site")
async def delete_nginx_site(site_name: str, current_user: dict = CurrentUser):
    """
    Deletes an Nginx site configuration from sites-available and removes the symlink
    from sites-enabled if it exists.
    Requires authentication. This is a permanent action.
    """
    try:
        nginx_manager.delete_site(site_name)
        logger.info(f"Site '{site_name}' deleted by user '{current_user.get('username')}'.")
        return SiteActionStatus(
            success=True,
            message=f"Site '{site_name}' deleted successfully.",
            site_name=site_name,
            action="deleted"
        )
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception(f"Unexpected error deleting Nginx site {site_name}")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")



@nginx_router.get("/logs", response_model=List[LogInfo], summary="List Nginx Logs")
async def get_nginx_logs(current_user: dict = CurrentUser):
    """
    Retrieves a list of Nginx log files found in the configured log directory.
    Requires authentication.
    """
    try:
        logs = nginx_manager.list_logs()
        return logs
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error listing Nginx logs")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")


@nginx_router.get("/logs/{log_name}", summary="Get Nginx Log Content", response_class=Response)
async def get_nginx_log_content(
    log_name: str,
    tail: Optional[int] = Query(100, description="Number of lines to tail from the end (0 or negative means full log)"),
    current_user: dict = CurrentUser
):
    """
    Retrieves the content (or tail) of a specific Nginx log file.
    Requires authentication. Returns plain text.
    """
    try:
        content = nginx_manager.get_log_content(log_name, tail_lines=tail if tail is not None and tail > 0 else None)
        return Response(content=content, media_type="text/plain")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception(f"Unexpected error reading Nginx log {log_name}")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")


@nginx_router.delete("/logs/{log_name}", response_model=LogActionStatus, summary="Delete Nginx Log File")
async def delete_nginx_log(log_name: str, current_user: dict = CurrentUser):
    """
    Deletes a specific Nginx log file.
    Requires authentication. Use with caution.
    """
    try:
        nginx_manager.delete_log(log_name)
        logger.info(f"Log file '{log_name}' deleted by user '{current_user.get('username')}'.")
        return LogActionStatus(
            success=True,
            message=f"Log file '{log_name}' deleted successfully.",
            log_name=log_name,
            action="deleted"
        )
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception(f"Unexpected error deleting Nginx log {log_name}")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")



@nginx_router.get("/conf", response_model=NginxConf, summary="Get Main Nginx Configuration")
async def get_main_nginx_conf(current_user: dict = CurrentUser):
    """
    Retrieves the content of the main Nginx configuration file (nginx.conf).
    Requires authentication.
    """
    try:
        content = nginx_manager.get_nginx_conf()
        return NginxConf(content=content)
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error reading main Nginx config")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")


@nginx_router.put("/conf", response_model=ConfActionStatus, summary="Update Main Nginx Configuration")
async def update_main_nginx_conf(conf_data: NginxConf, current_user: dict = CurrentUser):
    """
    Updates the content of the main Nginx configuration file (nginx.conf).
    Creates a backup (.bak) before writing.
    Requires authentication. Use with extreme caution.
    """
    try:
        nginx_manager.update_nginx_conf(conf_data.content)
        logger.info(f"Main Nginx config updated by user '{current_user.get('username')}'.")
        return ConfActionStatus(
            success=True,
            message="Nginx configuration updated successfully. Manual reload/test might be required.",
            action="updated"
        )
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error updating main Nginx config")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred.")
# === Nginx Service Actions ===

@nginx_router.post("/actions/test", response_model=nginx_manager.NginxCommandStatus, summary="Test Nginx Configuration")
async def test_nginx_configuration(current_user: dict = CurrentUser):
    """
    Tests the current Nginx configuration using `sudo nginx -t`.
    Requires authentication and appropriate sudo permissions for the FastAPI process user.
    Returns the result of the command execution.
    """
    try:
        logger.info(f"Nginx config test requested by user '{current_user.get('username')}'.")
        result = await nginx_manager.test_nginx_config()
        # Return status based on command result, even if it failed (e.g., config error)
        response_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
        return Response(content=result.model_dump_json(), status_code=response_status, media_type="application/json")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error testing Nginx configuration")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred during config test.")

@nginx_router.post("/actions/reload", response_model=nginx_manager.NginxCommandStatus, summary="Reload Nginx Service")
async def reload_nginx_service(current_user: dict = CurrentUser):
    """
    Reloads the Nginx service using `sudo systemctl reload nginx`.
    Requires authentication and appropriate sudo permissions for the FastAPI process user.
    Returns the result of the command execution.
    """
    try:
        logger.info(f"Nginx reload requested by user '{current_user.get('username')}'.")
        result = await nginx_manager.reload_nginx()
        response_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
        return Response(content=result.model_dump_json(), status_code=response_status, media_type="application/json")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error reloading Nginx service")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred during reload.")

@nginx_router.post("/actions/start", response_model=nginx_manager.NginxCommandStatus, summary="Start Nginx Service")
async def start_nginx_service(current_user: dict = CurrentUser):
    """
    Starts the Nginx service using `sudo systemctl start nginx`.
    Requires authentication and appropriate sudo permissions for the FastAPI process user.
    Returns the result of the command execution.
    """
    try:
        logger.info(f"Nginx start requested by user '{current_user.get('username')}'.")
        result = await nginx_manager.start_nginx()
        response_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
        return Response(content=result.model_dump_json(), status_code=response_status, media_type="application/json")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error starting Nginx service")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred while starting Nginx.")
    
@nginx_router.post("/actions/stop", response_model=nginx_manager.NginxCommandStatus, summary="Stop Nginx Service")
async def stop_nginx_service(current_user: dict = CurrentUser):
    """
    Stops the Nginx service using `sudo systemctl stop nginx`.
    Requires authentication and appropriate sudo permissions for the FastAPI process user.
    Returns the result of the command execution.
    """
    try:
        logger.info(f"Nginx stop requested by user '{current_user.get('username')}'.")
        result = await nginx_manager.stop_nginx()
        response_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
        return Response(content=result.model_dump_json(), status_code=response_status, media_type="application/json")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error stopping Nginx service")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred while stopping Nginx.")
    
@nginx_router.post("/actions/restart", response_model=nginx_manager.NginxCommandStatus, summary="Restart Nginx Service")
async def restart_nginx_service(current_user: dict = CurrentUser):
    """
    Restarts the Nginx service using `sudo systemctl restart nginx`.
    Requires authentication and appropriate sudo permissions for the FastAPI process user.
    Returns the result of the command execution.
    """
    try:
        logger.info(f"Nginx restart requested by user '{current_user.get('username')}'.")
        result = await nginx_manager.restart_nginx()
        response_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
        return Response(content=result.model_dump_json(), status_code=response_status, media_type="application/json")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error restarting Nginx service")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred while restarting Nginx.")

@nginx_router.post("/actions/enable", response_model=nginx_manager.NginxCommandStatus, summary="Enable Nginx Service")
async def enable_nginx_service(current_user: dict = CurrentUser):
    """
    Enables the Nginx service using `sudo systemctl enable nginx`.
    Requires authentication and appropriate sudo permissions for the FastAPI process user.
    Returns the result of the command execution.
    """
    try:
        logger.info(f"Nginx enable requested by user '{current_user.get('username')}'.")
        result = await nginx_manager.enable_nginx()
        response_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
        return Response(content=result.model_dump_json(), status_code=response_status, media_type="application/json")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error enabling Nginx service")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred while enabling Nginx.")
    
@nginx_router.post("/actions/disable", response_model=nginx_manager.NginxCommandStatus, summary="Disable Nginx Service")
async def disable_nginx_service(current_user: dict = CurrentUser):
    """
    Disables the Nginx service using `sudo systemctl disable nginx`.
    Requires authentication and appropriate sudo permissions for the FastAPI process user.
    Returns the result of the command execution.
    """
    try:
        logger.info(f"Nginx disable requested by user '{current_user.get('username')}'.")
        result = await nginx_manager.disable_nginx()
        response_status = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
        return Response(content=result.model_dump_json(), status_code=response_status, media_type="application/json")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error disabling Nginx service")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred while disabling Nginx.")


@nginx_router.post("/actions/status", response_model=nginx_manager.NginxCommandStatus, summary="Get Nginx Service Status")
async def get_nginx_service_status(current_user: dict = CurrentUser):
    """
    Gets the Nginx service status using `sudo systemctl status nginx`.
    Requires authentication and appropriate sudo permissions for the FastAPI process user.
    Returns the result of the command execution (check stdout/stderr for details).
    Note: Command might succeed even if service is inactive (returns code 3).
    """
    try:
        logger.info(f"Nginx status requested by user '{current_user.get('username')}'.")
        result = await nginx_manager.get_nginx_status()
        # Status query itself usually succeeds unless command fails fundamentally.
        # Actual service state is in stdout/stderr/return_code (3 for inactive).
        response_status = status.HTTP_200_OK
        return Response(content=result.model_dump_json(), status_code=response_status, media_type="application/json")
    except NginxManagementError as e:
        handle_nginx_error(e)
    except Exception as e:
         logger.exception("Unexpected error getting Nginx status")
         raise HTTPException(status_code=500, detail="An unexpected server error occurred while getting status.")