from flask import (redirect, render_template, request, session, url_for)
from . import auth_bp
from .service import verificar_credenciales

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if session.get("autenticado"):
        return redirect(
                url_for("dashboard.index")
        )

    error = None

    if request.method == "POST":
        usuario = request.form.get("usuario", "").strip()

        password = request.form.get("password", "")

        if verificar_credenciales(usuario, password):
            session["autenticado"] = True
            session["usuario"] = usuario

            return redirect(url_for("dashboard.index"))

        error = "Usuario o contraseña incorrectos."

    return render_template("login.html", error=error)


@auth_bp.get("/logout")
def logout():
    session.clear()
    return redirect(url_for("auth.login"))

