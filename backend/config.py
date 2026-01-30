"""
Environment Configuration Manager for SCA Backend
Handles environment-specific settings and validates configuration
"""
import os
from dotenv import load_dotenv
from typing import Literal

# Load environment variables from .env file
load_dotenv()

EnvironmentType = Literal['development', 'staging', 'production']
DataMode = Literal['mock', 'production']


class Config:
    """Base configuration class"""
    
    # Environment
    NODE_ENV: EnvironmentType = os.environ.get('NODE_ENV', 'development')
    
    # Flask
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
    FLASK_DEBUG = os.environ.get('FLASK_DEBUG', '1') == '1'
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'sca-dev-secret-key-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRES_HOURS = int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_HOURS', '24'))
    JWT_REFRESH_TOKEN_EXPIRES_DAYS = int(os.environ.get('JWT_REFRESH_TOKEN_EXPIRES_DAYS', '7'))
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:8080').split(',')
    
    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///outputs/sca_events.db')
    
    # Blockchain
    BLOCKCHAIN_RPC_URL = os.environ.get('BLOCKCHAIN_RPC_URL', 'https://rpc-amoy.polygon.technology/')
    BLOCKCHAIN_PRIVATE_KEY = os.environ.get('BLOCKCHAIN_PRIVATE_KEY')
    # Support both naming conventions
    CONTRACT_ADDRESS = os.environ.get('CONTRACT_ADDRESS') or os.environ.get('VITE_CONTRACT_ADDRESS')
    
    # Department
    TARGET_DEPT = os.environ.get('TARGET_DEPT', 'CS_DEPARTMENT')
    
    # Data Mode
    DATA_MODE: DataMode = os.environ.get('DATA_MODE', 'mock')
    
    # Security
    FORCE_HTTPS = os.environ.get('FORCE_HTTPS', 'false').lower() == 'true'
    
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.environ.get('RATE_LIMIT_ENABLED', 'false').lower() == 'true'
    RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE', '60'))
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    @classmethod
    def is_development(cls) -> bool:
        """Check if running in development mode"""
        return cls.NODE_ENV == 'development'
    
    @classmethod
    def is_production(cls) -> bool:
        """Check if running in production mode"""
        return cls.NODE_ENV == 'production'
    
    @classmethod
    def is_mock_mode(cls) -> bool:
        """Check if using mock data"""
        return cls.DATA_MODE == 'mock'
    
    @classmethod
    def validate(cls):
        """Validate configuration and warn about insecure settings"""
        warnings = []
        errors = []
        
        # Check JWT secret in production
        if cls.is_production():
            if cls.JWT_SECRET_KEY == 'sca-dev-secret-key-change-in-production':
                errors.append("CRITICAL: JWT_SECRET_KEY must be changed in production!")
            
            if cls.JWT_SECRET_KEY and len(cls.JWT_SECRET_KEY) < 32:
                warnings.append("WARNING: JWT_SECRET_KEY should be at least 32 characters")
            
            if cls.FLASK_DEBUG:
                errors.append("CRITICAL: FLASK_DEBUG must be disabled in production!")
            
            if not cls.FORCE_HTTPS:
                warnings.append("WARNING: FORCE_HTTPS should be enabled in production")
            
            if cls.DATA_MODE == 'mock':
                warnings.append("WARNING: DATA_MODE is 'mock' in production environment")
        
        # Print warnings and errors
        if warnings:
            print("\n⚠️  CONFIGURATION WARNINGS:")
            for warning in warnings:
                print(f"   {warning}")
        
        if errors:
            print("\n❌ CONFIGURATION ERRORS:")
            for error in errors:
                print(f"   {error}")
            print("\n   Please fix these issues before deploying to production!\n")
        
        if not warnings and not errors:
            print(f"\n✓ Configuration validated for {cls.NODE_ENV} environment")
        
        return len(errors) == 0
    
    @classmethod
    def get_info(cls) -> dict:
        """Get configuration info (safe for logging)"""
        return {
            'environment': cls.NODE_ENV,
            'data_mode': cls.DATA_MODE,
            'debug': cls.FLASK_DEBUG,
            'database': cls.DATABASE_URL.split('/')[-1] if '/' in cls.DATABASE_URL else cls.DATABASE_URL,
            'cors_origins': len(cls.CORS_ORIGINS),
            'blockchain_configured': bool(cls.BLOCKCHAIN_PRIVATE_KEY and cls.CONTRACT_ADDRESS),
            'rate_limiting': cls.RATE_LIMIT_ENABLED,
            'https_enforced': cls.FORCE_HTTPS
        }


class DevelopmentConfig(Config):
    """Development-specific configuration"""
    NODE_ENV = 'development'
    FLASK_DEBUG = True


class ProductionConfig(Config):
    """Production-specific configuration"""
    NODE_ENV = 'production'
    FLASK_DEBUG = False
    DATA_MODE = 'production'
    FORCE_HTTPS = True
    RATE_LIMIT_ENABLED = True


# Export the appropriate config based on environment
def get_config() -> Config:
    """Get configuration based on NODE_ENV"""
    env = os.environ.get('NODE_ENV', 'development').lower()
    
    if env == 'production':
        return ProductionConfig()
    else:
        return DevelopmentConfig()


# Singleton instance
config = get_config()


if __name__ == '__main__':
    """Test configuration"""
    print("="*60)
    print("SCA ENVIRONMENT CONFIGURATION")
    print("="*60)
    
    config.validate()
    
    print("\nConfiguration Info:")
    import json
    print(json.dumps(config.get_info(), indent=2))
