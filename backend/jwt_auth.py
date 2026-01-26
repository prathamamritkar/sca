"""
JWT Authentication Module for SCA Backend
Provides JWT token generation, validation, and role-based access control
"""
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g
import os

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'sca-campus-sustainability-secret-key-2026')
JWT_ALGORITHM = 'HS256'
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        # Fallback for non-hashed passwords (legacy support)
        return password == hashed


def create_access_token(user_id: int, email: str, role: str, name: str = None, department: str = None) -> str:
    """
    Create a JWT access token
    
    Args:
        user_id: User's database ID
        email: User's email address
        role: User's role (student, faculty, admin)
        name: User's display name
        department: User's department
        
    Returns:
        JWT access token string
    """
    now = datetime.now(timezone.utc)
    payload = {
        'sub': str(user_id),  # JWT spec requires sub to be a string
        'user_id': user_id,   # Keep numeric version for convenience
        'email': email,
        'role': role,
        'name': name,
        'department': department,
        'type': 'access',
        'iat': now,
        'exp': now + JWT_ACCESS_TOKEN_EXPIRES,
        'iss': 'sca-backend'
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: int, email: str) -> str:
    """
    Create a JWT refresh token
    
    Args:
        user_id: User's database ID
        email: User's email address
        
    Returns:
        JWT refresh token string
    """
    now = datetime.now(timezone.utc)
    payload = {
        'sub': str(user_id),  # JWT spec requires sub to be a string
        'user_id': user_id,   # Keep numeric version for convenience
        'email': email,
        'type': 'refresh',
        'iat': now,
        'exp': now + JWT_REFRESH_TOKEN_EXPIRES,
        'iss': 'sca-backend'
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        jwt.ExpiredSignatureError: Token has expired
        jwt.InvalidTokenError: Token is invalid
    """
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])


def get_token_from_header() -> str | None:
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]
    return None


def jwt_required(f):
    """
    Decorator to require valid JWT token for route access
    Sets g.current_user with the decoded token payload
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        
        if not token:
            return jsonify({
                'error': 'Authorization required',
                'message': 'Missing or invalid Authorization header'
            }), 401
        
        try:
            payload = decode_token(token)
            
            if payload.get('type') != 'access':
                return jsonify({
                    'error': 'Invalid token type',
                    'message': 'Please use an access token'
                }), 401
            
            # Store user info in Flask's g object for route access
            g.current_user = {
                'user_id': payload.get('user_id') or int(payload.get('sub')),
                'email': payload.get('email'),
                'role': payload.get('role'),
                'name': payload.get('name'),
                'department': payload.get('department')
            }
            
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                'error': 'Token expired',
                'message': 'Your session has expired. Please login again.'
            }), 401
        except jwt.InvalidTokenError as e:
            return jsonify({
                'error': 'Invalid token',
                'message': str(e)
            }), 401
    
    return decorated


def jwt_optional(f):
    """
    Decorator that optionally parses JWT token if present
    Does not require authentication, but sets g.current_user if token is valid
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = get_token_from_header()
        
        if token:
            try:
                payload = decode_token(token)
                if payload.get('type') == 'access':
                    g.current_user = {
                        'user_id': payload.get('sub'),
                        'email': payload.get('email'),
                        'role': payload.get('role'),
                        'name': payload.get('name'),
                        'department': payload.get('department')
                    }
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass
        
        if not hasattr(g, 'current_user'):
            g.current_user = None
            
        return f(*args, **kwargs)
    
    return decorated


def role_required(*allowed_roles):
    """
    Decorator to require specific roles for route access
    Must be used after @jwt_required
    
    Usage:
        @app.route('/admin')
        @jwt_required
        @role_required('admin')
        def admin_route():
            ...
            
        @app.route('/staff')
        @jwt_required
        @role_required('admin', 'faculty')
        def staff_route():
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Please login first'
                }), 401
            
            user_role = g.current_user.get('role')
            
            if user_role not in allowed_roles:
                return jsonify({
                    'error': 'Access denied',
                    'message': f'This endpoint requires one of the following roles: {", ".join(allowed_roles)}',
                    'your_role': user_role
                }), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator


def admin_required(f):
    """Shortcut decorator for admin-only routes"""
    return role_required('admin')(f)


def faculty_or_admin_required(f):
    """Shortcut decorator for faculty or admin routes"""
    return role_required('faculty', 'admin')(f)


def get_current_user():
    """Get the current authenticated user from Flask's g object"""
    return getattr(g, 'current_user', None)


def get_current_user_id():
    """Get the current authenticated user's ID"""
    user = get_current_user()
    return user.get('user_id') if user else None


def get_current_user_role():
    """Get the current authenticated user's role"""
    user = get_current_user()
    return user.get('role') if user else None
