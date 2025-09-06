"""
Configuration settings for the Autofy LangChain backend
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    model_config = SettingsConfigDict(
        env_file=[os.path.join(os.path.dirname(__file__), '..', '.env'), '.env'], 
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"  # Allow extra fields from .env to be ignored
    )
    
    # Application
    app_name: str = "Autofy LangChain Backend"
    debug: bool = False
    secret_key: str = "your-secret-key-here"
    
    # API Configuration
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    allowed_origins: list = ["http://localhost:3000", "http://localhost:5173"]
    
    # Database
    database_url: Optional[str] = None
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    
    # LLM Providers
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    
    # Google OAuth (for Gmail)
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    
    # Notion OAuth
    notion_client_id: Optional[str] = None
    notion_client_secret: Optional[str] = None
    
    # Service Integrations
    notion_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    
    # LangSmith (optional for tracing)
    langchain_tracing_v2: bool = False
    langchain_api_key: Optional[str] = None
    langchain_project: str = "autofy-workflows"
    
    @property
    def database_config(self) -> dict:
        """Get database configuration"""
        if not self.database_url:
            raise ValueError("DATABASE_URL must be set")
        return {"url": self.database_url}
    
    @property
    def supabase_config(self) -> dict:
        """Get Supabase configuration"""
        if not self.supabase_url or not self.supabase_service_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        return {
            "url": self.supabase_url,
            "key": self.supabase_service_key
        }
    
    def get_llm_config(self, provider: str) -> dict:
        """Get LLM provider configuration"""
        configs = {
            "openai": {"api_key": self.openai_api_key},
            "anthropic": {"api_key": self.anthropic_api_key},
            "gemini": {"api_key": self.gemini_api_key},
            "openrouter": {"api_key": self.openrouter_api_key}
        }
        
        config = configs.get(provider.lower())
        if not config:
            raise ValueError(f"Unknown LLM provider: {provider}")
        
        if not config["api_key"]:
            raise ValueError(f"{provider.upper()}_API_KEY must be set")
        
        return config


# Global settings instance
settings = Settings()
