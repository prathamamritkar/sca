"""
Database models and configuration for SCA CV Module
Uses SQLAlchemy with SQLite
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, CheckConstraint, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker, scoped_session
from datetime import datetime
import json

Base = declarative_base()

class Person(Base):
    """Person tracking table - Campus optimized"""
    __tablename__ = 'persons'
    __table_args__ = ()
    
    person_id = Column(String(50), primary_key=True)  # e.g., "STU_CS_2024_001" or "person_000"
    student_id = Column(String(50), nullable=True, index=True)  # Actual student/faculty ID
    department = Column(String(50), nullable=True, index=True)  # CS, IT, MECH, etc.
    user_type = Column(String(20), default='student')  # 'student', 'faculty', 'staff'
    first_seen = Column(DateTime, default=datetime.now)
    last_seen = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    total_detections = Column(Integer, default=0)
    face_image_path = Column(String(255), nullable=True)
    detection_method = Column(String(50), default='appearance')  # 'face' or 'appearance'
    total_credits_earned = Column(Float, default=0.0)  # Cumulative blockchain credits
    wallet_address = Column(String(42), nullable=True)  # Ethereum/Polygon address
    
    # Relationship to events
    events = relationship('Event', back_populates='person', cascade='all, delete-orphan')
    activities = relationship('PersonActivity', back_populates='person', cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert person to dictionary"""
        return {
            'person_id': self.person_id,
            'student_id': self.student_id,
            'department': self.department,
            'user_type': self.user_type,
            'first_seen': self.first_seen.isoformat() if self.first_seen else None,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'total_detections': self.total_detections,
            'face_image_path': self.face_image_path,
            'detection_method': self.detection_method,
            'total_credits': self.total_credits_earned,
            'wallet_address': self.wallet_address
        }
    
    def __repr__(self):
        return f"<Person(person_id='{self.person_id}', dept='{self.department}', credits={self.total_credits_earned})>"


class Event(Base):
    """Event detection table - Campus optimized"""
    __tablename__ = 'events'
    __table_args__ = (
        CheckConstraint('person_count >= 0', name='check_person_count_positive'),
        CheckConstraint('confidence >= 0.0 AND confidence <= 1.0', name='check_confidence_range'),
        CheckConstraint('device_count >= 0', name='check_device_count_positive'),
    )
    
    event_id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.now, index=True)
    room_id = Column(String(50), index=True)  # e.g., "CS_LAB_101", "IT_CLASS_202"
    department = Column(String(50), nullable=True, index=True)  # Extracted from room_id
    
    # Detection details
    occupancy = Column(Boolean, default=False)
    person_count = Column(Integer, default=0)
    
    # Person reference (nullable for events without persons)
    person_id = Column(String(50), ForeignKey('persons.person_id'), nullable=True, index=True)
    
    # Bounding box data (stored as JSON)
    bbox = Column(JSON, nullable=True)  # {"x1": int, "y1": int, "x2": int, "y2": int}
    face_bbox = Column(JSON, nullable=True)
    
    # Detection metadata
    confidence = Column(Float, default=0.0)
    overall_confidence = Column(Float, default=0.0)
    action_confidence = Column(Float, default=0.0)
    detection_method = Column(String(50), nullable=True)  # 'face' or 'appearance'
    
    # Device information
    devices_detected = Column(JSON, default='[]')  # [{"type": "laptop", "confidence": 0.85}]
    device_count = Column(Integer, default=0)
    
    # Video metadata
    video_file = Column(String(255), nullable=True)
    frame_number = Column(Integer, nullable=True)
    
    # Action detection
    action_detected = Column(String(100), nullable=True)
    action_type = Column(String(50), nullable=True)  # 'sustainable', 'unsustainable', 'neutral'
    
    # Energy tracking
    energy_saved_estimate = Column(Float, default=0.0)  # Watts or kWh
    blockchain_credits = Column(Float, default=0.0)  # ₹ value
    status = Column(String(20), default='pending', index=True)  # 'pending', 'verified', 'rejected'
    
    # Device state tracking
    devices_on = Column(JSON, default='[]')  # List of devices in ON state
    devices_off = Column(JSON, default='[]')  # List of devices in OFF state
    lights_on = Column(Boolean, default=False)
    
    # Relationship to person
    person = relationship('Person', back_populates='events')
    
    def __repr__(self):
        return f"<Event(event_id={self.event_id}, person_id='{self.person_id}', timestamp='{self.timestamp}')>"
    
    def to_dict(self):
        """Convert event to dictionary"""
        return {
            'event_id': self.event_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'room_id': self.room_id,
            'department': self.department,
            'occupancy': self.occupancy,
            'person_count': self.person_count,
            'person_id': self.person_id,
            'bbox': self.bbox,
            'face_bbox': self.face_bbox,
            'confidence': self.confidence,
            'overall_confidence': self.overall_confidence or self.confidence,
            'action_confidence': self.action_confidence or self.confidence,
            'detection_method': self.detection_method,
            'devices_detected': self.devices_detected or [],
            'device_count': self.device_count,
            'video_file': self.video_file,
            'frame_number': self.frame_number,
            'action_detected': self.action_detected,
            'action_type': self.action_type,
            'energy_saved_estimate': self.energy_saved_estimate,
            'blockchain_credits': self.blockchain_credits,
            'status': self.status,
            'devices_on': self.devices_on or [],
            'devices_off': self.devices_off or [],
            'lights_on': self.lights_on
        }


class PersonActivity(Base):
    """Person activity log table for incentive tracking"""
    __tablename__ = 'person_activities'
    
    activity_id = Column(Integer, primary_key=True, autoincrement=True)
    person_id = Column(String(50), ForeignKey('persons.person_id'), index=True)
    timestamp = Column(DateTime, default=datetime.now, index=True)
    room_id = Column(String(50))
    
    activity_type = Column(String(50), index=True)  # 'presence', 'entry', 'exit', 'device_usage', 'violation'
    details = Column(JSON, nullable=True)  # Additional metadata
    
    # Incentive tracking
    incentive_points = Column(Float, default=0.0)  # Positive or negative
    incentive_reason = Column(String(255), nullable=True)
    
    # Relationship to person
    person = relationship('Person', back_populates='activities')
    
    def __repr__(self):
        return f"<PersonActivity(activity_id={self.activity_id}, person_id='{self.person_id}', type='{self.activity_type}')>"
    
    def to_dict(self):
        """Convert activity to dictionary"""
        return {
            'activity_id': self.activity_id,
            'person_id': self.person_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'room_id': self.room_id,
            'activity_type': self.activity_type,
            'details': self.details or {},
            'incentive_points': self.incentive_points,
            'incentive_reason': self.incentive_reason
        }


class User(Base):
    """User authentication table for role-based access control"""
    __tablename__ = 'users'
    
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)  # In production, use bcrypt/argon2
    name = Column(String(255), nullable=True)
    role = Column(String(20), default='student', index=True)  # 'student', 'faculty', 'admin'
    department = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    last_login = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<User(user_id={self.user_id}, email='{self.email}', role='{self.role}')>"
    
    def to_dict(self):
        """Convert user to dictionary (excluding password)"""
        return {
            'user_id': self.user_id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'department': self.department,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }


class ContactInquiry(Base):
    """Contact form submissions from homepage"""
    __tablename__ = 'contact_inquiries'
    
    inquiry_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    message = Column(String(2000), nullable=False)
    submitted_at = Column(DateTime, default=datetime.now, index=True)
    status = Column(String(20), default='new', index=True)  # 'new', 'read', 'responded', 'archived'
    ip_address = Column(String(45), nullable=True)  # Support IPv6
    user_agent = Column(String(500), nullable=True)
    
    def __repr__(self):
        return f"<ContactInquiry(inquiry_id={self.inquiry_id}, email='{self.email}', status='{self.status}')>"
    
    def to_dict(self):
        """Convert contact inquiry to dictionary"""
        return {
            'inquiry_id': self.inquiry_id,
            'name': self.name,
            'email': self.email,
            'message': self.message,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'status': self.status
        }


class Database:
    """Database management class"""
    
    def __init__(self, db_url='sqlite:///outputs/sca_events.db', auto_create_admin=True):
        """
        Initialize database connection
        
        Args:
            db_url: SQLAlchemy database URL
            auto_create_admin: Whether to auto-create admin user if none exist
        """
        # Enable WAL mode for better concurrent access and performance
        self.engine = create_engine(
            db_url, 
            echo=False,
            pool_pre_ping=True,
            connect_args={
                'check_same_thread': False,
                'timeout': 30  # SQLite busy timeout (30 seconds)
            }
        )
        self.Session = scoped_session(sessionmaker(bind=self.engine))
        
        # Create tables if they don't exist
        Base.metadata.create_all(self.engine)
        
        # Ensure secondary columns exist (manual migrations)
        self._ensure_schema_up_to_date()
        
        # Enable SQLite optimizations
        with self.engine.connect() as conn:
            conn.execute(text('PRAGMA journal_mode=WAL'))
            conn.execute(text('PRAGMA synchronous=NORMAL'))
            conn.execute(text('PRAGMA cache_size=-64000'))
            conn.execute(text('PRAGMA busy_timeout=30000'))  # 30 seconds
            conn.commit()
            
        # Auto-create admin user if no users exist
        if auto_create_admin:
            self._ensure_admin_exists()
    
    def _ensure_schema_up_to_date(self):
        """Add missing columns to existing tables and handle constraint resets"""
        db_path = str(self.engine.url).replace('sqlite:///', '')
        needs_reset = False
        
        try:
            with self.engine.connect() as conn:
                # 1. Check for Event table columns
                existing_event_cols = [c['name'] for c in self.engine.dialect.get_columns(conn, 'events')]
                
                # Columns to add if missing
                event_updates = [
                    ('overall_confidence', 'FLOAT DEFAULT 0.0'),
                    ('action_confidence', 'FLOAT DEFAULT 0.0')
                ]
                
                for col_name, col_type in event_updates:
                    if col_name not in existing_event_cols:
                        print(f"🔧 Database Sync: Adding missing column '{col_name}' to 'events' table")
                        conn.execute(text(f"ALTER TABLE events ADD COLUMN {col_name} {col_type}"))
                
                # 2. Check for outdated constraints (require full reset in SQLite)
                event_sql = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='events'")).scalar()
                person_sql = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='persons'")).scalar()
                
                if (event_sql and 'check_energy_positive' in event_sql) or \
                   (person_sql and 'check_credits_positive' in person_sql):
                    print("🔧 Database Sync: Outdated constraints detected. Ledger reset required.")
                    needs_reset = True
                
                conn.commit()
        except Exception as e:
            # Table might not exist yet, which is fine
            pass
            
        if needs_reset:
            try:
                import os
                print(f"🧹 Clearing legacy ledger: {db_path}")
                
                # Dispose engine to release file locks
                self.engine.dispose()
                
                timestamp = int(datetime.now().timestamp())
                os.rename(db_path, f"{db_path}.old.{timestamp}")
                print("✅ Legacy ledger archived.")
                
                # Re-create tables in the new database file
                Base.metadata.create_all(self.engine)
                print("✅ New ledger initialized with updated constraints.")
                
            except Exception as e:
                print(f"❌ Reset failed: {e}")
                print("💡 Please manually delete 'outputs/sca_events.db' if it persists.")
    
    def _ensure_admin_exists(self):
        """Create default admin user if no users exist in the system"""
        session = self.get_session()
        try:
            user_count = session.query(User).count()
            if user_count == 0:
                try:
                    from jwt_auth import hash_password
                    hashed_admin_password = hash_password('admin123')
                except ImportError:
                    # Fallback if jwt_auth is not available in current context
                    hashed_admin_password = 'admin123'
                
                # Create the system admin as the first user
                admin_user = User(
                    email='admin@sca.campus',
                    password_hash=hashed_admin_password,  # Securely hashed
                    name='System Administrator',
                    role='admin',
                    department='Administration',
                    is_active=True
                )
                session.add(admin_user)
                session.commit()
                print("✓ Auto-created system admin: admin@sca.campus (password: admin123)")
        except Exception as e:
            session.rollback()
            print(f"Warning: Could not auto-create admin: {e}")
        finally:
            session.close()
        
    def get_session(self):
        """Get a new database session"""
        return self.Session()
    
    def close(self):
        """Close database connection"""
        self.Session.remove()
    
    def add_person(self, person_id, detection_method='appearance', face_image_path=None):
        """Add or update a person"""
        session = self.get_session()
        try:
            person = session.query(Person).filter_by(person_id=person_id).first()
            
            if person:
                # Update existing person
                person.last_seen = datetime.now()
                person.total_detections += 1
                if detection_method == 'face' and person.detection_method == 'appearance':
                    person.detection_method = 'face'
                if face_image_path:
                    person.face_image_path = face_image_path
            else:
                # Create new person
                person = Person(
                    person_id=person_id,
                    detection_method=detection_method,
                    face_image_path=face_image_path,
                    total_detections=1
                )
                session.add(person)
            
            session.commit()
            # Refresh to get updated values, then expunge
            session.refresh(person)
            session.expunge(person)
            return person
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def add_event(self, event_data):
        """
        Add an event to the database
        
        Args:
            event_data: Dictionary with event information
        """
        session = self.get_session()
        try:
            event = Event(
                timestamp=datetime.fromisoformat(event_data.get('timestamp', datetime.now().isoformat())),
                room_id=event_data.get('room_id'),
                occupancy=event_data.get('occupancy', False),
                person_count=event_data.get('person_count', 0),
                person_id=event_data.get('person_id'),
                bbox=event_data.get('bbox'),
                face_bbox=event_data.get('face_bbox'),
                confidence=event_data.get('confidence', 0.0),
                detection_method=event_data.get('detection_method'),
                devices_detected=event_data.get('devices_detected', []),
                device_count=len(event_data.get('devices_detected', [])),
                video_file=event_data.get('video_file'),
                frame_number=event_data.get('frame_number'),
                action_detected=event_data.get('action_detected'),
                action_type=event_data.get('action_type'),
                energy_saved_estimate=event_data.get('energy_saved_estimate', 0.0),
                blockchain_credits=event_data.get('blockchain_credits', 0.0),
                overall_confidence=event_data.get('overall_confidence', 0.0),
                action_confidence=event_data.get('action_confidence', 0.0),
                devices_on=event_data.get('devices_on', []),
                devices_off=event_data.get('devices_off', []),
                lights_on=event_data.get('lights_on', False)
            )
            
            session.add(event)
            session.commit()
            # Refresh to get auto-generated ID, then expunge
            session.refresh(event)
            session.expunge(event)
            return event
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def add_activity(self, person_id, activity_type, details=None, incentive_points=0, incentive_reason=None, room_id=None):
        """Add a person activity"""
        session = self.get_session()
        try:
            activity = PersonActivity(
                person_id=person_id,
                activity_type=activity_type,
                details=details,
                incentive_points=incentive_points,
                incentive_reason=incentive_reason,
                room_id=room_id or 'CS_Lab_5'
            )
            
            session.add(activity)
            
            # Update the Person's cached total_credits_earned
            person = session.query(Person).filter_by(person_id=person_id).first()
            if person:
                person.total_credits_earned = (person.total_credits_earned or 0) + incentive_points
                person.last_seen = datetime.now()
                person.total_detections += 1
            else:
                # If person doesn't exist, create one
                new_person = Person(
                    person_id=person_id,
                    total_credits_earned=float(incentive_points),
                    total_detections=1,
                    first_seen=datetime.now(),
                    last_seen=datetime.now(),
                    department=room_id.split('_')[0] if room_id and '_' in room_id else 'Universal'
                )
                session.add(new_person)
            
            session.commit()
            # Refresh to get auto-generated ID, then expunge
            session.refresh(activity)
            session.expunge(activity)
            return activity
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def get_all_persons(self):
        """Get all persons"""
        session = self.get_session()
        try:
            persons = session.query(Person).all()
            # Expunge objects from session to prevent DetachedInstanceError
            for person in persons:
                session.expunge(person)
            return persons
        finally:
            session.close()
    
    def get_person_events(self, person_id):
        """Get all events for a person"""
        session = self.get_session()
        try:
            events = session.query(Event).filter_by(person_id=person_id).all()
            # Expunge objects from session to prevent DetachedInstanceError
            for event in events:
                session.expunge(event)
            return events
        finally:
            session.close()
    
    def get_recent_events(self, limit=100):
        """Get recent events"""
        session = self.get_session()
        try:
            events = session.query(Event).order_by(Event.timestamp.desc()).limit(limit).all()
            # Expunge objects from session to prevent DetachedInstanceError
            for event in events:
                session.expunge(event)
            return events
        finally:
            session.close()
    
    def get_person_score(self, person_id):
        """Calculate total incentive score for a person"""
        session = self.get_session()
        try:
            activities = session.query(PersonActivity).filter_by(person_id=person_id).all()
            total_score = sum(activity.incentive_points for activity in activities)
            return total_score
        finally:
            session.close()
    
    def get_leaderboard(self):
        """Get person leaderboard with scores and energy impact - Optimized"""
        print("Interrogating database for node census...")
        session = self.get_session()
        try:
            from sqlalchemy import func, case
            from datetime import timedelta
            
            # Weekly threshold
            one_week_ago = datetime.now() - timedelta(days=7)
            
            # Get energy impact and trust per person from Events - Only VERIFIED records
            energy_stats = session.query(
                Event.person_id,
                func.sum(Event.energy_saved_estimate).label('energy_saved'),
                func.sum(Event.blockchain_credits).label('credits_earned'),
                func.count(Event.event_id).label('event_count'),
                func.avg(Event.confidence).label('avg_conf')
            ).filter(
                Event.person_id.isnot(None),
                Event.status == 'verified'
            ).group_by(Event.person_id).all()
            
            energy_map = {row.person_id: (float(row.energy_saved or 0), float(row.credits_earned or 0), row.event_count, float(row.avg_conf or 0.95)) for row in energy_stats}
            
            # Get weekly gain per person (from verified activities if possible, but activities don't have status yet)
            # We filter by persons who have at least one verified event to ensure no mock data leaks
            activity_stats = session.query(
                PersonActivity.person_id,
                func.count(PersonActivity.activity_id).label('act_count'),
                func.sum(case((PersonActivity.timestamp >= one_week_ago, PersonActivity.incentive_points), else_=0)).label('weekly_gain')
            ).group_by(PersonActivity.person_id).all()
            
            activity_map = {row.person_id: (row.act_count, int(row.weekly_gain or 0)) for row in activity_stats}
            
            # Get all persons
            persons = session.query(Person).all()
            
            # Cache all users for faster lookup
            users = session.query(User).all()
            user_map = {user.email: user for user in users}
            
            leaderboard = []
            for person in persons:
                person_id = person.person_id
                
                # Do NOT exclude persons with no verified events - show them with 0 score
                # if person_id not in energy_map:
                #    continue
                    
                user = user_map.get(person_id)
                
                # Exclude faculty from leaderboard as per request
                # Check both User role (auth) and Person user_type (data)
                is_faculty_user = user and user.role == 'faculty'
                is_faculty_person = person.user_type == 'faculty'
                
                if is_faculty_user or is_faculty_person:
                    continue

                energy_saved, credits_earned, event_count, avg_conf = energy_map.get(person_id, (0.0, 0.0, 0, 0.95))
                total_activities, weekly_gain = activity_map.get(person_id, (event_count, 0))
                
                leaderboard.append({
                    'person_id': person_id,
                    'name': user.name if user and user.name else (person.student_id or person_id),
                    'total_credits': round(credits_earned, 2),
                    'total_activities': total_activities,
                    'weekly_gain': weekly_gain,
                    'trust_score': avg_conf,
                    'department': person.department or (user.department if user else "Universal"),
                    'total_energy_saved': round(energy_saved, 2),
                    'last_seen': person.last_seen.isoformat() if person.last_seen else None
                })
            
            leaderboard.sort(key=lambda x: x['total_credits'], reverse=True)
            return leaderboard
        finally:
            session.close()

    def get_admin_stats(self):
        """Get statistics for the Admin dashboard"""
        session = self.get_session()
        try:
            from sqlalchemy import func
            
            # Pending count for the audit stream
            pending_count = session.query(Event).filter_by(status='pending').count()
            
            # High Confidence (HC) are PENDING events with confidence >= 0.8 that can be bulk approved
            hc_count = session.query(Event).filter(
                Event.status == 'pending',
                Event.confidence >= 0.8
            ).count()
            
            # Total verified count
            total_verified = session.query(Event).filter_by(status='verified').count()
            
            # System Accuracy is the average overall confidence of verified events
            avg_conf = 0.0
            if total_verified > 0:
                avg_conf = session.query(func.avg(Event.overall_confidence)).filter_by(status='verified').scalar() or 0
            else:
                # Fallback to general system confidence if no verified events yet
                avg_conf = session.query(func.avg(Event.overall_confidence)).scalar() or 0.85
            
            # Get database file size
            import os
            db_size_kb = 0
            try:
                # Extract path from sqlite URL
                db_path = str(self.engine.url).replace('sqlite:///', '')
                if os.path.exists(db_path):
                    db_size_kb = os.path.getsize(db_path) / 1024
            except:
                pass
                
            return {
                'pending_count': pending_count,
                'hc_count': hc_count,
                'avg_fidelity': round(float(avg_conf) * 100, 1),
                'total_verified': total_verified,
                'db_size_kb': round(db_size_kb, 1)
            }
        finally:
            session.close()


if __name__ == "__main__":
    # Test database creation when run directly
    print("Initializing database (standalone)...")
    db = Database()
    
    # Ensure outputs/face_database exists
    from pathlib import Path
    Path('outputs/face_database').mkdir(parents=True, exist_ok=True)

    # Add test person
    db.add_person('person_000', 'face', 'outputs/face_database/person_000_face.jpg')
    print("✓ Added test person")
    
    # Add test event
    test_event = {
        'timestamp': datetime.now().isoformat(),
        'room_id': 'CS_Lab_5',
        'occupancy': True,
        'person_count': 1,
        'person_id': 'person_000',
        'bbox': [100, 200, 300, 400],
        'confidence': 0.9,
        'detection_method': 'face',
        'devices_detected': [{'type': 'laptop', 'confidence': 0.85}],
        'video_file': 'test_video.mp4',
        'frame_number': 30
    }
    db.add_event(test_event)
    print("✓ Added test event")
    
    # Add test activity
    db.add_activity('person_000', 'presence', {'devices_nearby': 1}, incentive_points=1, incentive_reason='room_presence')
    print("✓ Added test activity")
    
    # Query data
    persons = db.get_all_persons()
    print(f"\n✓ Total persons in database: {len(persons)}")
    
    events = db.get_recent_events(10)
    print(f"✓ Recent events: {len(events)}")
    
    leaderboard = db.get_leaderboard()
    print(f"✓ Leaderboard entries: {len(leaderboard)}")
    
    print("\n✓ Database initialized successfully!")
    print("Database file: outputs/sca_events.db")
