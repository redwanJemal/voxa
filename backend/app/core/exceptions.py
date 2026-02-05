"""Custom application exceptions."""


class VoxaException(Exception):
    """Base exception for all Voxa errors."""

    def __init__(self, message: str = "An error occurred", status_code: int = 500) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class NotFoundException(VoxaException):
    """Resource not found."""

    def __init__(self, resource: str = "Resource", id: str = "") -> None:
        detail = f"{resource} not found" if not id else f"{resource} '{id}' not found"
        super().__init__(message=detail, status_code=404)


class UnauthorizedException(VoxaException):
    """Authentication required or failed."""

    def __init__(self, message: str = "Not authenticated") -> None:
        super().__init__(message=message, status_code=401)


class ForbiddenException(VoxaException):
    """Insufficient permissions."""

    def __init__(self, message: str = "Permission denied") -> None:
        super().__init__(message=message, status_code=403)


class RateLimitException(VoxaException):
    """Rate limit exceeded."""

    def __init__(self, message: str = "Rate limit exceeded") -> None:
        super().__init__(message=message, status_code=429)


class ValidationException(VoxaException):
    """Validation error."""

    def __init__(self, message: str = "Validation error") -> None:
        super().__init__(message=message, status_code=422)


class VoiceServiceException(VoxaException):
    """Voice service error (STT/TTS)."""

    def __init__(self, message: str = "Voice service error") -> None:
        super().__init__(message=message, status_code=502)


class KnowledgeBaseException(VoxaException):
    """Knowledge base processing error."""

    def __init__(self, message: str = "Knowledge base error") -> None:
        super().__init__(message=message, status_code=500)
