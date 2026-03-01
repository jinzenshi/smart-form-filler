import os
import time
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request, Body
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json

# 导入核心模块
from core import fill_form, analyze_missing_fields, audit_template
from models import init_db, User, OperationLog, Feedback, FileStorage, SessionLocal, SimpleUser
from auth import (
    get_db, hash_password, verify_password, create_user,
    authenticate_user, log_operation, get_current_user, is_admin,
    generate_token, security, create_temporary_account, check_user_expired
)
from supabase_client import upload_file_to_supabase, delete_file_from_supabase, generate_unique_filename

app = FastAPI(title="智能填表系统")

# CORS 中间件：允许 Vercel 前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有域名，生产环境可限制为具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FILE_RETENTION_HOURS = int(os.getenv("FILE_RETENTION_HOURS", "24"))
FILE_CLEANUP_INTERVAL_SECONDS = int(os.getenv("FILE_CLEANUP_INTERVAL_SECONDS", "1800"))
LAST_FILE_CLEANUP_AT = None
SERVICE_STARTED_AT_UTC = datetime.now(timezone.utc)

BUCKET_MAP = {
    "docx": "docx-files",
    "user_info": "user-info",
    "screenshot": "feedback-screenshots"
}


def resolve_docx_upload(docx: Optional[UploadFile], docx_file: Optional[UploadFile]) -> UploadFile:
    """兼容新旧上传字段：优先 docx，其次 docx_file。"""
    upload = docx or docx_file
    if not upload:
        raise HTTPException(status_code=422, detail="缺少 docx 文件，请使用字段 docx")
    return upload


def cleanup_expired_files(db: Session):
    """删除超过保留期的文件记录与远端文件（默认24小时）"""
    cutoff = datetime.utcnow() - timedelta(hours=FILE_RETENTION_HOURS)
    expired_files = db.query(FileStorage).filter(FileStorage.created_at < cutoff).all()

    deleted_count = 0
    failed_count = 0

    for file_record in expired_files:
        bucket_name = BUCKET_MAP.get(file_record.file_type)
        deleted_remote = True
        if bucket_name:
            deleted_remote = delete_file_from_supabase(bucket_name, file_record.file_path)

        if deleted_remote:
            db.delete(file_record)
            deleted_count += 1
        else:
            failed_count += 1

    if deleted_count:
        db.commit()

    if expired_files:
        print(
            f"🧹 文件保留清理：total={len(expired_files)}, deleted={deleted_count}, failed={failed_count}, cutoff={cutoff.isoformat()}"
        )

    return {
        "total": len(expired_files),
        "deleted": deleted_count,
        "failed": failed_count,
    }


def maybe_cleanup_expired_files(db: Session):
    """按时间间隔执行文件清理，避免每次请求都全表扫描"""
    global LAST_FILE_CLEANUP_AT

    now = datetime.utcnow()
    if LAST_FILE_CLEANUP_AT and (now - LAST_FILE_CLEANUP_AT).total_seconds() < FILE_CLEANUP_INTERVAL_SECONDS:
        return None

    LAST_FILE_CLEANUP_AT = now
    return cleanup_expired_files(db)


# 应用启动事件
@app.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库"""
    print("🚀 启动中...")
    init_db()

    db = SessionLocal()
    try:
        maybe_cleanup_expired_files(db)
    finally:
        db.close()

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

# Token 验证函数（仅查看余额，不检查余额充足性）
async def verify_token_for_balance(request: Request, db: Session = Depends(get_db)):
    """Token登录验证中间件 - 仅用于查看余额，不检查余额是否充足"""
    auth_header = request.headers.get('Authorization', '')

    # 检查是否是Bearer token
    if not auth_header or not auth_header.startswith('Bearer '):
        return None

    token = auth_header.split(' ', 1)[1]

    # 查找token用户
    user = db.query(SimpleUser).filter(
        SimpleUser.token == token,
        SimpleUser.is_active == True
    ).first()

    if not user:
        return None

    # 检查过期时间（即使查看余额，过期了也不能查看）
    if user.expires_at and user.expires_at < datetime.utcnow():
        raise HTTPException(status_code=403, detail="Token已过期")

    return user

# Token 验证函数（完整验证，包括余额检查）
async def verify_token_auth(request: Request, db: Session = Depends(get_db)):
    """Token登录验证中间件"""
    auth_header = request.headers.get('Authorization', '')

    # 检查是否是Bearer token
    if not auth_header or not auth_header.startswith('Bearer '):
        return None

    token = auth_header.split(' ', 1)[1]

    # 查找token用户
    user = db.query(SimpleUser).filter(
        SimpleUser.token == token,
        SimpleUser.is_active == True
    ).first()

    if not user:
        return None  # 返回None而不是抛出异常，让其他认证方式尝试

    # 检查余额
    if user.balance <= 0:
        raise HTTPException(status_code=403, detail="余额不足，请联系管理员充值")

    # 检查过期时间
    if user.expires_at and user.expires_at < datetime.utcnow():
        raise HTTPException(status_code=403, detail="Token已过期")

    # 更新最后使用时间
    user.last_used_at = datetime.utcnow()
    db.commit()

    return user

# 包装函数来处理可选的用户认证
async def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """获取当前用户，如果认证失败则返回None（不抛出异常）"""
    try:
        # 尝试获取认证信息
        auth_header = request.headers.get('Authorization', '')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ', 1)[1]
        if not token or len(token) < 3:
            return None

        # token格式: username:timestamp:random
        parts = token.split(':')
        if len(parts) != 3:
            return None

        username = parts[0]
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None

        return user
    except:
        return None

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

@app.get("/api/version")
async def api_version():
    """运行版本信息，便于线上部署核验"""
    now = datetime.now(timezone.utc)
    commit = (
        os.getenv("RENDER_GIT_COMMIT")
        or os.getenv("GIT_COMMIT")
        or os.getenv("VERCEL_GIT_COMMIT_SHA")
        or "unknown"
    )
    return {
        "success": True,
        "service": "smart-form-filler-backend",
        "commit": commit,
        "started_at_utc": SERVICE_STARTED_AT_UTC.isoformat(),
        "now_utc": now.isoformat(),
        "uptime_seconds": int((now - SERVICE_STARTED_AT_UTC).total_seconds()),
    }

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

async def get_authenticated_user(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
    token_user: Optional[SimpleUser] = Depends(verify_token_auth)
):
    """双认证用户获取函数 - 支持用户名密码和Token两种方式"""
    # 如果是Token用户，直接返回
    if token_user:
        return {"user": token_user, "type": "token", "username": token_user.token[:8] + "..."}

    # 如果是普通用户，返回用户名
    if current_user:
        return {"user": current_user, "type": "normal", "username": current_user.username}

    # 如果都没有，返回None
    return None

@app.post("/api/process")
async def process(
    docx: Optional[UploadFile] = File(None),
    docx_file: Optional[UploadFile] = File(None),
    user_info_text: str = Form(...),
    auth_token: Optional[str] = Form(None),  # 从表单获取token（保留兼容性）
    preview: Optional[str] = Form(None),  # 是否预览模式
    fill_data: Optional[str] = Form(None),  # 预览时返回的填充数据，下载时可直接使用
    db: Session = Depends(get_db),
    request: Request = None,
    auth_result: dict = Depends(get_authenticated_user)
):
    """处理文档（需要认证）- 支持预览和下载两种模式，双认证（用户名密码/Token）"""
    try:
        if not auth_result:
            raise HTTPException(status_code=401, detail="未认证，请登录或使用有效Token")

        user = auth_result["user"]
        user_type = auth_result["type"]
        username = auth_result["username"]

        maybe_cleanup_expired_files(db)
        upload_docx = resolve_docx_upload(docx, docx_file)
        docx_bytes = await upload_docx.read()

        # 上传文件到 Supabase Storage（仅在非预览模式下）
        if preview != 'true':
            # 1. 上传 DOCX 文件
            docx_filename = generate_unique_filename(upload_docx.filename, "docx_")
            docx_path = f"{username}/{docx_filename}"
            docx_url = upload_file_to_supabase(
                docx_bytes,
                "docx-files",
                docx_path,
                upload_docx.content_type
            )

            # 2. 上传用户信息文件（保存为 txt）
            user_info_filename = generate_unique_filename(f"{username}_user_info.txt", "user_info_")
            user_info_path = f"{username}/{user_info_filename}"
            user_info_bytes = user_info_text.encode('utf-8')
            user_info_url = upload_file_to_supabase(
                user_info_bytes,
                "user-info",
                user_info_path,
                "text/plain"
            )

            # 准备提交数据
            submitted_data = {
                "docx_filename": upload_docx.filename,
                "docx_size": len(docx_bytes),
                "docx_url": docx_url,
                "user_info_preview": user_info_text[:500] + "..." if len(user_info_text) > 500 else user_info_text,
                "user_info_length": len(user_info_text),
                "user_info_url": user_info_url
            }

            # 记录操作日志（获取日志ID用于关联文件记录）
            log_id = log_operation(
                db,
                username,
                "提交文档处理",
                details=f"文件名: {upload_docx.filename}, 用户类型: {user_type}",
                submitted_data=submitted_data,
                ip_address=request.client.host if request else None
            )

            # 保存文件信息到数据库
            # DOCX 文件记录
            db.add(FileStorage(
                username=username,
                file_type="docx",
                original_filename=upload_docx.filename,
                file_path=docx_path,
                public_url=docx_url,
                file_size=len(docx_bytes),
                content_type=upload_docx.content_type,
                operation_log_id=log_id
            ))

            # 用户信息文件记录
            db.add(FileStorage(
                username=username,
                file_type="user_info",
                original_filename=f"{username}_user_info.txt",
                file_path=user_info_path,
                public_url=user_info_url,
                file_size=len(user_info_bytes),
                content_type="text/plain",
                operation_log_id=log_id
            ))

            db.commit()

        # 处理文档（填充表单）
        # 优化：减少重复推理 - 预览时返回 fill_data，下载时可以使用
        if preview == 'true':
            # 预览模式：返回填充数据
            output_bytes, returned_fill_data, missing_fields = fill_form(docx_bytes, user_info_text, None, return_fill_data=True)

            import base64
            output_base64 = base64.b64encode(output_bytes).decode('utf-8')

            # 构建消息
            if missing_fields:
                message = f"预览生成完成，有 {len(missing_fields)} 个字段未能自动填充，请补全信息后重新生成"
            else:
                message = "预览数据生成成功，请在前端查看预览效果"

            print(f"📋 返回给前端的 missing_fields: {missing_fields}")

            return {
                "success": True,
                "mode": "preview",
                "filename": "filled.docx",
                "data": output_base64,
                "fill_data": json.dumps(returned_fill_data),  # 返回 JSON 字符串
                "missing_fields": missing_fields,  # 返回缺失字段列表
                "message": message
            }
        else:
            # 下载模式：如果有 fill_data，直接复用预览结果，避免重复 AI 推理
            if fill_data and fill_data.strip():
                try:
                    prefilled_data = json.loads(fill_data)
                    if isinstance(prefilled_data, dict):
                        print("📝 使用预览阶段 fill_data 直接填充文档（跳过 AI 推理）")
                        output_bytes = fill_form(docx_bytes, user_info_text, None, prefilled_data=prefilled_data)
                    else:
                        print("⚠️ fill_data 不是字典，回退到 AI 推理")
                        output_bytes = fill_form(docx_bytes, user_info_text, None)
                except Exception as parse_error:
                    print(f"⚠️ fill_data 解析失败，回退到 AI 推理: {parse_error}")
                    output_bytes = fill_form(docx_bytes, user_info_text, None)
            else:
                # 没有 fill_data，调用 AI 推理
                output_bytes = fill_form(docx_bytes, user_info_text, None)

        # 如果是Token用户，只有在首次下载文件时扣减余额（预览模式和重复下载不扣减）
        if user_type == "token" and preview != 'true' and not fill_data:
            user.balance -= 1
            db.commit()
            print(f"💰 Token用户 {username} 余额剩余: {user.balance}")

            # 如果余额为0，提示用户
            if user.balance == 0:
                print(f"⚠️ Token用户 {username} 余额已用完")

        # 直接下载模式
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
            if 'username' in locals():
                log_operation(db, username, "文档处理失败", details=str(e), status='failed')
        except:
            pass
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/analyze-missing")
async def analyze_missing(
    docx: Optional[UploadFile] = File(None),
    docx_file: Optional[UploadFile] = File(None),
    user_info_text: str = Form(...),
    auth_result: dict = Depends(get_optional_current_user)
):
    """
    分析模板和个人信息，返回可能缺失的字段列表
    这是一个轻量级检测，不需要完整认证
    """
    try:
        upload_docx = resolve_docx_upload(docx, docx_file)
        docx_bytes = await upload_docx.read()

        # 调用分析函数
        missing_fields = analyze_missing_fields(docx_bytes, user_info_text)

        return {
            "success": True,
            "missing_fields": missing_fields,
            "message": f"发现 {len(missing_fields)} 个可能缺失的字段" if missing_fields else "未发现明显缺失的字段"
        }
    except Exception as e:
        print(f"❌ 分析缺失字段 API 错误: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/api/audit-template")
async def audit_template_api(
    docx: Optional[UploadFile] = File(None),
    docx_file: Optional[UploadFile] = File(None),
    user_info_text: str = Form(...),
    auth_result: dict = Depends(get_optional_current_user)
):
    """
    审核模板变量与个人信息的匹配情况
    返回每个占位符的匹配状态和值
    """
    try:
        upload_docx = resolve_docx_upload(docx, docx_file)
        docx_bytes = await upload_docx.read()

        # 调用审核函数
        result = audit_template(docx_bytes, user_info_text)

        if result.get("success"):
            return {
                "success": True,
                "items": result.get("items", []),
                "matched_count": result.get("matched_count", 0),
                "missing_count": result.get("missing_count", 0),
                "message": f"已匹配 {result.get('matched_count', 0)} 个字段，{result.get('missing_count', 0)} 个字段缺失"
            }
        else:
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": result.get("error", "Unknown error")}
            )
    except Exception as e:
        print(f"❌ 审核模板 API 错误: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/admin/users")
async def get_users(
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """获取用户列表（仅管理员）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

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
    auth_result: dict = Depends(get_authenticated_user)
):
    """获取操作日志（仅管理员）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

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

        # 处理截图上传到 Supabase Storage
        screenshot_url = None
        if screenshot:
            screenshot_filename = generate_unique_filename(screenshot.filename, "screenshot_")
            screenshot_path = f"{username}/{screenshot_filename}"
            screenshot_bytes = await screenshot.read()
            screenshot_url = upload_file_to_supabase(
                screenshot_bytes,
                "feedback-screenshots",
                screenshot_path,
                screenshot.content_type
            )

            # 保存截图文件信息到数据库
            db.add(FileStorage(
                username=user.username,
                file_type="screenshot",
                original_filename=screenshot.filename,
                file_path=screenshot_path,
                public_url=screenshot_url,
                file_size=len(screenshot_bytes),
                content_type=screenshot.content_type
            ))

        # 创建反馈记录
        feedback = Feedback(
            username=username,
            feedback_type=feedback_type,
            rating=rating,
            title=title,
            description=description,
            screenshot_path=screenshot_url,  # 使用 URL 而不是本地路径
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
    auth_result: dict = Depends(get_authenticated_user)
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
    auth_result: dict = Depends(get_authenticated_user)
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
async def get_stats(db: Session = Depends(get_db), auth_result: dict = Depends(get_authenticated_user)):
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
    auth_result: dict = Depends(get_authenticated_user)
):
    """创建临时账号（仅管理员）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    account = create_temporary_account(db, days_valid=days_valid)

    # 记录操作日志（包含密码）
    log_operation(
        db,
        admin_user.username,
        "创建临时账号",
        details=f"用户名: {account['username']}, 密码: {account['password']}, 有效期: {days_valid}天"
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
    auth_result: dict = Depends(get_authenticated_user)
):
    """获取临时账号列表（仅管理员）"""
    query = db.query(User).filter(User.is_temporary == True)

    if not include_expired:
        query = query.filter(User.expires_at > datetime.now(timezone.utc))

    accounts = query.order_by(User.created_at.desc()).all()

    # 查询所有创建临时账号的日志，以获取密码
    logs = db.query(OperationLog).filter(
        OperationLog.operation == "创建临时账号"
    ).all()

    # 创建密码映射
    password_map = {}
    for log in logs:
        # 从details中提取用户名和密码
        if "用户名:" in log.details and "密码:" in log.details:
            try:
                parts = log.details.split(", ")
                username_part = parts[0].replace("用户名: ", "")
                password_part = parts[1].replace("密码: ", "")
                password_map[username_part] = password_part
            except:
                pass

    return [
        {
            "username": u.username,
            "password": password_map.get(u.username, "未知（请联系管理员）"),
            "created_at": u.created_at.isoformat(),
            "expires_at": u.expires_at.isoformat() if u.expires_at else None,
            "is_expired": check_user_expired(u),
            "days_remaining": (
                max(0, (u.expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).days)
                if u.expires_at else None
            )
        }
        for u in accounts
    ]

@app.get("/api/admin/files")
async def get_files(
    limit: int = 100,
    file_type: Optional[str] = None,
    username: Optional[str] = None,
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """获取文件列表（仅管理员）"""
    query = db.query(FileStorage)

    if file_type:
        query = query.filter(FileStorage.file_type == file_type)

    if username:
        query = query.filter(FileStorage.username == username)

    files = query.order_by(FileStorage.created_at.desc()).limit(limit).all()

    return [
        {
            "id": f.id,
            "username": f.username,
            "file_type": f.file_type,
            "original_filename": f.original_filename,
            "file_path": f.file_path,
            "public_url": f.public_url,
            "file_size": f.file_size,
            "content_type": f.content_type,
            "created_at": f.created_at.isoformat()
        }
        for f in files
    ]

@app.get("/api/admin/file-retention/status")
async def file_retention_status(
    run_cleanup: bool = False,
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """查看文件保留策略状态（仅管理员）"""
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    now = datetime.utcnow()
    cutoff = now - timedelta(hours=FILE_RETENTION_HOURS)

    total_files = db.query(FileStorage).count()
    expired_files = db.query(FileStorage).filter(FileStorage.created_at < cutoff).count()

    cleanup_result = None
    if run_cleanup:
        global LAST_FILE_CLEANUP_AT
        cleanup_result = cleanup_expired_files(db)
        LAST_FILE_CLEANUP_AT = datetime.utcnow()

    return {
        "retention_hours": FILE_RETENTION_HOURS,
        "cleanup_interval_seconds": FILE_CLEANUP_INTERVAL_SECONDS,
        "last_cleanup_at": LAST_FILE_CLEANUP_AT.isoformat() if LAST_FILE_CLEANUP_AT else None,
        "cutoff": cutoff.isoformat(),
        "total_files": total_files,
        "expired_files": expired_files,
        "cleanup_result": cleanup_result
    }

# ========== Token 用户相关 API ==========

@app.get("/api/token/balance")
async def get_token_balance(
    request: Request,
    db: Session = Depends(get_db),
    token_user: SimpleUser = Depends(verify_token_for_balance)
):
    """获取Token用户余额（不检查余额是否充足）"""
    # 如果不是token用户，返回错误
    if token_user is None:
        # 检查是否是普通用户（用户名密码登录）
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            # 有token但不是有效的token用户
            raise HTTPException(status_code=401, detail="无效的Token或Token已过期")
        else:
            # 没有提供认证信息
            raise HTTPException(status_code=401, detail="请先登录或使用Token")

    return {
        "balance": token_user.balance,
        "total_balance": token_user.total_balance,
        "token": token_user.token[:8] + "..." if len(token_user.token) > 8 else token_user.token
    }

@app.post("/api/admin/generate-tokens")
async def generate_tokens(
    count: int = Form(10),
    balance: int = Form(10),
    days_valid: int = Form(30),
    request: Request = None,
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """生成Token（管理员功能）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    import secrets

    # 获取基础URL
    base_url = str(request.base_url).rstrip('/') if request else "https://smart-form-filler-1.onrender.com"

    tokens = []
    for _ in range(count):
        # 生成32位随机字符串
        new_token = secrets.token_hex(16)
        expires_at = datetime.utcnow() + timedelta(days=days_valid)

        token_user = SimpleUser(
            token=new_token,
            balance=balance,
            total_balance=balance,
            expires_at=expires_at
        )
        db.add(token_user)
        tokens.append({
            "token": new_token,
            "link": f"{base_url}/?t={new_token}",
            "balance": balance,
            "expires_at": expires_at.isoformat()
        })

    db.commit()

    # 记录操作日志
    log_operation(
        db,
        admin_user.username,
        "生成Token",
        details=f"生成{count}个Token，每个余额{balance}，有效期{days_valid}天",
        ip_address=request.client.host if request else None
    )

    return {"success": True, "tokens": tokens}

@app.get("/api/admin/simple-users")
async def get_simple_users(
    limit: int = 100,
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """获取Token用户列表（仅管理员）"""
    users = db.query(SimpleUser).order_by(SimpleUser.created_at.desc()).limit(limit).all()

    return [
        {
            "id": u.id,
            "token": u.token,
            "balance": u.balance,
            "total_balance": u.total_balance,
            "created_at": u.created_at.isoformat(),
            "last_used_at": u.last_used_at.isoformat() if u.last_used_at else None,
            "expires_at": u.expires_at.isoformat() if u.expires_at else None,
            "is_active": u.is_active
        }
        for u in users
    ]

@app.delete("/api/admin/files/{file_id}")
async def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """删除文件（仅管理员）"""
    file_record = db.query(FileStorage).filter(FileStorage.id == file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="文件不存在")

    # 从 Supabase Storage 删除文件
    bucket_name = BUCKET_MAP.get(file_record.file_type)
    if bucket_name:
        delete_file_from_supabase(bucket_name, file_record.file_path)

    # 从数据库删除记录
    db.delete(file_record)
    db.commit()

    return {"success": True, "message": "文件已删除"}

@app.delete("/api/admin/temp-accounts/{username}")
async def delete_temp_account(
    username: str,
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """删除临时账号（仅管理员）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

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

# ==================== 批量操作 API ====================

@app.post("/api/admin/simple-users/batch-delete")
async def batch_delete_simple_users(
    tokens: list = Body(...),
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """批量删除Token（仅管理员）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    # 删除Token
    deleted_count = 0
    for token in tokens:
        user = db.query(SimpleUser).filter(SimpleUser.token == token).first()
        if user:
            db.delete(user)
            deleted_count += 1

    db.commit()

    # 记录操作日志
    log_operation(
        db,
        admin_user.username,
        "批量删除Token",
        details=f"删除了{deleted_count}个Token"
    )

    return {"success": True, "deleted_count": deleted_count}

@app.post("/api/admin/simple-users/export")
async def export_simple_users(
    tokens: Optional[list] = Body(None),
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user),
    request: Request = None
):
    """导出Token列表为CSV（仅管理员）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    # 如果指定了tokens，只导出选中的
    if tokens:
        users = db.query(SimpleUser).filter(SimpleUser.token.in_(tokens)).order_by(SimpleUser.created_at.desc()).all()
    else:
        users = db.query(SimpleUser).order_by(SimpleUser.created_at.desc()).all()

    # 获取基础URL
    base_url = str(request.base_url).rstrip('/') if request else "https://smart-form-filler-1.onrender.com"

    # 生成CSV内容
    csv_lines = ["Token,余额,总余额,创建时间,过期时间,链接"]
    for user in users:
        link = f"{base_url}/?t={user.token}"
        expires = user.expires_at.isoformat() if user.expires_at else "永不过期"
        created = user.created_at.isoformat()
        csv_lines.append(f'"{user.token}",{user.balance},{user.total_balance},"{created}","{expires}","{link}"')

    csv_content = "\n".join(csv_lines)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tokens_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@app.post("/api/admin/temp-accounts/batch-delete")
async def batch_delete_temp_accounts(
    usernames: list = Body(...),
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """批量删除临时账号（仅管理员）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    # 删除临时账号
    deleted_count = 0
    for username in usernames:
        user = db.query(User).filter(User.username == username, User.is_temporary == True).first()
        if user:
            db.delete(user)
            deleted_count += 1

    db.commit()

    # 记录操作日志
    log_operation(
        db,
        admin_user.username,
        "批量删除临时账号",
        details=f"删除了{deleted_count}个临时账号"
    )

    return {"success": True, "deleted_count": deleted_count}

@app.post("/api/admin/temp-accounts/export")
async def export_temp_accounts(
    usernames: Optional[list] = Body(None),
    db: Session = Depends(get_db),
    auth_result: dict = Depends(get_authenticated_user)
):
    """导出临时账号列表为CSV（仅管理员）"""
    # 检查是否是管理员
    if not auth_result or auth_result["type"] != "normal":
        raise HTTPException(status_code=403, detail="需要管理员权限")

    admin_user = auth_result["user"]
    if not admin_user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    # 如果指定了usernames，只导出选中的
    if usernames:
        users = db.query(User).filter(
            User.is_temporary == True,
            User.username.in_(usernames)
        ).order_by(User.created_at.desc()).all()
    else:
        users = db.query(User).filter(User.is_temporary == True).order_by(User.created_at.desc()).all()

    # 查询所有创建临时账号的日志，以获取密码
    logs = db.query(OperationLog).filter(
        OperationLog.operation == "创建临时账号"
    ).all()

    # 创建密码映射
    password_map = {}
    for log in logs:
        # 从details中提取用户名和密码
        # 格式: "用户名: xxx, 密码: xxx, 有效期: xxx天"
        if "用户名:" in log.details and "密码:" in log.details:
            try:
                parts = log.details.split(", ")
                username_part = parts[0].replace("用户名: ", "")
                password_part = parts[1].replace("密码: ", "")
                password_map[username_part] = password_part
            except:
                pass

    # 生成CSV内容
    csv_lines = ["用户名,密码,创建时间,过期时间,剩余天数,状态"]
    for user in users:
        is_expired = check_user_expired(user)
        days_remaining = (
            max(0, (user.expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).days)
            if user.expires_at else None
        )
        status = "已过期" if is_expired else "有效"
        created = user.created_at.isoformat()
        expires = user.expires_at.isoformat() if user.expires_at else "-"

        # 从映射中获取密码
        password = password_map.get(user.username, "未知（请联系管理员）")
        days_str = str(days_remaining) if days_remaining is not None else '-'

        csv_lines.append(f'"{user.username}","{password}","{created}","{expires}",{days_str},"{status}"')

    csv_content = "\n".join(csv_lines)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=temp_accounts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

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
