
import mimetypes

from flask import Flask, jsonify
from .config import Config
from .database import init_db
from .errors import AppError

# En Windows, mimetypes lee el registro y a veces sirve .js como text/plain,
# lo que rompe los <script type="module"> del frontend. Lo fijamos acá.
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")


def create_app(config_class=Config):
    app = Flask(__name__)
    
    app.config.from_object(config_class)

    # Inicializar base de datos.
    with app.app_context():
        init_db()

    # Registrar manejo de errores.
    register_error_handlers(app)

    register_blueprints(app)

    return app

def register_blueprints(app):
    from .auth import auth_bp
    from .canchas import canchas_bp
    from .clientes import clientes_bp
    from .turnos import turnos_bp
    from .disponibilidad import disponibilidad_bp
    from .dashboard import dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(canchas_bp)
    app.register_blueprint(clientes_bp)
    app.register_blueprint(turnos_bp)
    app.register_blueprint(disponibilidad_bp)
    app.register_blueprint(dashboard_bp)

# app/__init__.py
from werkzeug.exceptions import HTTPException

def register_error_handlers(app):

    @app.errorhandler(AppError)
    def handle_app_error(error):
        return jsonify({"error": error.message}), error.status_code

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify({"error": error.description}), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception(error)
        return jsonify({"error": "Ocurrió un error interno."}), 500