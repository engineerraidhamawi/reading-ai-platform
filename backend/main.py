from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import StreamingResponse, FileResponse
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import Base, engine, SessionLocal, User, ResearchSession, Passage, get_db
from groq import Groq
import datetime
import difflib
import re
import csv
import io
import os
from typing import List
from pydantic import BaseModel
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, 
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "YOUR_SUPER_SECRET_KEY_12345_KEEP_IT_SAFE"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
print("Groq Client initialized successfully!")

def normalize_arabic(text):
    text = re.sub(r'[\u0617-\u061A\u064B-\u0652]', '', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'[إأآا]', 'ا', text)
    text = re.sub(r'ى', 'ي', text)
    text = re.sub(r'ة', 'ه', text)
    return text

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise credentials_exception
    except JWTError: raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None: raise credentials_exception
    return user

def upload_to_supabase(file_path, file_name):
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    with open(file_path, "rb") as f:
        file_data = f.read()
        
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "audio/webm"
    }
    
    upload_url = f"{supabase_url}/storage/v1/object/audio-files/{file_name}"
    response = requests.post(upload_url, headers=headers, data=file_data)
    
    if response.status_code == 200:
        public_url = f"{supabase_url}/storage/v1/object/public/audio-files/{file_name}"
        return public_url
    else:
        print("Supabase Upload Error:", response.text)
        return None

@app.post("/auth/register")
def register_user(username: str = Form(...), password: str = Form(...), role: str = Form(...), doctor_username: str = Form(None), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    if db.query(User).filter(User.username == username).first(): raise HTTPException(status_code=400, detail="Username exists")
    new_user = User(username=username, hashed_password=pwd_context.hash(password), role=role)
    if role == "student" and doctor_username:
        doctor = db.query(User).filter(User.username == doctor_username, User.role == "doctor").first()
        if not doctor: raise HTTPException(status_code=404, detail="Doctor not found")
        new_user.doctor_id = doctor.id
    db.add(new_user)
    db.commit()
    return {"message": "User registered"}

@app.get("/auth/doctors")
def get_doctors(db: Session = Depends(get_db)):
    return [{"id": d.id, "username": d.username} for d in db.query(User).filter(User.role == "doctor").all()]

@app.post("/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not pwd_context.verify(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    return {"access_token": create_access_token(data={"sub": user.username, "role": user.role, "id": user.id}), "token_type": "bearer", "role": user.role, "username": user.username}

@app.post("/api/passages")
def create_passage(
    text: str = Form(...), 
    level: str = Form("متوسط"),
    question1: str = Form(None), option1a: str = Form(None), option1b: str = Form(None), option1c: str = Form(None), answer1: str = Form(None),
    question2: str = Form(None), option2a: str = Form(None), option2b: str = Form(None), option2c: str = Form(None), answer2: str = Form(None),
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if current_user.role not in ["doctor", "admin"]: raise HTTPException(status_code=403, detail="Doctors only")
    passage = Passage(
        text=text, level=level, created_by=current_user.id,
        question1=question1, option1a=option1a, option1b=option1b, option1c=option1c, answer1=answer1,
        question2=question2, option2a=option2a, option2b=option2b, option2c=option2c, answer2=answer2
    )
    db.add(passage)
    db.commit()
    db.refresh(passage)
    return {"message": "Passage created", "id": passage.id}

@app.get("/api/passages")
def get_passages(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "doctor":
        return db.query(Passage).filter(Passage.created_by == current_user.id).all()
    elif current_user.role == "student":
        doctor = db.query(User).filter(User.id == current_user.doctor_id).first()
        if doctor: return db.query(Passage).filter(Passage.created_by == doctor.id).all()
    return db.query(Passage).all()

@app.get("/api/sessions")
def get_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ResearchSession, User.username).join(User, ResearchSession.student_id == User.id)
    if current_user.role == "doctor": query = query.filter(ResearchSession.doctor_id == current_user.id)
    elif current_user.role == "student": query = query.filter(ResearchSession.student_id == current_user.id)
    results = query.all()
    sessions_list = []
    for session, student_username in results:
        session_dict = {c.name: getattr(session, c.name) for c in session.__table__.columns}
        session_dict['student_username'] = student_username
        sessions_list.append(session_dict)
    return sessions_list

@app.post("/api/sessions/upload")
async def upload_audio(audio: UploadFile = File(...), passage: str = Form(...), comprehension_score: str = Form("0/2"), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "student": raise HTTPException(status_code=403, detail="Students only")
    
    temp_file_name = f"audio_{datetime.datetime.now().timestamp()}.webm"
    with open(temp_file_name, "wb") as f: f.write(await audio.read())
    
    audio_url = upload_to_supabase(temp_file_name, temp_file_name)
    
    with open(temp_file_name, "rb") as file:
        transcription = groq_client.audio.transcriptions.create(
            file=(temp_file_name, file.read()),
            model="whisper-large-v3",
            language="ar"
        )
    raw_transcript = transcription.text.strip()
    
    if os.path.exists(temp_file_name):
        os.remove(temp_file_name)
        
    matcher = difflib.SequenceMatcher(None, normalize_arabic(passage).replace(" ", ""), normalize_arabic(raw_transcript).replace(" ", ""))
    accuracy = round(matcher.ratio() * 100, 2)
    
    original_words = normalize_arabic(passage).split()
    spoken_words = normalize_arabic(raw_transcript).split()
    word_matcher = difflib.SequenceMatcher(None, original_words, spoken_words)
    
    errors = []
    word_analysis = []
    
    for tag, i1, i2, j1, j2 in word_matcher.get_opcodes():
        if tag == 'equal':
            for word in original_words[i1:i2]:
                word_analysis.append({"word": word, "status": "correct"})
        elif tag == 'delete':
            for word in original_words[i1:i2]:
                errors.append(word)
                word_analysis.append({"word": word, "status": "missing"})
        elif tag == 'replace':
            for word in original_words[i1:i2]:
                errors.append(word)
                word_analysis.append({"word": word, "status": "incorrect"})
    
    new_session = ResearchSession(
        session_id=f"SES-{datetime.datetime.now().timestamp()}", student_id=current_user.id, doctor_id=current_user.doctor_id,
        age_range="8-10", grade="4", passage_id="PASS", passage_level="متوسط", 
        audio_file_id=audio_url, 
        asr_transcript=raw_transcript, error_tags=";".join(errors) or "لا توجد أخطاء",
        wpm=int(len(spoken_words) / 0.5), accuracy_percent=accuracy, comprehension_score=comprehension_score,
        duration_seconds=30, consent_given=True
    )
    db.add(new_session)
    db.commit()
    
    return {
        "accuracy": accuracy, 
        "transcript": raw_transcript,
        "word_analysis": word_analysis
    }

@app.get("/api/sessions/export")
def export_sessions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["doctor", "admin"]: raise HTTPException(status_code=403, detail="Doctors/Admins only")
    query = db.query(ResearchSession, User.username).join(User, ResearchSession.student_id == User.id)
    if current_user.role == "doctor": query = query.filter(ResearchSession.doctor_id == current_user.id)
    
    output = io.StringIO()
    output.write('\ufeff') 
    writer = csv.writer(output)
    writer.writerow(["Student", "Date", "WPM", "Accuracy (%)", "Comprehension", "Errors", "AI Transcript"])
    
    for session, student_username in query.all():
        writer.writerow([student_username, session.session_date, session.wpm, session.accuracy_percent, session.comprehension_score, session.error_tags, session.asr_transcript])
    
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=research_data.csv"})

@app.get("/api/audio/{filename}")
async def get_audio(filename: str, token: str = Query(...), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None: raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = db.query(User).filter(User.username == username).first()
    if not user or user.role not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = filename
    if os.path.exists(file_path):
        return FileResponse(path=file_path, media_type="audio/webm")
    raise HTTPException(status_code=404, detail="Audio file not found")

@app.get("/api/users")
def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    return db.query(User).all()

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    user = db.query(User).filter(User.id == user_id).first()
    if user: db.delete(user); db.commit()
    return {"message": "Deleted"}

@app.put("/api/users/{user_id}/reset-password")
def reset_password(user_id: int, new_password: str = Form(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    user = db.query(User).filter(User.id == user_id).first()
    if user: user.hashed_password = pwd_context.hash(new_password); db.commit()
    return {"message": "Reset"}