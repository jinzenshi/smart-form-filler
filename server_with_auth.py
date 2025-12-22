import os
import time
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import json

# 导入核心模块
from core import fill_form
from models import init_db, User, OperationLog, Feedback, SessionLocal
from auth import (
    get_db, hash_password, verify_password, create_user,
    authenticate_user, log_operation, get_current_user, is_admin,
    generate_token, security, create_temporary_account, check_user_expired
)

app = FastAPI(title="智能填表系统")

# 应用启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库"""
    print("🚀 启动中...")
    init_db()
    print("✅ 启动完成！")

# 全局中间件：记录请求（生产环境可移除）
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # print(f"\n🌐 [MIDDLEWARE] {request.method} {request.url.path}")
    response = await call_next(request)
    return response

# 检查静态文件目录
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# 初始化数据库
init_db()

@app.get("/")
async def root():
    """主页"""
    if os.path.exists(os.path.join("static", "index.html")):
        return FileResponse(os.path.join("static", "index.html"))
    return {"status": "ok", "message": "智能填表服务正在运行"}

@app.get("/login")
async def login_page():
    """登录页面"""
    if os.path.exists(os.path.join("static", "login.html")):
        return FileResponse(os.path.join("static", "login.html"))
    return {"message": "请访问 /docs 查看API文档"}

@app.get("/feedback")
async def feedback_page():
    """反馈页面"""
    if os.path.exists(os.path.join("static", "feedback.html")):
        return FileResponse(os.path.join("static", "feedback.html"))
    return {"message": "反馈页面"}

@app.get("/admin")
async def admin_page():
    """后台管理页面（公开访问，但需要前端验证权限）"""
    if os.path.exists(os.path.join("static", "admin.html")):
        return FileResponse(os.path.join("static", "admin.html"))
    return {"message": "需要管理员权限"}

@app.post("/api/register")
async def register(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    """用户注册"""
    try:
        # 检查用户名和密码长度
        if len(username) < 3 or len(password) < 3:
            raise HTTPException(status_code=400, detail="用户名和密码必须至少3个字符")

        # 检查用户是否已存在
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="用户名已存在")

        # 创建用户
        hashed_pwd = hash_password(password)
        user = User(username=username, password=hashed_pwd)
        db.add(user)
        db.commit()

        # 记录操作日志
        log_operation(db, username, "注册", status='success')

        return {"success": True, "message": "注册成功"}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "message": f"注册失败: {str(e)}"}

@app.post("/api/login")
async def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db), request: Request = None):
    """用户登录"""
    try:
        user = authenticate_user(db, username, password)
        if not user:
            # 记录失败日志
            log_operation(db, username, "登录", status='failed', ip_address=request.client.host)
            raise HTTPException(status_code=400, detail="用户名或密码错误")

        # 生成token
        token = generate_token(username)

        # 记录成功日志
        log_operation(db, username, "登录", status='success', ip_address=request.client.host)

        return {
            "success": True,
            "token": token,
            "username": username,
            "is_admin": user.is_admin
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "message": f"登录失败: {str(e)}"}

@app.post("/api/process")
async def process(
    docx: UploadFile = File(...),
    user_info_text: str = Form(...),
    photo: Optional[UploadFile] = File(None),
    auth_token: Optional[str] = Form(None),  # 从表单获取token
    db: Session = Depends(get_db),
    request: Request = None
):
    """处理文档（需要认证）"""
    try:
        # 优先从表单获取token，其次从header获取
        token = auth_token

        if not token:
            # 尝试从Header获取
            auth_header = request.headers.get('Authorization', '')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ', 1)[1]

        if not token:
            raise HTTPException(status_code=401, detail="缺少认证token")

        # 手动解析token并验证用户
        parts = token.split(':')
        if len(parts) != 3:
            raise HTTPException(status_code=401, detail="无效token格式")

        username = parts[0]
        user = db.query(User).filter(User.username == username).first()

        if not user:
            raise HTTPException(status_code=401, detail="用户不存在")

        docx_bytes = await docx.read()
        photo_bytes = await photo.read() if photo else None

        # 准备提交数据
        submitted_data = {
            "docx_filename": docx.filename,
            "docx_size": len(docx_bytes),
            "has_photo": photo is not None,
            "photo_filename": photo.filename if photo else None,
            "user_info_preview": user_info_text[:500] + "..." if len(user_info_text) > 500 else user_info_text,
            "user_info_length": len(user_info_text)
        }

        # 记录操作日志
        log_operation(
            db,
            user.username,
            "提交文档处理",
            details=f"文件名: {docx.filename}",
            submitted_data=submitted_data,
            ip_address=request.client.host if request else None
        )

        output_bytes = fill_form(docx_bytes, user_info_text, photo_bytes)

        headers = {"Content-Disposition": "attachment; filename=filled.docx"}
        return StreamingResponse(
            iter([output_bytes]),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers=headers
        )
    except HTTPException:
        raise
    except Exception as e:
        # 记录错误日志
        try:
            if 'credentials' in locals():
                user = get_current_user(credentials)
                log_operation(db, user.username, "文档处理失败", details=str(e), status='failed')
        except:
            pass
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/admin/users")
async def get_users(db: Session = Depends(get_db), admin_user: User = Depends(is_admin)):
    """获取用户列表（仅管理员）"""
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "created_at": u.created_at.isoformat(),
            "is_admin": u.is_admin
        }
        for u in users
    ]

@app.get("/api/admin/logs")
async def get_logs(
    limit: int = 100,
    username: Optional[str] = None,
    operation: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin)
):
    """获取操作日志（仅管理员）"""
    import json

    query = db.query(OperationLog)

    if username:
        query = query.filter(OperationLog.username == username)

    if operation:
        query = query.filter(OperationLog.operation == operation)

    logs = query.order_by(OperationLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": l.id,
            "username": l.username,
            "operation": l.operation,
            "details": l.details,
            "submitted_data": json.loads(l.submitted_data) if l.submitted_data else None,
            "ip_address": l.ip_address,
            "status": l.status,
            "created_at": l.created_at.isoformat()
        }
        for l in logs
    ]

@app.post("/api/feedback")
async def submit_feedback(
    feedback_type: str = Form(...),
    rating: int = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    contact_email: Optional[str] = Form(None),
    screenshot: Optional[UploadFile] = File(None),
    auth_token: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    request: Request = None
):
    """提交用户反馈"""
    try:
        # 优先从表单获取token，其次从header获取
        token = auth_token

        if not token:
            # 尝试从Header获取
            auth_header = request.headers.get('Authorization', '')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ', 1)[1]

        if not token:
            raise HTTPException(status_code=401, detail="缺少认证token")

        # 手动解析token并验证用户
        parts = token.split(':')
        if len(parts) != 3:
            raise HTTPException(status_code=401, detail="无效token格式")

        username = parts[0]
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="用户不存在")

        # 处理截图上传
        screenshot_path = None
        if screenshot:
            import os
            os.makedirs("uploads/screenshots", exist_ok=True)
            screenshot_path = f"uploads/screenshots/{username}_{int(time.time())}_{screenshot.filename}"
            with open(screenshot_path, "wb") as f:
                content = await screenshot.read()
                f.write(content)

        # 创建反馈记录
        feedback = Feedback(
            username=username,
            feedback_type=feedback_type,
            rating=rating,
            title=title,
            description=description,
            screenshot_path=screenshot_path,
            page_url=str(request.url),
            user_agent=request.headers.get('user-agent', ''),
            contact_email=contact_email
        )
        db.add(feedback)
        db.commit()

        # 记录操作日志
        log_operation(
            db,
            username,
            "提交反馈",
            details=f"反馈类型: {feedback_type}, 标题: {title}",
            ip_address=request.client.host if request else None
        )

        return {"success": True, "message": "反馈提交成功，感谢您的建议！"}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/admin/feedbacks")
async def get_feedbacks(
    limit: int = 100,
    status: Optional[str] = None,
    feedback_type: Optional[str] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin)
):
    """获取用户反馈（仅管理员）"""
    query = db.query(Feedback)

    if status:
        query = query.filter(Feedback.status == status)

    if feedback_type:
        query = query.filter(Feedback.feedback_type == feedback_type)

    feedbacks = query.order_by(Feedback.created_at.desc()).limit(limit).all()

    return [
        {
            "id": f.id,
            "username": f.username,
            "feedback_type": f.feedback_type,
            "rating": f.rating,
            "title": f.title,
            "description": f.description,
            "screenshot_path": f.screenshot_path,
            "page_url": f.page_url,
            "user_agent": f.user_agent,
            "contact_email": f.contact_email,
            "status": f.status,
            "admin_reply": f.admin_reply,
            "created_at": f.created_at.isoformat(),
            "updated_at": f.updated_at.isoformat()
        }
        for f in feedbacks
    ]

@app.post("/api/admin/feedbacks/{feedback_id}/reply")
async def reply_feedback(
    feedback_id: int,
    admin_reply: str = Form(...),
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin)
):
    """回复用户反馈（仅管理员）"""
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="反馈不存在")

    feedback.admin_reply = admin_reply
    feedback.status = 'resolved'
    feedback.updated_at = datetime.utcnow()
    db.commit()

    return {"success": True, "message": "回复已提交"}

@app.get("/api/admin/stats")
async def get_stats(db: Session = Depends(get_db), admin_user: User = Depends(is_admin)):
    """获取统计信息（仅管理员）"""
    total_users = db.query(User).count()
    total_logs = db.query(OperationLog).count()
    successful_operations = db.query(OperationLog).filter(OperationLog.status == 'success').count()
    failed_operations = db.query(OperationLog).filter(OperationLog.status == 'failed').count()
    total_feedbacks = db.query(Feedback).count()
    pending_feedbacks = db.query(Feedback).filter(Feedback.status == 'pending').count()
    temporary_accounts = db.query(User).filter(User.is_temporary == True).count()
    expired_accounts = db.query(User).filter(
        User.is_temporary == True,
        User.expires_at < datetime.utcnow()
    ).count()

    return {
        "total_users": total_users,
        "temporary_accounts": temporary_accounts,
        "expired_accounts": expired_accounts,
        "total_operations": total_logs,
        "successful_operations": successful_operations,
        "failed_operations": failed_operations,
        "total_feedbacks": total_feedbacks,
        "pending_feedbacks": pending_feedbacks
    }

@app.post("/api/admin/temp-accounts")
async def create_temp_account(
    days_valid: int = Form(7),
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin)
):
    """创建临时账号（仅管理员）"""
    account = create_temporary_account(db, days_valid=days_valid)

    # 记录操作日志
    log_operation(
        db,
        admin_user.username,
        "创建临时账号",
        details=f"用户名: {account['username']}, 有效期: {days_valid}天"
    )

    return {
        "success": True,
        "message": "临时账号创建成功",
        "account": {
            "username": account['username'],
            "password": account['password'],
            "expires_at": account['expires_at'].isoformat(),
            "days_valid": account['days_valid']
        }
    }

@app.get("/api/admin/temp-accounts")
async def get_temp_accounts(
    include_expired: bool = False,
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin)
):
    """获取临时账号列表（仅管理员）"""
    query = db.query(User).filter(User.is_temporary == True)

    if not include_expired:
        query = query.filter(User.expires_at > datetime.utcnow())

    accounts = query.order_by(User.created_at.desc()).all()

    return [
        {
            "username": u.username,
            "created_at": u.created_at.isoformat(),
            "expires_at": u.expires_at.isoformat() if u.expires_at else None,
            "is_expired": check_user_expired(u),
            "days_remaining": max(0, (u.expires_at - datetime.utcnow()).days) if u.expires_at else None
        }
        for u in accounts
    ]

@app.delete("/api/admin/temp-accounts/{username}")
async def delete_temp_account(
    username: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(is_admin)
):
    """删除临时账号（仅管理员）"""
    user = db.query(User).filter(User.username == username, User.is_temporary == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="临时账号不存在")

    db.delete(user)
    db.commit()

    # 记录操作日志
    log_operation(
        db,
        admin_user.username,
        "删除临时账号",
        details=f"用户名: {username}"
    )

    return {"success": True, "message": "临时账号已删除"}

# 导出 app 变量，供 uvicorn 使用
app_instance = app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "server_with_auth:app_instance",
        host="0.0.0.0",
        port=port,
        reload=False,
        workers=1,
        log_level="info"
    )
