# utils/decorators.py
from functools import wraps
from flask import abort
from flask_login import current_user

def admin_required(func):
    @wraps(func)
    def decorated_function(*args, **kwargs):
        # Print statements for debugging (keep flush=True for now)
        print(f"--- Admin Decorator Check ---", flush=True)
        print(f"Current user: {current_user}", flush=True)
        print(f"Is authenticated: {current_user.is_authenticated}", flush=True)

        # Check authentication status first
        if not current_user.is_authenticated:
            print("User not authenticated. Aborting.", flush=True)
            abort(403) # Forbidden

        # If authenticated, check the role
        print(f"User role: {current_user.role}", flush=True)
        if current_user.role != 'admin':
            print(f"User role '{current_user.role}' is not 'admin'. Aborting.", flush=True)
            abort(403) # Forbidden

        # If authenticated and role is 'admin', proceed
        print("User is admin. Allowing access.", flush=True)
        return func(*args, **kwargs)
    return decorated_function