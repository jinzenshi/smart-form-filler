-- ============================================
-- Supabase Storage 权限策略设置脚本
-- ============================================
-- 请在 Supabase Dashboard → SQL Editor 中运行此脚本
-- 这将为文件上传功能创建必要的 RLS 策略

-- ============================================
-- 1. 启用存储桶的 RLS（行级安全）
-- ============================================

-- 为存储对象启用 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 创建公共访问策略
-- ============================================

-- 允许所有人查看公共存储桶中的文件
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']));

-- 允许所有人上传文件到指定的存储桶
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']));

-- 允许所有人更新公共存储桶中的文件
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']))
WITH CHECK (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']));

-- 允许所有人删除公共存储桶中的文件
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = ANY(ARRAY['docx-files', 'user-info', 'feedback-screenshots']));

-- ============================================
-- 3. 验证策略是否创建成功
-- ============================================

-- 查看已创建的所有存储策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================
-- 完成说明
-- ============================================
-- 策略创建完成后，请确保以下存储桶设置为 Public：
-- 1. docx-files
-- 2. user-info
-- 3. feedback-screenshots
--
-- 设置路径：Supabase Dashboard → Storage → 点击bucket名称 → Edit bucket
-- 确保 "Public bucket" 选项已勾选
