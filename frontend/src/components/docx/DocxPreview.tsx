'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface DocxPreviewProps {
  blob: Blob | null
  onRendered?: () => void
  onError?: (error: string) => void
}

export function DocxPreview({ blob, onRendered, onError }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const docxLibRef = useRef<any>(null)
  const currentBlobRef = useRef<Blob | null>(null)
  const isRenderingRef = useRef(false)
  const hasRenderedRef = useRef(false)

  // 渲染函数
  const renderDocx = useCallback(async () => {
    if (!blob || !containerRef.current) return
    if (isRenderingRef.current) return
    if (currentBlobRef.current === blob && hasRenderedRef.current) return

    isRenderingRef.current = true
    currentBlobRef.current = blob

    setLoading(true)
    setError(undefined)

    try {
      // 动态导入 docx-preview
      const docxModule = await import('docx-preview')
      docxLibRef.current = docxModule.default || docxModule

      // 清空容器
      containerRef.current.innerHTML = ''

      // 转换 blob 为 arrayBuffer
      const buffer = blob instanceof ArrayBuffer
        ? blob
        : await blob.arrayBuffer()

      // 调用渲染 - 不更新任何状态，避免触发重渲染
      const renderAsync = docxLibRef.current.renderAsync
      if (typeof renderAsync === 'function' && containerRef.current) {
        await renderAsync(buffer, containerRef.current, containerRef.current, {
          className: 'docx-preview-wrapper',
          inWrapper: false,
          ignoreWidth: false,
          breakPages: true,
          useBase64URL: true,
        })

        // 标记渲染完成，但不更新状态
        hasRenderedRef.current = true
        isRenderingRef.current = false
      } else {
        throw new Error('renderAsync function not available')
      }
    } catch (err: any) {
      console.error('DocxPreview render error:', err)
      isRenderingRef.current = false
      const msg = err.message || '文档渲染失败'
      setError(msg)
      setLoading(false)
      onError?.(msg)
    }
  }, [blob, onError])

  // blob 变化时触发渲染
  useEffect(() => {
    if (blob) {
      // 延迟渲染，确保容器已挂载
      const timer = setTimeout(() => {
        renderDocx()
      }, 500)
      return () => {
        clearTimeout(timer)
        isRenderingRef.current = false
      }
    } else {
      currentBlobRef.current = null
      hasRenderedRef.current = false
      setLoading(false)
      setError(undefined)
    }
  }, [blob, renderDocx])

  // 重试处理
  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    currentBlobRef.current = null
    hasRenderedRef.current = false
    isRenderingRef.current = false
    setError(undefined)
    if (blob) {
      renderDocx()
    }
  }

  // 渲染容器内容
  const renderContent = () => {
    if (error) {
      return (
        <>
          <div className="error-overlay">
            <span className="error-icon">⚠</span>
            <p>{error}</p>
            <button className="btn btn-secondary btn-sm" onClick={handleRetry}>
              重试
            </button>
          </div>
        </>
      )
    }

    if (loading) {
      return (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>正在加载文档...</p>
        </div>
      )
    }

    if (!blob) {
      return (
        <div className="placeholder-overlay">
          <span className="docx-icon">📝</span>
          <p>上传模板并填写信息后</p>
          <p>即可预览生成效果</p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="docx-preview">
      <div ref={containerRef} className="docx-preview-content docx-wrapper">
        {renderContent()}
      </div>
    </div>
  )
}
