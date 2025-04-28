import sys
from loguru import logger
from icecream import ic

logger.remove()

ic.configureOutput(prefix='Debug | ', includeContext=True) 

logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO" 
)

log_file_path = ".global.log"
logger.add(
    log_file_path,
    rotation="10 MB", 
    retention="10 days",
    compression="zip", 
    level="DEBUG", 
    format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}" 
)

def ic_sink(message):
    print(message, end='') 

logger.remove()
logger.add(ic_sink, level="DEBUG")

__all__ = ["logger", "ic"]

if __name__ == "__main__":
    logger.debug("This is a debug message.")
    logger.info("This is an info message.")
    logger.warning("This is a warning message.")
    logger.error("This is an error message.")
    logger.critical("This is a critical message.")

    ic("Using icecream directly for detailed debugging.")
    test_dict = {'a': 1, 'b': [1, 2, 3]}
    ic(test_dict)