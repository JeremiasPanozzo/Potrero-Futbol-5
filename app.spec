# app.spec
import sys
from pathlib import Path
from PyInstaller.building.build_main import Analysis, PYZ, EXE, COLLECT

block_cipher = None

a = Analysis(
    ['app.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('templates', 'templates'),   # tus HTML
        ('static',    'static'),      # tu CSS e imágenes si tenés
    ],
    hiddenimports=[
        'flask',
        'werkzeug',
        'werkzeug.security',
        'werkzeug.utils',
        'werkzeug.serving',
        'jinja2',
        'jinja2.ext',
        'click',
        'itsdangerous',
        'sqlite3',
        'database',
        'auth',
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='PotreroPro',
    debug=False,
    strip=False,
    upx=True,
    console=False,        # sin ventana de terminal
    icon='futbol.ico',      # tu ícono, si tenés
)