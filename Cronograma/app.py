"""
CRONOGRAMA UTB — app.py
Usa la misma PostgreSQL de Dulce Tentación
pero con esquema separado para no interferir
"""

from flask import Flask, render_template, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import psycopg2
from psycopg2.extras import RealDictCursor
import os

app = Flask(__name__)

# Configuración de PostgreSQL (la MISMA que Dulce Tentación)
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# IMPORTANTE: Esquema exclusivo para el cronograma
# Dulce Tentación usa el esquema "public" (por defecto)
# Cronograma usa "cronograma"
SCHEMA = "cronograma"

MAX_USUARIOS = 5


# ============================================================
# CONEXIÓN A LA BASE DE DATOS
# ============================================================
def get_db():
    """Retorna conexión con esquema configurado"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute(f"SET search_path TO {SCHEMA}, public")
    cursor.close()
    return conn


# ============================================================
# INICIALIZAR ESQUEMA Y TABLAS
# ============================================================
def init_db():
    """Crea el esquema 'cronograma' y sus tablas"""
    conn = psycopg2.connect(DATABASE_URL)
    c = conn.cursor()

    # 1. Crear esquema si no existe
    c.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")
    print(f"✅ Esquema '{SCHEMA}' creado/verificado")

    # 2. Cambiar al esquema del cronograma
    c.execute(f"SET search_path TO {SCHEMA}, public")

    # 3. Crear tabla usuarios (solo en esquema cronograma)
    c.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            id        SERIAL PRIMARY KEY,
            username  VARCHAR(100) UNIQUE NOT NULL,
            nombre    VARCHAR(200) NOT NULL,
            cargo     VARCHAR(100) NOT NULL,
            password  VARCHAR(255) NOT NULL,
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 4. Crear tabla actividades (solo en esquema cronograma)
    c.execute("""
        CREATE TABLE IF NOT EXISTS actividades (
            id                 SERIAL PRIMARY KEY,
            nombre             VARCHAR(300) NOT NULL,
            descripcion        TEXT,
            responsable        VARCHAR(200) NOT NULL,
            fecha_inicio       DATE NOT NULL,
            fecha_limite       DATE NOT NULL,
            prioridad          VARCHAR(20) DEFAULT 'media',
            completada         BOOLEAN DEFAULT FALSE,
            fecha_completado   DATE,
            completada_por     VARCHAR(100),
            creada_por         VARCHAR(100),
            creada_en          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 5. Crear índices
    c.execute("CREATE INDEX IF NOT EXISTS idx_act_fecha_limite ON actividades(fecha_limite)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_act_completada ON actividades(completada)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_usuarios_user ON usuarios(username)")

    conn.commit()
    conn.close()
    print(f"✅ Tablas del cronograma creadas en esquema '{SCHEMA}'")
    print("✅ Las tablas de Dulce Tentación NO fueron tocadas (están en 'public')")


# Inicializar al arrancar
try:
    init_db()
except Exception as e:
    print(f"⚠️ Error al inicializar: {e}")


# ============================================================
# RUTAS
# ============================================================
@app.route("/")
def index():
    return render_template("index.html")


# ============================================================
# API — USUARIOS
# ============================================================
@app.route("/api/usuarios/count")
def count_usuarios():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM usuarios")
    count = c.fetchone()[0]
    conn.close()
    return jsonify({"count": count})


@app.route("/api/usuarios/registrar", methods=["POST"])
def registrar():
    data = request.get_json()
    nombre = data.get("nombre", "").strip()
    user   = data.get("user", "").strip().lower()
    cargo  = data.get("cargo", "").strip()
    pwd    = data.get("pass", "")

    if not all([nombre, user, cargo, pwd]):
        return jsonify({"ok": False, "error": "Faltan campos obligatorios"})

    if len(pwd) < 4:
        return jsonify({"ok": False, "error": "Contraseña mínimo 4 caracteres"})

    conn = get_db()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM usuarios")
    count = c.fetchone()[0]
    if count >= MAX_USUARIOS:
        conn.close()
        return jsonify({"ok": False, "error": f"Límite de {MAX_USUARIOS} usuarios"})

    c.execute("SELECT id FROM usuarios WHERE username = %s", (user,))
    if c.fetchone():
        conn.close()
        return jsonify({"ok": False, "error": "Usuario ya existe"})

    hashed = generate_password_hash(pwd, method='pbkdf2:sha256')
    c.execute(
        "INSERT INTO usuarios (username, nombre, cargo, password) VALUES (%s, %s, %s, %s)",
        (user, nombre, cargo, hashed)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/usuarios/login", methods=["POST"])
def login():
    data = request.get_json()
    user = data.get("user", "").strip().lower()
    pwd  = data.get("pass", "")

    conn = get_db()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute("SELECT * FROM usuarios WHERE username = %s", (user,))
    row = c.fetchone()
    conn.close()

    if row and check_password_hash(row["password"], pwd):
        return jsonify({
            "ok": True,
            "usuario": {
                "id": row["id"],
                "user": row["username"],
                "nombre": row["nombre"],
                "cargo": row["cargo"]
            }
        })

    return jsonify({"ok": False, "error": "Credenciales incorrectas"})


# ============================================================
# API — ACTIVIDADES
# ============================================================
@app.route("/api/actividades", methods=["GET"])
def listar_actividades():
    conn = get_db()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute("SELECT * FROM actividades ORDER BY fecha_limite ASC")
    rows = c.fetchall()
    conn.close()

    result = []
    for r in rows:
        row_dict = dict(r)
        if row_dict.get('fecha_inicio'):
            row_dict['fecha_inicio'] = str(row_dict['fecha_inicio'])
        if row_dict.get('fecha_limite'):
            row_dict['fecha_limite'] = str(row_dict['fecha_limite'])
        if row_dict.get('fecha_completado'):
            row_dict['fecha_completado'] = str(row_dict['fecha_completado'])
        result.append(row_dict)

    return jsonify(result)


@app.route("/api/actividades/<int:act_id>", methods=["GET"])
def obtener_actividad(act_id):
    conn = get_db()
    c = conn.cursor(cursor_factory=RealDictCursor)
    c.execute("SELECT * FROM actividades WHERE id = %s", (act_id,))
    row = c.fetchone()
    conn.close()

    if row:
        row_dict = dict(row)
        if row_dict.get('fecha_inicio'):
            row_dict['fecha_inicio'] = str(row_dict['fecha_inicio'])
        if row_dict.get('fecha_limite'):
            row_dict['fecha_limite'] = str(row_dict['fecha_limite'])
        if row_dict.get('fecha_completado'):
            row_dict['fecha_completado'] = str(row_dict['fecha_completado'])
        return jsonify(row_dict)

    return jsonify({"error": "No encontrada"}), 404


@app.route("/api/actividades", methods=["POST"])
def crear_actividad():
    data = request.get_json()

    nombre = data.get("nombre", "").strip()
    responsable = data.get("responsable", "").strip()
    fecha_inicio = data.get("fecha_inicio", "")
    fecha_limite = data.get("fecha_limite", "")

    if not all([nombre, responsable, fecha_inicio, fecha_limite]):
        return jsonify({"ok": False, "error": "Faltan campos obligatorios"})

    conn = get_db()
    c = conn.cursor()
    c.execute("""
        INSERT INTO actividades
            (nombre, descripcion, responsable, fecha_inicio, fecha_limite, prioridad, creada_por)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """, (
        nombre,
        data.get("descripcion", ""),
        responsable,
        fecha_inicio,
        fecha_limite,
        data.get("prioridad", "media"),
        data.get("creada_por", "")
    ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/actividades/<int:act_id>", methods=["PUT"])
def editar_actividad(act_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT completada FROM actividades WHERE id = %s", (act_id,))
    row = c.fetchone()

    if not row:
        conn.close()
        return jsonify({"ok": False, "error": "Actividad no encontrada"})

    if row[0]:
        conn.close()
        return jsonify({"ok": False, "error": "No se puede editar actividad completada"})

    data = request.get_json()
    c.execute("""
        UPDATE actividades
        SET nombre = %s, descripcion = %s, responsable = %s,
            fecha_inicio = %s, fecha_limite = %s, prioridad = %s
        WHERE id = %s
    """, (
        data.get("nombre"),
        data.get("descripcion", ""),
        data.get("responsable"),
        data.get("fecha_inicio"),
        data.get("fecha_limite"),
        data.get("prioridad", "media"),
        act_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/actividades/<int:act_id>/completar", methods=["PUT"])
def completar_actividad(act_id):
    data = request.get_json()
    fecha_comp = data.get("fecha_completado", "")
    completada_por = data.get("completada_por", "")

    if not fecha_comp:
        return jsonify({"ok": False, "error": "Falta fecha de completado"})

    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT completada FROM actividades WHERE id = %s", (act_id,))
    row = c.fetchone()

    if not row:
        conn.close()
        return jsonify({"ok": False, "error": "Actividad no encontrada"})

    if row[0]:
        conn.close()
        return jsonify({"ok": False, "error": "Ya está completada"})

    c.execute("""
        UPDATE actividades
        SET completada = TRUE, fecha_completado = %s, completada_por = %s
        WHERE id = %s
    """, (fecha_comp, completada_por, act_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/actividades/<int:act_id>", methods=["DELETE"])
def eliminar_actividad(act_id):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM actividades WHERE id = %s", (act_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ============================================================
# INICIO
# ============================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)