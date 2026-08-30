from functools import wraps
from flask import session, redirect, url_for

def login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if not session.get("autenticado"):
            return redirect(url_for("auth.login"))

        return view(*args, **kwargs)

    return wrapped_view
