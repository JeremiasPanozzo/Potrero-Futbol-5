import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY","potrero-local-key-2026")
    DATABASE = os.getenv("DATABASE_PATH", str(BASE_DIR / "potrero.db") ) 
    HOST = os.getenv("FLASK_HOST", "127.0.0.1")
    PORT = int(os.getenv("FLASK_PORT", "8000"))
    DEBUG = os.getenv( "FLASK_DEBUG", "false" ).lower() == "true"
    HORARIOS = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00"]