
class AppError(Exception):
    """Error base de la aplicación."""

    status_code = 400

    def __init__(self, message):
        self.message = message
        super().__init__(message)

class ValidationError(AppError):
    status_code = 400

class NotFoundError(AppError):
    status_code = 404

class ConflictError(AppError):
    status_code = 409
