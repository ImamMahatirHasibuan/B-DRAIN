import os
import sys

# Tambahkan direktori root dan direktori ml ke sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
ML_DIR = os.path.join(ROOT_DIR, "ml")

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

# Di Windows (lingkungan lokal Vercel CLI), hapus polyfill register_at_fork
# agar modul standard library Python seperti concurrent.futures tidak error
if sys.platform == "win32" and hasattr(os, "register_at_fork"):
    del os.register_at_fork

from ml.api import app  # noqa: E402

# Vercel Python runtime secara otomatis mendeteksi objek WSGI 'app'
__all__ = ["app"]
