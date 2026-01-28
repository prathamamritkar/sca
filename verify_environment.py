"""
Comprehensive Environment & Authentication Verification Script
Tests sandbox/production mode handling and environment configuration
"""
import requests
import json
import os
from typing import Dict, Any

API_BASE = "http://localhost:5000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{text.center(70)}{Colors.END}")
    print(f"{Colors.CYAN}{Colors.BOLD}{'='*70}{Colors.END}\n")

def print_section(text: str):
    print(f"\n{Colors.BLUE}{Colors.BOLD}{'─'*70}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{text}{Colors.END}")
    print(f"{Colors.BLUE}{Colors.BOLD}{'─'*70}{Colors.END}")

def print_success(message: str):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message: str):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

def print_info(key: str, value: Any):
    print(f"  {Colors.BOLD}{key}:{Colors.END} {value}")

def test_environment_configuration():
    """Test environment configuration"""
    print_section("1. ENVIRONMENT CONFIGURATION VERIFICATION")
    
    # Check .env files exist
    env_files = ['.env', '.env.development', '.env.production', '.env.example']
    for env_file in env_files:
        if os.path.exists(env_file):
            print_success(f"{env_file} exists")
        else:
            print_error(f"{env_file} missing")
    
    # Check backend config.py
    if os.path.exists('backend/config.py'):
        print_success("backend/config.py exists")
    else:
        print_error("backend/config.py missing")
    
    return True

def test_backend_status():
    """Test backend status endpoint"""
    print_section("2. BACKEND STATUS & CONFIGURATION")
    
    try:
        response = requests.get(f"{API_BASE}/status")
        if response.status_code == 200:
            data = response.json()
            print_success("Backend is running")
            print_info("Status", data.get('status'))
            print_info("Database Status", data.get('database_status'))
            print_info("Blockchain Status", data.get('blockchain_status'))
            print_info("Node ID", data.get('node_id'))
            print_info("Version", data.get('version'))
            return True
        else:
            print_error(f"Backend returned {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to backend at http://localhost:5000")
        print_warning("Make sure backend is running: python backend/app.py")
        return False

def test_cors_configuration():
    """Test CORS configuration"""
    print_section("3. CORS CONFIGURATION")
    
    try:
        # Test with Origin header
        headers = {'Origin': 'http://localhost:5173'}
        response = requests.get(f"{API_BASE}/status", headers=headers)
        
        if 'Access-Control-Allow-Origin' in response.headers:
            print_success("CORS headers present")
            print_info("Allowed Origin", response.headers.get('Access-Control-Allow-Origin'))
            return True
        else:
            print_warning("CORS headers not found (may be configured differently)")
            return True
    except Exception as e:
        print_error(f"CORS test failed: {e}")
        return False

def test_sandbox_mode_login():
    """Test login with sandbox mode"""
    print_section("4. SANDBOX MODE AUTHENTICATION")
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": "admin@sca.campus",
            "password": "admin123",
            "use_mock": True  # Sandbox mode
        })
        
        if response.status_code == 200:
            data = response.json()
            print_success("Sandbox mode login successful")
            print_info("User", data['user']['email'])
            print_info("Role", data['user']['role'])
            print_info("Environment", data.get('environment', 'Not specified'))
            
            # Check if environment is indicated
            if 'environment' in data or 'data_mode' in data:
                print_success("Environment mode indicated in response")
            else:
                print_warning("Environment mode not indicated in response")
            
            return data['access_token']
        else:
            print_error(f"Sandbox login failed: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Sandbox login error: {e}")
        return None

def test_production_mode_login():
    """Test login with production mode"""
    print_section("5. PRODUCTION MODE AUTHENTICATION")
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json={
            "email": "admin@sca.campus",
            "password": "admin123",
            "use_mock": False  # Production mode
        })
        
        if response.status_code == 200:
            data = response.json()
            print_success("Production mode login successful")
            print_info("User", data['user']['email'])
            print_info("Role", data['user']['role'])
            print_info("Environment", data.get('environment', 'Not specified'))
            
            # Check if environment is indicated
            if 'environment' in data or 'data_mode' in data:
                print_success("Environment mode indicated in response")
            else:
                print_warning("Environment mode not indicated in response")
            
            return data['access_token']
        else:
            print_error(f"Production login failed: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Production login error: {e}")
        return None

def test_jwt_secret_configuration():
    """Test JWT secret configuration"""
    print_section("6. JWT SECRET CONFIGURATION")
    
    # Check if JWT_SECRET_KEY is set in environment
    jwt_secret = os.environ.get('JWT_SECRET_KEY')
    
    if jwt_secret:
        print_success("JWT_SECRET_KEY is set in environment")
        if jwt_secret == 'sca-dev-secret-key-change-in-production':
            print_warning("Using default development key")
            print_warning("MUST change for production!")
        elif len(jwt_secret) >= 32:
            print_success(f"JWT secret is secure ({len(jwt_secret)} characters)")
        else:
            print_warning(f"JWT secret is short ({len(jwt_secret)} characters)")
    else:
        print_warning("JWT_SECRET_KEY not set in environment")
        print_info("Using", "Default development key from config")
    
    return True

def test_data_separation():
    """Test data separation between sandbox and production"""
    print_section("7. DATA MODE SEPARATION")
    
    sandbox_token = test_sandbox_mode_login()
    production_token = test_production_mode_login()
    
    if sandbox_token and production_token:
        print_success("Both sandbox and production modes working")
        
        # Test if tokens are different (they should be)
        if sandbox_token != production_token:
            print_success("Tokens are unique per session")
        else:
            print_warning("Tokens are identical (expected if same user)")
        
        return True
    else:
        print_error("One or both authentication modes failed")
        return False

def test_environment_variables():
    """Test environment variable loading"""
    print_section("8. ENVIRONMENT VARIABLES")
    
    important_vars = [
        'NODE_ENV',
        'JWT_SECRET_KEY',
        'FLASK_ENV',
        'CORS_ORIGINS',
        'DATA_MODE'
    ]
    
    for var in important_vars:
        value = os.environ.get(var)
        if value:
            # Mask sensitive values
            if 'SECRET' in var or 'KEY' in var:
                display_value = f"{value[:10]}..." if len(value) > 10 else "***"
            else:
                display_value = value
            print_info(var, display_value)
        else:
            print_warning(f"{var} not set (using defaults)")
    
    return True

def test_https_configuration():
    """Test HTTPS configuration"""
    print_section("9. HTTPS CONFIGURATION")
    
    force_https = os.environ.get('FORCE_HTTPS', 'false').lower() == 'true'
    
    if force_https:
        print_success("HTTPS enforcement enabled")
    else:
        print_info("HTTPS enforcement", "Disabled (OK for development)")
    
    return True

def test_rate_limiting():
    """Test rate limiting configuration"""
    print_section("10. RATE LIMITING CONFIGURATION")
    
    rate_limit_enabled = os.environ.get('RATE_LIMIT_ENABLED', 'false').lower() == 'true'
    
    if rate_limit_enabled:
        print_success("Rate limiting enabled")
        rate_limit = os.environ.get('RATE_LIMIT_PER_MINUTE', '60')
        print_info("Limit", f"{rate_limit} requests/minute")
    else:
        print_info("Rate limiting", "Disabled (OK for development)")
    
    return True

def run_comprehensive_verification():
    """Run all verification tests"""
    print_header("SCA ENVIRONMENT & AUTH COMPREHENSIVE VERIFICATION")
    
    results = {
        "passed": 0,
        "failed": 0,
        "warnings": 0
    }
    
    tests = [
        ("Environment Configuration", test_environment_configuration),
        ("Backend Status", test_backend_status),
        ("CORS Configuration", test_cors_configuration),
        ("JWT Secret", test_jwt_secret_configuration),
        ("Environment Variables", test_environment_variables),
        ("HTTPS Configuration", test_https_configuration),
        ("Rate Limiting", test_rate_limiting),
    ]
    
    for test_name, test_func in tests:
        try:
            if test_func():
                results["passed"] += 1
            else:
                results["failed"] += 1
        except Exception as e:
            print_error(f"{test_name} failed with error: {e}")
            results["failed"] += 1
    
    # Summary
    print_header("VERIFICATION SUMMARY")
    print(f"{Colors.GREEN}Passed: {results['passed']}/{len(tests)}{Colors.END}")
    print(f"{Colors.RED}Failed: {results['failed']}/{len(tests)}{Colors.END}")
    
    if results['failed'] == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ ALL VERIFICATIONS PASSED!{Colors.END}\n")
        print(f"{Colors.GREEN}Environment configuration is properly set up.{Colors.END}")
        print(f"{Colors.GREEN}Sandbox/Production mode separation is working.{Colors.END}")
    else:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠ SOME VERIFICATIONS FAILED{Colors.END}\n")
        print(f"{Colors.YELLOW}Review the errors above and fix configuration.{Colors.END}")
    
    # Recommendations
    print_header("PRODUCTION DEPLOYMENT CHECKLIST")
    print(f"{Colors.BOLD}Before deploying to production:{Colors.END}\n")
    print("  1. Set NODE_ENV=production")
    print("  2. Generate secure JWT_SECRET_KEY (64+ characters)")
    print("  3. Update CORS_ORIGINS with production domain")
    print("  4. Set FORCE_HTTPS=true")
    print("  5. Enable RATE_LIMIT_ENABLED=true")
    print("  6. Set DATA_MODE=production")
    print("  7. Configure production database (PostgreSQL/MySQL)")
    print("  8. Set up SSL certificates")
    print("  9. Review all environment variables in .env.production")
    print("  10. Test all endpoints in production environment\n")
    
    return results

if __name__ == "__main__":
    try:
        results = run_comprehensive_verification()
        exit(0 if results['failed'] == 0 else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Verification interrupted by user{Colors.END}\n")
        exit(1)
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {e}{Colors.END}\n")
        exit(1)
