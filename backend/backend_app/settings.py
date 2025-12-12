import os

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
DATA_DIR = os.getenv("DATA_DIR", "data")
APP_TITLE = os.getenv("APP_TITLE", "Web Explorer API")
