from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path
import os
from cv_processor import CVProcessor
import json
from datetime import datetime, timedelta
from database import Database, Event, Person, PersonActivity, User
from energy_analyzer import EnergyAnalyzer
from jwt_auth import (
    create_access_token, create_refresh_token, decode_token,
    hash_password, verify_password,
    jwt_required, jwt_optional, role_required, admin_required,
    get_current_user, get_current_user_role
)
from blockchain import BlockchainManager
from flask import send_from_directory

app = Flask(__name__)

# Enable CORS for frontend integration
CORS(app, origins=[
    'http://localhost:5173',    # Vite dev server
    'http://localhost:8080',    # Alternative Vite port
    'http://localhost:3000',    # Alternative dev server
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:3000',
], supports_credentials=True)

# Configuration
UPLOAD_FOLDER = Path('uploads')
OUTPUT_FOLDER = Path('outputs')
MODELS_FOLDER = Path('models')
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

# Create folders if they don't exist
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)
MODELS_FOLDER.mkdir(exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Initialize CV processor and database lazily
cv_processor = None
db = None
energy_analyzer = None
blockchain_manager = None


def initialize_resources():
    """Ensure folders exist and initialize database and analytics."""
    global db, energy_analyzer, cv_processor, blockchain_manager

    # Ensure essential directories exist
    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
    MODELS_FOLDER.mkdir(parents=True, exist_ok=True)
    (OUTPUT_FOLDER / 'face_database').mkdir(parents=True, exist_ok=True)

    # Initialize database and analytics
    if db is None:
        db = Database()

    if energy_analyzer is None:
        energy_analyzer = EnergyAnalyzer()
        
    if blockchain_manager is None:
        blockchain_manager = BlockchainManager()

    # CV processor will be created on first use via get_cv_processor()

# Initialize on import
initialize_resources()

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_cv_processor():
    """Get or create CV processor instance with database enabled"""
    global cv_processor
    if cv_processor is None:
        cv_processor = CVProcessor(use_database=True, db_instance=db)
    return cv_processor


@app.teardown_appcontext
def shutdown_session(exception=None):
    """Ensure database sessions are closed after request"""
    if db:
        db.close()


@app.route('/')
def index():
    """API info endpoint"""
    return jsonify({
        'service': 'SCA CV Module API',
        'version': '2.0',
        'database': 'SQLite with SQLAlchemy',
        'endpoints': {
            'POST /upload': 'Upload a video file',
            'POST /process': 'Process an uploaded video',
            'GET /results/<filename>': 'Get processing results',
            'GET /status': 'Get API status',
            'GET /db/events': 'Get all events from database',
            'GET /db/events/<event_id>': 'Get specific event',
            'GET /db/persons': 'Get all persons',
            'GET /db/persons/<person_id>': 'Get specific person details',
            'GET /db/persons/<person_id>/events': 'Get events for a person',
            'GET /db/persons/<person_id>/activities': 'Get activities for a person',
            'GET /db/leaderboard': 'Get person leaderboard with scores',
            'GET /db/stats': 'Get database statistics',
            'GET /energy/report': 'Get energy usage report',
            'GET /energy/blockchain-credits': 'Get blockchain credits summary',
            'GET /energy/sustainable-actions': 'Get sustainable actions log',
            'GET /energy/live-metrics': 'Get real-time energy metrics'
        }
    })


@app.route('/status', methods=['GET'])
def status():
    """Get API status"""
    return jsonify({
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'uploads_count': len(list(UPLOAD_FOLDER.glob('*'))),
        'outputs_count': len(list(OUTPUT_FOLDER.glob('*.json')))
    })


@app.route('/contact', methods=['POST'])
def contact():
    """Submit a contact form inquiry"""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing form data'}), 400
    
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')
    
    if not name or not email or not message:
        return jsonify({'error': 'Name, email, and message are required'}), 400
    
    # In a real app, you would send an email or save to a database
    print(f"Contact Inquiry Received: From={name}, Email={email}")
    print(f"Message: {message[:100]}...")
    
    return jsonify({
        'success': True,
        'message': 'Signal received and cached by node admins.',
        'received_at': datetime.now().isoformat()
    })


@app.route('/auth/login', methods=['POST'])
def login():
    """Authenticate user and return JWT tokens with role-based access"""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing credentials'}), 400
    
    email = data.get('email')
    password = data.get('password')
    use_mock = data.get('use_mock', True)
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Look up user in database
    session = db.get_session()
    try:
        user = session.query(User).filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'User not found. Please register first.'}), 404
        
        # Verify password (supports both hashed and legacy plain-text)
        if not verify_password(password, user.password_hash):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user is active/suspended
        if not user.is_active:
            return jsonify({
                'error': 'Account Suspended',
                'message': 'Your account has been deactivated by an administrator.'
            }), 403
            
        # Update last login
        user.last_login = datetime.now()
        session.commit()
        
        # Generate JWT tokens
        access_token = create_access_token(
            user_id=user.user_id,
            email=user.email,
            role=user.role,
            name=user.name,
            department=user.department
        )
        refresh_token = create_refresh_token(
            user_id=user.user_id,
            email=user.email
        )
        
        return jsonify({
            'success': True,
            'message': f"Session initialized for {email}",
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': 86400,  # 24 hours in seconds
            'user': {
                'user_id': user.user_id,
                'email': user.email,
                'role': user.role,
                'name': user.name,
                'department': user.department,
                'node_id': f"SCA_NODE_{user.user_id}",
                'last_login': datetime.now().isoformat()
            },
            'environment': 'Simulated' if use_mock else 'Mainnet'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/auth/register', methods=['POST'])
def register():
    """Register a new user (student or faculty only - admin is auto-created)"""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing registration data'}), 400
    
    email = data.get('email')
    password = data.get('password')
    name = data.get('name', email.split('@')[0] if email else 'User')
    role = data.get('role', 'student')
    department = data.get('department', 'General')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    
    # Admin role cannot be self-registered
    if role == 'admin':
        return jsonify({'error': 'Admin accounts cannot be self-registered'}), 403
    
    if role not in ['student', 'faculty']:
        return jsonify({'error': 'Invalid role. Must be student or faculty'}), 400
    
    session = db.get_session()
    try:
        # Check if user already exists
        existing = session.query(User).filter_by(email=email).first()
        if existing:
            return jsonify({'error': 'User with this email already exists'}), 409
        
        # Hash the password before storing
        hashed_password = hash_password(password)
        
        # Create new user
        new_user = User(
            email=email,
            password_hash=hashed_password,
            name=name,
            role=role,
            department=department
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        # Generate tokens for immediate login after registration
        access_token = create_access_token(
            user_id=new_user.user_id,
            email=new_user.email,
            role=new_user.role,
            name=new_user.name,
            department=new_user.department
        )
        refresh_token = create_refresh_token(
            user_id=new_user.user_id,
            email=new_user.email
        )
        
        return jsonify({
            'success': True,
            'message': f'Registration successful for {name}',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'user': {
                'user_id': new_user.user_id,
                'email': new_user.email,
                'role': new_user.role,
                'name': new_user.name,
                'department': new_user.department
            }
        }), 201
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/auth/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token"""
    data = request.json
    if not data or 'refresh_token' not in data:
        return jsonify({'error': 'Refresh token required'}), 400
    
    try:
        payload = decode_token(data['refresh_token'])
        
        if payload.get('type') != 'refresh':
            return jsonify({'error': 'Invalid token type'}), 401
        
        # Get user to ensure they still exist and are active
        session = db.get_session()
        try:
            user_id = payload.get('user_id') or payload.get('sub')
            user = session.query(User).filter_by(user_id=int(user_id)).first()
            if not user or not user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
            
            # Generate new access token
            access_token = create_access_token(
                user_id=user.user_id,
                email=user.email,
                role=user.role,
                name=user.name,
                department=user.department
            )
            
            return jsonify({
                'success': True,
                'access_token': access_token,
                'token_type': 'Bearer',
                'expires_in': 86400
            })
        finally:
            session.close()
            
    except Exception as e:
        return jsonify({'error': 'Invalid refresh token', 'message': str(e)}), 401


@app.route('/auth/me', methods=['GET'])
@jwt_required
def get_current_user_info():
    """Get current authenticated user info"""
    user = get_current_user()
    return jsonify({
        'success': True,
        'user': user
    })


@app.route('/auth/users', methods=['GET'])
@jwt_required
@admin_required
def list_users():
    """List all users (admin only endpoint)"""
    session = db.get_session()
    try:
        users = session.query(User).all()
        return jsonify({
            'total': len(users),
            'users': [{
                'user_id': u.user_id,
                'email': u.email,
                'name': u.name,
                'role': u.role,
                'department': u.department,
                'is_active': u.is_active,
                'created_at': u.created_at.isoformat() if u.created_at else None,
                'last_login': u.last_login.isoformat() if u.last_login else None
            } for u in users]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/auth/users/<int:user_id>', methods=['PATCH'])
@jwt_required
@admin_required
def update_user(user_id):
    """Update user role or status (admin only)"""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing data'}), 400
        
    session = db.get_session()
    try:
        user = session.query(User).filter_by(user_id=user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        if 'role' in data:
            if data['role'] not in ['student', 'faculty', 'admin']:
                return jsonify({'error': 'Invalid role'}), 400
            user.role = data['role']
            
        if 'is_active' in data:
            user.is_active = bool(data['is_active'])
            
        session.commit()
        return jsonify({
            'success': True,
            'message': f'User {user_id} updated successfully',
            'user': user.to_dict()
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/upload', methods=['POST'])
@jwt_required
def upload_video():
    """
    Upload a video file
    
    Form data:
        file: Video file
        
    Returns:
        JSON with upload status and filename
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in request'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({
            'error': 'Invalid file type',
            'allowed_types': list(ALLOWED_EXTENSIONS)
        }), 400
    
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename_with_timestamp = f"{timestamp}_{filename}"
    filepath = UPLOAD_FOLDER / filename_with_timestamp
    
    try:
        file.save(str(filepath))
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': filename_with_timestamp,
            'path': str(filepath),
            'size_bytes': filepath.stat().st_size
        }), 201
    except Exception as e:
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@app.route('/process', methods=['POST'])
@jwt_required
def process_video():
    """
    Process an uploaded video
    
    JSON body:
        filename: Name of uploaded video file
        confidence: (optional) Confidence threshold (default: 0.5)
        
    Returns:
        JSON with processing results
    """
    data = request.get_json()
    
    if not data or 'filename' not in data:
        return jsonify({'error': 'filename required in request body'}), 400
    
    filename = data['filename']
    confidence = data.get('confidence', 0.5)
    
    # Validate confidence threshold
    try:
        confidence = float(confidence)
        if not 0 < confidence <= 1:
            raise ValueError()
    except:
        return jsonify({'error': 'confidence must be between 0 and 1'}), 400
    
    video_path = UPLOAD_FOLDER / filename
    
    if not video_path.exists():
        return jsonify({'error': f'Video file not found: {filename}'}), 404
    
    # Generate output filename
    output_filename = f"{video_path.stem}_detections.json"
    output_path = OUTPUT_FOLDER / output_filename
    
    try:
        processor = get_cv_processor()
        results = processor.process_video(
            video_path=str(video_path),
            output_json_path=str(output_path),
            confidence_threshold=confidence
        )
        
        # Add output file info to results
        results['output_file'] = output_filename
        results['download_url'] = f'/results/{output_filename}'
        
        return jsonify({
            'message': 'Processing complete',
            'results': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500


@app.route('/results/<filename>', methods=['GET'])
@jwt_required
def get_results(filename):
    """
    Get processing results JSON file
    
    Args:
        filename: Name of the results JSON file
        
    Returns:
        JSON file or JSON data
    """
    output_path = OUTPUT_FOLDER / filename
    
    if not output_path.exists():
        return jsonify({'error': f'Results file not found: {filename}'}), 404
    
    # Check if user wants to download or view
    download = request.args.get('download', 'false').lower() == 'true'
    
    if download:
        return send_file(str(output_path), as_attachment=True)
    else:
        with open(output_path, 'r') as f:
            data = json.load(f)
        return jsonify(data)


@app.route('/list/uploads', methods=['GET'])
@jwt_required
def list_uploads():
    """List all uploaded video files"""
    files = []
    for filepath in UPLOAD_FOLDER.glob('*'):
        if filepath.is_file():
            files.append({
                'filename': filepath.name,
                'size_bytes': filepath.stat().st_size,
                'uploaded_at': datetime.fromtimestamp(filepath.stat().st_mtime).isoformat()
            })
    
    return jsonify({
        'count': len(files),
        'files': sorted(files, key=lambda x: x['uploaded_at'], reverse=True)
    })


@app.route('/list/results', methods=['GET'])
@jwt_required
def list_results():
    """List all processing results"""
    files = []
    for filepath in OUTPUT_FOLDER.glob('*.json'):
        if filepath.is_file():
            files.append({
                'filename': filepath.name,
                'size_bytes': filepath.stat().st_size,
                'created_at': datetime.fromtimestamp(filepath.stat().st_mtime).isoformat()
            })
    
    return jsonify({
        'count': len(files),
        'files': sorted(files, key=lambda x: x['created_at'], reverse=True)
    })


@app.route('/summary/<filename>', methods=['GET'])
def get_summary(filename):
    """
    Get detection summary for a results file
    
    Args:
        filename: Name of the results JSON file
        
    Returns:
        Summary statistics
    """
    output_path = OUTPUT_FOLDER / filename
    
    if not output_path.exists():
        return jsonify({'error': f'Results file not found: {filename}'}), 404
    
    with open(output_path, 'r') as f:
        data = json.load(f)
    
    # Calculate class distribution
    class_counts = {}
    for event in data.get('events', []):
        class_name = event['class']
        class_counts[class_name] = class_counts.get(class_name, 0) + 1
    
    summary = {
        'video_file': data.get('video_file'),
        'total_detections': data.get('total_detections', 0),
        'duration_seconds': data.get('duration_seconds', 0),
        'class_distribution': class_counts,
        'processed_at': data.get('processed_at')
    }
    
    return jsonify(summary)


# ============================================================
# DATABASE ENDPOINTS
# ============================================================

@app.route('/db/events', methods=['GET'])
@jwt_required
def get_db_events():
    """Get all events from database with pagination"""
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    person_id = request.args.get('person_id', None)
    status = request.args.get('status', None)
    action = request.args.get('action', None)
    room_id = request.args.get('room_id', None)
    search = request.args.get('search', None)
    
    session = db.get_session()
    try:
        query = session.query(Event)
        
        if person_id:
            query = query.filter(Event.person_id == person_id)
        if status:
            query = query.filter(Event.status == status)
        if action:
            query = query.filter(Event.action_detected == action)
        if room_id:
            query = query.filter(Event.room_id == room_id)
        if search:
            search_query = f"%{search}%"
            query = query.filter(
                (Event.action_detected.ilike(search_query)) | 
                (Event.room_id.ilike(search_query)) |
                (Event.department.ilike(search_query))
            )
        
        query = query.order_by(Event.timestamp.desc())
        
        total = query.count()
        events = query.offset(offset).limit(limit).all()
        
        # Expunge objects to prevent DetachedInstanceError
        for event in events:
            session.expunge(event)
        
        return jsonify({
            'total': total,
            'limit': limit,
            'offset': offset,
            'events': [event.to_dict() for event in events]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/db/events/<int:event_id>', methods=['GET'])
def get_db_event(event_id):
    """Get specific event by ID"""
    session = db.get_session()
    try:
        event = session.query(Event).filter_by(event_id=event_id).first()
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        # Expunge to prevent DetachedInstanceError
        session.expunge(event)
        return jsonify(event.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/db/events/<int:event_id>/status', methods=['POST'])
@jwt_required
@role_required('admin', 'faculty')
def update_event_status(event_id):
    """Update event verification status"""
    data = request.get_json()
    if not data or 'status' not in data:
        return jsonify({'error': 'status required'}), 400
    
    new_status = data['status']
    if new_status not in ['pending', 'verified', 'rejected']:
        return jsonify({'error': 'invalid status'}), 400
        
    session = db.get_session()
    try:
        event = session.query(Event).filter_by(event_id=event_id).first()
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        event.status = new_status
        session.commit()
        session.refresh(event)
        session.expunge(event)
        return jsonify(event.to_dict())
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/db/events/bulk-verify', methods=['POST'])
@jwt_required
@admin_required
def bulk_verify_events():
    """Bulk verify pending events with high confidence"""
    data = request.json or {}
    threshold = data.get('confidence_threshold', 0.8)
    
    session = db.get_session()
    try:
        updated = session.query(Event).filter(
            Event.status == 'pending',
            Event.confidence >= threshold
        ).update({"status": "verified"}, synchronize_session=False)
        
        session.commit()
        return jsonify({
            'success': True,
            'message': f'Successfully verified {updated} high-confidence events',
            'updated_count': updated
        })
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/outputs/<path:filename>')
def serve_output(filename):
    """Serve output files (processed images, etc)"""
    return send_from_directory(OUTPUT_FOLDER, filename)


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded video files for auditing"""
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route('/db/events/export', methods=['GET'])
@jwt_required
@admin_required
def export_events():
    """Export verified events as CSV"""
    session = db.get_session()
    try:
        events = session.query(Event).filter_by(status='verified').all()
        
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            'Event ID', 'Timestamp', 'Room', 'Department', 
            'Action', 'Action Type', 'Confidence', 
            'Energy Saved', 'Credits'
        ])
        
        # Data
        for e in events:
            writer.writerow([
                e.event_id, e.timestamp, e.room_id, e.department,
                e.action_detected, e.action_type, e.confidence,
                e.energy_saved_estimate, e.blockchain_credits
            ])
            
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'sca_audit_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/db/persons', methods=['GET'])
@jwt_required
def get_db_persons():
    """Get all persons from database"""
    try:
        persons = db.get_all_persons()
        
        persons_data = []
        for person in persons:
            persons_data.append({
                'person_id': person.person_id,
                'student_id': person.student_id,
                'department': person.department,
                'user_type': person.user_type,
                'total_credits_earned': person.total_credits_earned,
                'first_seen': person.first_seen.isoformat() if person.first_seen else None,
                'last_seen': person.last_seen.isoformat() if person.last_seen else None,
                'total_detections': person.total_detections,
                'detection_method': person.detection_method,
                'face_image_path': person.face_image_path
            })
        
        return jsonify({
            'total': len(persons_data),
            'persons': persons_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/db/persons/<person_id>', methods=['GET'])
def get_db_person(person_id):
    """Get specific person details"""
    session = db.get_session()
    try:
        person = session.query(Person).filter_by(person_id=person_id).first()
        
        if not person:
            return jsonify({'error': 'Person not found'}), 404
        
        # Get score
        score = db.get_person_score(person_id)
        
        # Expunge to prevent DetachedInstanceError
        session.expunge(person)
        
        return jsonify({
            'person_id': person.person_id,
            'first_seen': person.first_seen.isoformat() if person.first_seen else None,
            'last_seen': person.last_seen.isoformat() if person.last_seen else None,
            'total_detections': person.total_detections,
            'detection_method': person.detection_method,
            'face_image_path': person.face_image_path,
            'total_score': score
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/db/persons/<person_id>/events', methods=['GET'])
def get_person_db_events(person_id):
    """Get all events for a specific person"""
    try:
        events = db.get_person_events(person_id)
        
        return jsonify({
            'person_id': person_id,
            'total_events': len(events),
            'events': [event.to_dict() for event in events]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/db/persons/<person_id>/activities', methods=['GET'])
def get_person_activities(person_id):
    """Get all activities for a specific person"""
    session = db.get_session()
    try:
        activities = session.query(PersonActivity).filter_by(person_id=person_id).order_by(PersonActivity.timestamp.desc()).all()
        
        # Expunge objects to prevent DetachedInstanceError
        for activity in activities:
            session.expunge(activity)
        
        return jsonify({
            'person_id': person_id,
            'total_activities': len(activities),
            'activities': [activity.to_dict() for activity in activities]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/db/leaderboard', methods=['GET'])
def get_db_leaderboard():
    """Get person leaderboard with scores"""
    try:
        leaderboard = db.get_leaderboard()
        
        return jsonify({
            'total_persons': len(leaderboard),
            'leaderboard': leaderboard
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/db/transfer', methods=['POST'])
@jwt_required
def db_transfer_credits():
    """Transfer credits between persons or withdraw to external node"""
    data = request.json
    if not data or 'sender_id' not in data or 'amount' not in data or 'recipient_id' not in data:
        return jsonify({'error': 'Missing required fields: sender_id, amount, recipient_id'}), 400
    
    sender_id = data['sender_id']
    recipient_id = data['recipient_id']
    amount = int(data['amount'])
    
    if amount <= 0:
        return jsonify({'error': 'Amount must be positive'}), 400
    
    session = db.get_session()
    try:
        # Check sender balance
        sender_score = db.get_person_score(sender_id)
        if sender_score < amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # 1. Debit from sender
        db.add_activity(
            sender_id, 
            'transfer_debit', 
            {'to': recipient_id, 'amount': amount}, 
            incentive_points=-amount, 
            incentive_reason=f'Asset transfer to {recipient_id}'
        )
        
        # 2. Credit to recipient (if they exist in our system)
        recipient = session.query(Person).filter_by(person_id=recipient_id).first()
        if recipient:
            db.add_activity(
                recipient_id, 
                'transfer_credit', 
                {'from': sender_id, 'amount': amount}, 
                incentive_points=amount, 
                incentive_reason=f'Asset received from {sender_id}'
            )
            recipient_received = True
        else:
            recipient_received = False
            
        return jsonify({
            'success': True,
            'transaction_hash': f"tx_{int(datetime.now().timestamp())}_{sender_id[:4]}",
            'amount': amount,
            'recipient_received': recipient_received,
            'message': f"Successfully transferred {amount} XP to {recipient_id}"
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/db/stats', methods=['GET'])
@jwt_optional
def get_db_stats():
    """Get database statistics - optimized with selective column loading"""
    session = db.get_session()
    try:
        # Use count() instead of loading all objects
        total_persons = session.query(Person).count()
        total_events = session.query(Event).count()
        total_activities = session.query(PersonActivity).count()
        
        # Recent activity - load only necessary columns
        recent_events = session.query(Event).order_by(Event.timestamp.desc()).limit(5).all()
        
        # Expunge objects to prevent DetachedInstanceError
        for event in recent_events:
            session.expunge(event)
        
        return jsonify({
            'total_persons': total_persons,
            'total_events': total_events,
            'total_activities': total_activities,
            'recent_events': [event.to_dict() for event in recent_events]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/db/admin-stats', methods=['GET'])
@jwt_required
@admin_required
def get_admin_stats_endpoint():
    """Get statistics for the Admin dashboard"""
    try:
        stats = db.get_admin_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================
# ENERGY ANALYTICS ENDPOINTS
# ============================================================

@app.route('/energy/report', methods=['GET'])
@jwt_required
def get_energy_report():
    """
    Get comprehensive energy usage report
    
    Query params:
        hours: Time period in hours (default: 24)
        room_id: Filter by room (optional)
    """
    session = db.get_session()
    try:
        hours = request.args.get('hours', 24, type=int)
        room_id = request.args.get('room_id', None)
        
        from database import Event
        
        # Get events from specified time period
        time_threshold = datetime.now() - timedelta(hours=hours)
        query = session.query(Event).filter(Event.timestamp >= time_threshold)
        
        if room_id:
            query = query.filter_by(room_id=room_id)
        
        events = query.all()
        
        # Expunge objects to prevent DetachedInstanceError
        for event in events:
            session.expunge(event)
        
        # Convert to dict for analysis
        event_dicts = [e.to_dict() for e in events]
        
        # Generate report
        report = energy_analyzer.generate_energy_report(event_dicts, time_period_hours=hours)
        
        # Add room-specific data
        report['room_id'] = room_id or 'ALL'
        report['events_analyzed'] = len(events)
        
        return jsonify(report)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/energy/blockchain-credits', methods=['GET'])
@jwt_required
def get_blockchain_credits():
    """
    Get blockchain credits summary
    
    Query params:
        person_id: Filter by person (optional)
        hours: Time period in hours (default: 24)
    """
    session = db.get_session()
    try:
        person_id = request.args.get('person_id', None)
        hours = request.args.get('hours', 24, type=int)
        
        from database import Event
        from sqlalchemy import func
        
        time_threshold = datetime.now() - timedelta(hours=hours)
        query = session.query(Event).filter(Event.timestamp >= time_threshold)
        
        if person_id:
            query = query.filter_by(person_id=person_id)
        
        # Calculate totals
        total_credits = session.query(func.sum(Event.blockchain_credits)).filter(
            Event.timestamp >= time_threshold
        ).scalar() or 0
        
        total_energy_saved = session.query(func.sum(Event.energy_saved_estimate)).filter(
            Event.timestamp >= time_threshold
        ).scalar() or 0
        
        # Get top earners
        top_earners = session.query(
            Event.person_id,
            func.sum(Event.blockchain_credits).label('total_credits'),
            func.count(Event.event_id).label('action_count')
        ).filter(
            Event.timestamp >= time_threshold,
            Event.person_id.isnot(None)
        ).group_by(Event.person_id).order_by(
            func.sum(Event.blockchain_credits).desc()
        ).limit(10).all()
        
        top_earners_list = [
            {
                'person_id': earner[0],
                'total_credits': float(earner[1] or 0),
                'action_count': earner[2]
            }
            for earner in top_earners
        ]
        
        result = {
            'time_period_hours': hours,
            'total_blockchain_credits': round(float(total_credits), 2),
            'total_energy_saved_watts': round(float(total_energy_saved), 2),
            'credits_per_kwh': energy_analyzer.CREDIT_RATE_PER_KWH,
            'top_earners': top_earners_list,
            'projected_annual_value': round(float(total_credits) * (8760 / hours), 2)
        }
        
        if person_id:
            result['person_id'] = person_id
            
            # Fetch actual balance from Person table
            person = session.query(Person).filter_by(person_id=person_id).first()
            if person:
                result['total_blockchain_credits'] = round(person.total_credits_earned, 2)
            else:
                # If no person record exists yet, the events query above handles the sum
                # but we should ensure a record is created for future transfers
                result['total_blockchain_credits'] = round(float(total_credits), 2)
                
            # Fetch recent activity for this person
            from database import PersonActivity
            activities = session.query(PersonActivity).filter_by(person_id=person_id).order_by(PersonActivity.timestamp.desc()).limit(20).all()
            result['recent_history'] = [a.to_dict() for a in activities]
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/energy/transfer', methods=['POST'])
@jwt_required
def transfer_credits():
    """Transfer credits between persons"""
    data = request.json
    if not data:
        return jsonify({'error': 'Missing data'}), 400
        
    sender_id = data.get('sender_id')
    recipient_id = data.get('recipient_id')
    amount = data.get('amount')
    
    if not all([sender_id, recipient_id, amount]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'error': 'Amount must be positive'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid amount'}), 400
        
    session = db.get_session()
    try:
        # Get or create sender/recipient in Person table
        sender = session.query(Person).filter_by(person_id=sender_id).first()
        if not sender:
            # Check if sender has earned any credits from events if no Person record exists
            total_earned = session.query(func.sum(Event.blockchain_credits)).filter_by(person_id=sender_id).scalar() or 0
            sender = Person(person_id=sender_id, total_credits_earned=total_earned)
            session.add(sender)
            session.flush()
            
        if sender.total_credits_earned < amount:
            return jsonify({'error': 'Insufficient balance'}), 400
            
        recipient = session.query(Person).filter_by(person_id=recipient_id).first()
        if not recipient:
            # Check if recipient exists in User table to validate ID
            user_exists = session.query(User).filter_by(email=recipient_id).first()
            recipient = Person(person_id=recipient_id, total_credits_earned=0)
            session.add(recipient)
            session.flush()
            
        # Perform transfer
        sender.total_credits_earned -= amount
        recipient.total_credits_earned += amount
        
        # Record activities
        from database import PersonActivity
        
        # Debit log
        debit = PersonActivity(
            person_id=sender_id,
            activity_type='disbursement',
            incentive_points=-int(amount),
            incentive_reason=f'Transfer to {recipient_id}',
            details={'recipient': recipient_id, 'tx_type': 'out'}
        )
        
        # Credit log
        credit = PersonActivity(
            person_id=recipient_id,
            activity_type='transfer_receipt',
            incentive_points=int(amount),
            incentive_reason=f'Transfer from {sender_id}',
            details={'sender': sender_id, 'tx_type': 'in'}
        )
        
        session.add(debit)
        session.add(credit)
        session.commit()
        
        # 🔗 Attempt Actual Blockchain Transfer if wallets are linked
        blockchain_tx = None
        if blockchain_manager and sender.wallet_address and recipient.wallet_address:
            blockchain_tx = blockchain_manager.transfer_credits(
                to_address=recipient.wallet_address,
                amount=amount
            )
        
        # Generate a pseudo-hash for the UI if blockchain failed or not present
        import hashlib
        tx_hash = blockchain_tx if blockchain_tx else hashlib.sha256(f"{sender_id}{recipient_id}{amount}{datetime.now()}".encode()).hexdigest()
        
        return jsonify({
            'success': True,
            'message': 'Transfer successful',
            'transaction_hash': f"0x{tx_hash if blockchain_tx else tx_hash[:40]}",
            'blockchain_verified': bool(blockchain_tx),
            'amount': amount
        })
        
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/energy/report', methods=['GET'])
@jwt_required
def get_energy_report():
    """Get comprehensive energy and sustainability report"""
    session = db.get_session()
    try:
        hours = request.args.get('hours', 24, type=int)
        start_time = datetime.now() - timedelta(hours=hours)
        
        # Get events in the time period
        events = session.query(Event).filter(Event.timestamp >= start_time).all()
        
        # Generate summary using EnergyAnalyzer
        event_dicts = [e.to_dict() for e in events]
        report = energy_analyzer.generate_energy_report(event_dicts, time_period_hours=hours)
        
        # Add department-wise breakdown
        from sqlalchemy import func
        dept_stats = session.query(
            Event.department,
            func.count(Event.event_id).label('total'),
            func.sum(Event.blockchain_credits).label('credits'),
            func.sum(Event.energy_saved_estimate).label('energy')
        ).filter(Event.timestamp >= start_time).group_by(Event.department).all()
        
        report['department_breakdown'] = {
            row.department or 'Unknown': {
                'events': row.total,
                'credits': round(float(row.credits or 0), 2),
                'energy_saved': round(float(row.energy or 0), 2)
            } for row in dept_stats
        }
        
        return jsonify({
            'success': True,
            'report': report
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/process/realtime', methods=['POST'])
@jwt_required
def process_realtime():
    """Start real-time inference from default video source (Webcam)"""
    data = request.json or {}
    room_id = data.get('room_id', 'CS_LAB_101')
    duration = data.get('duration_seconds', 30) # Capture for 30s by default
    
    try:
        # Initialize processor for this specific room
        processor = CVProcessor(use_database=True, db_instance=db, room_id=room_id)
        
        # In a real production app, this would be a background task
        # For this module, we run it and return the results
        results = processor.process_video(
            mode='realtime',
            confidence_threshold=data.get('confidence', 0.5),
            duration_seconds=duration
        )
        
        return jsonify({
            'success': True,
            'message': f'Inference complete for room {room_id}',
            'results': results
        })
    except Exception as e:
        return jsonify({'error': f'Real-time inference failed: {str(e)}'}), 500


@app.route('/energy/sustainable-actions', methods=['GET'])
@jwt_required
def get_sustainable_actions():
    """
    Get log of sustainable and unsustainable actions
    
    Query params:
        action_type: Filter by 'sustainable' or 'unsustainable' (optional)
        limit: Number of results (default: 50)
    """
    session = db.get_session()
    try:
        action_type = request.args.get('action_type', None)
        limit = request.args.get('limit', 50, type=int)
        
        from database import Event
        
        query = session.query(Event).filter(Event.action_type.isnot(None))
        
        if action_type:
            query = query.filter_by(action_type=action_type)
        
        actions = query.order_by(Event.timestamp.desc()).limit(limit).all()
        
        # Expunge objects to prevent DetachedInstanceError
        for action in actions:
            session.expunge(action)
        
        actions_data = []
        for action in actions:
            actions_data.append({
                'event_id': action.event_id,
                'timestamp': action.timestamp.isoformat(),
                'person_id': action.person_id,
                'room_id': action.room_id,
                'action_type': action.action_type,
                'action_detected': action.action_detected,
                'energy_saved_estimate': action.energy_saved_estimate,
                'blockchain_credits': action.blockchain_credits,
                'devices_on_count': len(json.loads(action.devices_on) if isinstance(action.devices_on, str) else action.devices_on or []),
                'devices_off_count': len(json.loads(action.devices_off) if isinstance(action.devices_off, str) else action.devices_off or [])
            })
        
        # Calculate summary
        sustainable_count = len([a for a in actions_data if a['action_type'] == 'sustainable'])
        unsustainable_count = len([a for a in actions_data if a['action_type'] == 'unsustainable'])
        
        return jsonify({
            'total_actions': len(actions_data),
            'sustainable_actions': sustainable_count,
            'unsustainable_actions': unsustainable_count,
            'filter_applied': action_type,
            'actions': actions_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@app.route('/energy/live-metrics', methods=['GET'])
@jwt_required
def get_live_metrics():
    """Get real-time energy metrics from most recent events"""
    session = db.get_session()
    try:
        from database import Event
        
        # Get most recent event
        latest_event = session.query(Event).order_by(Event.timestamp.desc()).first()
        
        if not latest_event:
            return jsonify({'error': 'No events found'}), 404
        
        # Get events from last 5 minutes for trending
        five_min_ago = datetime.now() - timedelta(minutes=5)
        recent_events = session.query(Event).filter(
            Event.timestamp >= five_min_ago
        ).all()
        
        # Expunge objects to prevent DetachedInstanceError
        session.expunge(latest_event)
        for event in recent_events:
            session.expunge(event)
        
        # Calculate metrics
        total_credits_5min = sum([e.blockchain_credits or 0 for e in recent_events])
        total_energy_5min = sum([e.energy_saved_estimate or 0 for e in recent_events])
        
        devices_on = json.loads(latest_event.devices_on) if isinstance(latest_event.devices_on, str) else latest_event.devices_on or []
        devices_off = json.loads(latest_event.devices_off) if isinstance(latest_event.devices_off, str) else latest_event.devices_off or []
        
        return jsonify({
            'current_time': datetime.now().isoformat(),
            'latest_event': {
                'timestamp': latest_event.timestamp.isoformat(),
                'room_id': latest_event.room_id,
                'occupancy': latest_event.occupancy,
                'person_count': latest_event.person_count,
                'devices_on_count': len(devices_on),
                'devices_off_count': len(devices_off),
                'lights_on': latest_event.lights_on,
                'action_type': latest_event.action_type,
                'blockchain_credits': latest_event.blockchain_credits
            },
            'last_5_minutes': {
                'total_events': len(recent_events),
                'total_credits_earned': round(total_credits_5min, 2),
                'total_energy_saved_watts': round(total_energy_5min, 2)
            },
            'device_power_reference': energy_analyzer.DEVICE_POWER,
            'credit_rate_per_kwh': energy_analyzer.CREDIT_RATE_PER_KWH
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


if __name__ == '__main__':
    print("=" * 50)
    print("SCA CV Module API Server")
    print("=" * 50)
    print(f"Upload folder: {UPLOAD_FOLDER.absolute()}")
    print(f"Output folder: {OUTPUT_FOLDER.absolute()}")
    print(f"Models folder: {MODELS_FOLDER.absolute()}")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
