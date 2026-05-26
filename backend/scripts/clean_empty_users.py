from backend.app.database import SessionLocal
from backend.app.db_models import User, Message, TelemetryLog

db = SessionLocal()

empty_users = db.query(User).filter(User.username == "").all()
for u in empty_users:
    print(f"Deleting user with id {u.id}")
    db.query(Message).filter((Message.sender_id == u.id) | (Message.recipient_id == u.id)).delete(synchronize_session=False)
    db.query(TelemetryLog).filter(TelemetryLog.user_id == u.id).delete(synchronize_session=False)
    db.delete(u)

db.commit()
db.close()
print("Cleanup done.")
