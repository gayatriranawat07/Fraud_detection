# auth.py — password hashing and user verification

from werkzeug.security import generate_password_hash, check_password_hash
from database import get_connection


def register_user(username, password):
    conn = get_connection()
    try:
        hashed = generate_password_hash(password)
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            (username, hashed)
        )
        conn.commit()
        return True, "User created successfully."
    except Exception:
        return False, "Username already exists."
    finally:
        conn.close()


def verify_user(username, password):
    conn = get_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    if user and check_password_hash(user["password_hash"], password):
        return user
    return None