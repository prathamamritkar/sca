
import sys
import os
from datetime import datetime, timedelta
import random

# Add current directory to path so we can import local modules
sys.path.append(os.getcwd())

from backend.database import Database, User, Person, Event, PersonActivity
from backend.jwt_auth import hash_password
from sqlalchemy import func

def seed_data():
    print("🚀 Initializing Sandbox Population...")
    random.seed(42)  # Ensure deterministic data generation for consistent demos
    
    db_file = 'outputs/sca_events.db'
    if os.path.exists(db_file):
        print(f"🧹 Clearing existing ledger: {db_file}")
        try:
            os.remove(db_file)
            for ext in ['-wal', '-shm']:
                if os.path.exists(db_file + ext): os.remove(db_file + ext)
        except Exception as e:
            print(f"⚠️ Could not clear old DB: {e}")

    # Initialize DB without auto-admin to keep seeding clean
    db = Database(auto_create_admin=False)
    
    # helper for fresh session
    def get_fresh_session():
        return db.get_session()

    try:
        # 1. Create Users & Persons
        print("👥 Creating User & Person Node Identities...")
        users_data = [
            {'email': 'admin@sca.campus', 'password': 'admin123', 'name': 'System Administrator', 'role': 'admin', 'dept': 'Administration'},
            {'email': 'student@sca.campus', 'password': 'user123', 'name': 'Demo Student', 'role': 'student', 'dept': 'Computer Science'},
            {'email': 'faculty@sca.campus', 'password': 'user123', 'name': 'Demo Faculty', 'role': 'faculty', 'dept': 'Electrical Engineering'},
            {'email': 'pratham@sca.campus', 'password': 'user123', 'name': 'Pratham Amritkar', 'role': 'student', 'dept': 'Computer Science'},
            {'email': 'sneha@sca.campus', 'password': 'user123', 'name': 'Sneha Patil', 'role': 'student', 'dept': 'Information Technology'},
            {'email': 'rahul@sca.campus', 'password': 'user123', 'name': 'Rahul Verma', 'role': 'student', 'dept': 'Mechanical Engineering'},
            {'email': 'dr.rao@sca.campus', 'password': 'user123', 'name': 'Dr. K. Rao', 'role': 'faculty', 'dept': 'Electrical Engineering'},
            {'email': 'prof.gupta@sca.campus', 'password': 'user123', 'name': 'Prof. Gupta', 'role': 'faculty', 'dept': 'Applied Sciences'}
        ]
        
        session = get_fresh_session()
        for u in users_data:
            user = User(
                email=u['email'],
                password_hash=hash_password(u['password']),
                name=u['name'],
                role=u['role'],
                department=u['dept']
            )
            session.add(user)
            
            person = Person(
                person_id=u['email'],
                department=u['dept'],
                user_type=u['role']
            )
            session.add(person)
        session.commit()
        session.close()
        
        # 2. Re-fetch identities
        session = get_fresh_session()
        person_ids = [p.person_id for p in session.query(Person).all()]
        session.close()
        
        # 3. Generate Historical Events
        print("📊 Generating 150+ Detection Events...")
        rooms = ['CS_LAB_101', 'IT_HUB_202', 'MECH_WORKSHOP', 'MAIN_LIBRARY', 'FACULTY_LOUNGE', 'AUDITORIUM_A']
        sust_actions = [('light_off', 5, 20), ('fan_off', 3, 15), ('ac_off', 15, 60), ('laptop_sleep', 1, 8)]
        unsust_actions = [('light_on_empty', -2, 0), ('fan_on_empty', -1, 0), ('ac_on_empty', -10, 0)]
        
        session = get_fresh_session()
        for i in range(150):
            is_sust = random.random() < 0.75
            action, credits, energy = random.choice(sust_actions if is_sust else unsust_actions)
            room = random.choice(rooms)
            pid = random.choice(person_ids)
            ts = datetime.now() - timedelta(days=random.randint(0, 30), minutes=random.randint(0, 1440))
            
            event = Event(
                timestamp=ts,
                room_id=room,
                department=room.split('_')[0],
                person_id=pid,
                confidence=random.uniform(0.9, 0.99),
                action_detected=action,
                action_type='sustainable' if is_sust else 'unsustainable',
                energy_saved_estimate=float(energy),
                blockchain_credits=float(abs(credits)),
                status='verified'
            )
            session.add(event)
            
            activity = PersonActivity(
                person_id=pid,
                timestamp=ts,
                room_id=room,
                activity_type='disbursement' if is_sust else 'violation',
                incentive_points=credits,
                incentive_reason=f'{"Reward" if is_sust else "Penalty"}: {action}'
            )
            session.add(activity)
            
            # Periodically commit to keep memory low and session happy
            if i % 20 == 0: session.commit()
            
        session.commit()
        session.close()
        
        # 4. Peer-to-Peer Transfers
        print("💸 Simulating P2P Displacements...")
        session = get_fresh_session()
        for _ in range(25):
            s_id = random.choice(person_ids)
            r_id = random.choice([x for x in person_ids if x != s_id])
            amt = random.randint(10, 100)
            ts = datetime.now() - timedelta(days=random.randint(0, 5))
            
            session.add(PersonActivity(
                person_id=s_id, timestamp=ts, activity_type='asset_dispatch',
                incentive_points=-amt, details={'recipient': r_id}
            ))
            session.add(PersonActivity(
                person_id=r_id, timestamp=ts, activity_type='transfer_receipt',
                incentive_points=amt, details={'sender': s_id}
            ))
        session.commit()
        session.close()
        
        # 5. Sync Final Balances
        print("🔄 Performing Global Ledger Sync...")
        session = get_fresh_session()
        persons = session.query(Person).all()
        for p in persons:
            # Re-fetch to ensure we are in this session
            db_p = session.query(Person).filter_by(person_id=p.person_id).first()
            total = session.query(func.sum(PersonActivity.incentive_points)).filter_by(person_id=p.person_id).scalar() or 0
            db_p.total_credits_earned = float(max(0, total)) # Clamp to zero for DB constraint
        session.commit()
        session.close()
        
        print("\n✅ Sandbox Population Complete!")
        
    except Exception as e:
        print(f"❌ Failure: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
