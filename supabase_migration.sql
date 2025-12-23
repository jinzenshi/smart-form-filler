-- =====================================================
-- 智能填表系统 - Supabase PostgreSQL 数据库迁移脚本
-- =====================================================
-- 用途：将 SQLite 数据迁移到 Supabase PostgreSQL
-- 作者：Claude Code
-- 日期：2025-12-23

-- 1. 创建数据库扩展（如果需要）
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建用户表
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_temporary BOOLEAN DEFAULT FALSE
);

-- 3. 创建操作日志表
-- =====================================================
CREATE TABLE IF NOT EXISTS operation_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    operation VARCHAR(100) NOT NULL,
    details TEXT,
    submitted_data TEXT,
    ip_address VARCHAR(50),
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建用户反馈表
-- =====================================================
CREATE TABLE IF NOT EXISTS feedbacks (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    feedback_type VARCHAR(20) NOT NULL,
    rating INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    screenshot_path VARCHAR(500),
    page_url VARCHAR(500),
    user_agent VARCHAR(500),
    contact_email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    admin_reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建索引以提升性能
-- =====================================================
-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_is_temporary ON users(is_temporary);
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at);

-- 操作日志表索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_username ON operation_logs(username);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_operation_logs_status ON operation_logs(status);

-- 反馈表索引
CREATE INDEX IF NOT EXISTS idx_feedbacks_username ON feedbacks(username);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_feedback_type ON feedbacks(feedback_type);

-- 6. 创建更新时间触发器函数
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. 为 feedbacks 表添加自动更新触发器
-- =====================================================
DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON feedbacks;
CREATE TRIGGER update_feedbacks_updated_at
    BEFORE UPDATE ON feedbacks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. 插入默认管理员账户
-- =====================================================
DO $$
DECLARE
    admin_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE username = 'admin') INTO admin_exists;
    
    IF NOT admin_exists THEN
        INSERT INTO users (username, password, is_admin)
        VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewISOB7vXEmt1XbK', TRUE);
        -- 密码: admin123
        RAISE NOTICE '默认管理员账户已创建: admin / admin123';
    ELSE
        RAISE NOTICE '管理员账户已存在';
    END IF;
END
$$;

-- 9. 创建视图（可选）
-- =====================================================
-- 用户统计视图
CREATE OR REPLACE VIEW user_statistics AS
SELECT
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE is_admin = TRUE) as admin_count,
    (SELECT COUNT(*) FROM users WHERE is_temporary = TRUE) as temporary_accounts,
    (SELECT COUNT(*) FROM users WHERE expires_at IS NOT NULL AND expires_at > NOW()) as active_temp_accounts,
    (SELECT COUNT(*) FROM users WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired_temp_accounts;

-- 操作统计视图
CREATE OR REPLACE VIEW operation_statistics AS
SELECT
    (SELECT COUNT(*) FROM operation_logs) as total_operations,
    (SELECT COUNT(*) FROM operation_logs WHERE status = 'success') as successful_operations,
    (SELECT COUNT(*) FROM operation_logs WHERE status = 'failed') as failed_operations,
    (SELECT COUNT(*) FROM operation_logs WHERE created_at >= NOW() - INTERVAL '30 days') as operations_last_30_days;

-- 反馈统计视图
CREATE OR REPLACE VIEW feedback_statistics AS
SELECT
    (SELECT COUNT(*) FROM feedbacks) as total_feedbacks,
    (SELECT COUNT(*) FROM feedbacks WHERE status = 'pending') as pending_feedbacks,
    (SELECT COUNT(*) FROM feedbacks WHERE status = 'resolved') as resolved_feedbacks,
    (SELECT COUNT(*) FROM feedbacks WHERE created_at >= NOW() - INTERVAL '30 days') as feedbacks_last_30_days,
    (SELECT AVG(rating) FROM feedbacks) as average_rating;

-- 10. 创建存储过程（可选）
-- =====================================================
-- 清理过期临时账号
CREATE OR REPLACE FUNCTION cleanup_expired_accounts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM users
    WHERE is_temporary = TRUE
      AND expires_at IS NOT NULL
      AND expires_at <= NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '清理了 % 个过期临时账号', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. 授予权限（在 Supabase 中可能需要调整）
-- =====================================================
-- 启用 RLS (Row Level Security)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 迁移完成
-- =====================================================
-- 执行完成后，数据库将包含：
-- - 3 个主要数据表（users, operation_logs, feedbacks）
-- - 性能优化索引
-- - 自动更新触发器
-- - 统计视图
-- - 默认管理员账户
-- - 存储过程

SELECT '数据库迁移完成！' as status;
