# utils/decorators.py
from functools import wraps
from flask import abort
from flask_login import current_user

def admin_required(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        print("Admin required decorator called", flush=True) # <--- changed this line
        return func(*args, **kwargs)
    return decorated_function