from flask import jsonify, render_template, session
from . import dashboard_bp
from .service import obtener_dashboard
from app.auth.decorators import login_required


@dashboard_bp.get("/")
@login_required
def index():
    return render_template("index.html", usuario=session.get("usuario"))

@dashboard_bp.get("/api/home")
@login_required
def home():
    return jsonify(obtener_dashboard())