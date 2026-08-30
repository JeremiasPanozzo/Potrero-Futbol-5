import threading
import webbrowser
from app import create_app
from app.auth.service import init_admin

app = create_app()

def abrir_navegador():
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    # Crea el administrador si no existe.
    init_admin()

    threading.Timer(1.5,abrir_navegador).start()

    app.run(host=app.config["HOST"],port=app.config["PORT"], debug=app.config["DEBUG"],)