from fastapi import APIRouter, Depends, HTTPException, Request, Cookie
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.passwordResetToken import PasswordResetToken
from schemas.user import UserCreate, UserLogin, UserRead
from auth.hashing import hash_password, verify_password
from auth.jwt_handler import create_access_token, create_refresh_token, get_current_user_from_refresh_token, get_current_user, create_reset_password_token, verify_reset_password_token
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Optional
from core.config import settings
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib

api_router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@api_router.post("/register", response_model=UserRead)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    hashed_pw = hash_password(user.password)
    new_user = User(name=user.name, email=user.email, password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@api_router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    response = JSONResponse({
        "id": user.id,
        "name": user.name,
        "email": user.email
    })
    response.set_cookie(key="access_token", value=access_token, httponly=True)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True)
    return response

@api_router.get("/refresh")
def refresh_token(request: Request, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token no encontrado")

    user = get_current_user_from_refresh_token(refresh_token, db)
    new_access_token = create_access_token(data={"sub": user.email, "type": "access"})
    new_refresh_token = create_refresh_token(data={"sub": user.email, "type": "refresh"})
    response = JSONResponse({"message": "Token refreshed"})
    response.set_cookie(key="access_token", value=new_access_token, httponly=True)
    response.set_cookie(key="refresh_token", value=new_refresh_token, httponly=True)
    return response


@api_router.post("/forgot-password")
async def forgot_password(request: Request, db: Session = Depends(get_db)):
    email = await request.json()
    email = email.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    reset_token = create_reset_password_token(user.email)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    msg =MIMEMultipart()
    msg['From']=settings.EMAIL_USER
    msg['To']=user.email
    msg['Subject']="Reset your password"
    body=f"Click the link to reset your password: {reset_link}"
    msg.attach(MIMEText(body, 'plain'))
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(settings.EMAIL_USER, settings.EMAIL_PASSWORD)
            server.sendmail(settings.EMAIL_USER, user.email, msg.as_string())
        db.add(PasswordResetToken(user_id=user.id, token=reset_token))
        db.commit()
        return {"message": "Password reset email sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error sending email")
    
@api_router.post("/reset-password")
async def reset_password(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    token = data.get("token")
    new_password = data.get("new_password")
    email = verify_reset_password_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    db_token = db.query(PasswordResetToken).filter(PasswordResetToken.token == token, PasswordResetToken.used == False).first()
    if not db_token:
        raise HTTPException(status_code=400, detail="Token ya usado o inválido")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    user.password = hash_password(new_password)
    db_token.used = True
    db.commit()
    return {"message": "Password updated successfully"}

def get_current_user_from_cookie(
    access_token: Optional[str] = Cookie(default=None),
    db: Session = Depends(get_db)
) -> User:
    if not access_token:
        raise HTTPException(status_code=401, detail="Token no encontrado")
    return get_current_user(access_token, db)