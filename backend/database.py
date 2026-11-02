# TEST UPDATE
import os
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime
from passlib.context import CryptContext

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./reading_platform.db")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)
    doctor_id = Column(Integer, nullable=True)

class ResearchSession(Base):
    __tablename__ = "research_sessions"
    session_id = Column(String, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    doctor_id = Column(Integer, ForeignKey("users.id"))
    age_range = Column(String)
    grade = Column(String)
    passage_id = Column(String)
    passage_level = Column(String)
    audio_file_id = Column(String)
    asr_transcript = Column(Text)
    error_tags = Column(Text)
    wpm = Column(Integer)
    accuracy_percent = Column(Float)
    comprehension_score = Column(String)
    session_date = Column(DateTime, default=datetime.datetime.utcnow)
    duration_seconds = Column(Integer)
    stars = Column(Integer, default=0)
    consent_given = Column(Boolean)

class Passage(Base):
    __tablename__ = "passages"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    level = Column(String)
    created_by = Column(Integer, ForeignKey("users.id"))
    questions_data = Column(Text, nullable=True)

Base.metadata.create_all(bind=engine)

db = SessionLocal()

if not db.query(User).filter(User.username == "admin").first():
    db.add(User(username="admin", hashed_password=pwd_context.hash("admin123"), role="admin"))
    print("Admin created (admin / admin123)")

if not db.query(User).filter(User.username == "dr_reham").first():
    doc = User(username="dr_reham", hashed_password=pwd_context.hash("12345"), role="doctor")
    db.add(doc)
    db.commit()
    print("Doctor created (dr_reham / 12345)")

doc = db.query(User).filter(User.username == "dr_reham").first()
if not db.query(User).filter(User.username == "student1").first():
    db.add(User(username="student1", hashed_password=pwd_context.hash("12345"), role="student", doctor_id=doc.id))
    print("Student created (student1 / 12345)")

if not db.query(Passage).first():
    import json
    default_questions = [
        {"q": "أين ذهب أحمد؟", "o1": "المدرسة", "o2": "الحديقة", "o3": "المنزل", "ans": "الحديقة"},
        {"q": "من هو بطل القصة؟", "o1": "أحمد", "o2": "خالد", "o3": "علي", "ans": "أحمد"}
    ]
    db.add(Passage(text="ذهب أحمد إلى الحديقة ليلعب مع أصدقائه. ركضوا وضحكوا كثيراً حتى غابت الشمس.", level="الصف الأول", created_by=doc.id, questions_data=json.dumps(default_questions)))
    print("Default passage created")

db.commit()
db.close()
print("Database ready!")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()