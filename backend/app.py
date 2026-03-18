try:
    from .holograma.api import app
except ImportError:
    from holograma.api import app
