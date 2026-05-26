from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ARJUNA'S ARROW"
    secret_key: str = "change-this-in-production"
    access_token_expiry_minutes: int = 60
    jwt_algorithm: str = "HS256"

    upload_dir: str = "storage/uploads"
    output_dir: str = "storage/output"
    log_file: str = "storage/mission_logs.jsonl"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
