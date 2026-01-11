'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface DocxPreviewProps {
  blob: Blob | null
  onRendered?: () => void
  onError?: (error: string) => void
}

export function DocxPreview({ blob, onRendered, onError }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const styleRef = useRef<HTMLStyleElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [hasContent, setHasContent] = useState(false)
  const docxLibRef = useRef<any>(null)
  const currentBlobRef = useRef<Blob | null>(null)
  const isMountedRef = useRef(true)

  // 组件卸载时标记
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 渲染函数
  const renderDocx = useCallback(async () => {
    // 确保容器已挂载
    if (!containerRef.current) {
      console.warn('DocxPreview: container not ready, waiting...')
      setTimeout(renderDocx, 100)
      return
    }

    if (!blob) return

    // 防止重复渲染同一个 blob
    if (currentBlobRef.current === blob) return
    currentBlobRef.current = blob

    setLoading(true)
    setError(undefined)
    setHasContent(false)

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

      // 创建独立的 style 元素
      if (!styleRef.current && containerRef.current.parentElement) {
        styleRef.current = document.createElement('style')
        containerRef.current.parentElement.insertBefore(
          styleRef.current,
          containerRef.current
        )
      }

      // 调用渲染
      const renderAsync = docxLibRef.current.renderAsync
      if (typeof renderAsync === 'function') {
        // renderAsync 需要 bodyContainer 和 styleContainer
        // 如果没有独立的 style 元素，使用 bodyContainer 作为 styleContainer
        const styleContainer = styleRef.current || containerRef.current
        await renderAsync(buffer, containerRef.current, styleContainer, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          breakPages: true,
          useBase64URL: true,
        })

        // 渲染成功
        if (isMountedRef.current) {
          setHasContent(true)
          setLoading(false)
          onRendered?.()
        }
      } else {
        throw new Error('renderAsync function not available')
      }
    } catch (err: any) {
      console.error('DocxPreview render error:', err)
      if (isMountedRef.current) {
        const msg = err.message || '文档渲染失败'
        setError(msg)
        onError?.(msg)
        setLoading(false)
      }
    }
  }, [blob, onRendered, onError])

  // blob 变化时触发渲染
  useEffect(() => {
    if (blob) {
      renderDocx()
    } else {
      currentBlobRef.current = null
      setHasContent(false)
      setLoading(false)
      setError(undefined)
    }
  }, [blob, renderDocx])

  // 重试处理
  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    currentBlobRef.current = null
    setError(undefined)
    if (blob) {
      renderDocx()
    }
  }

  // 错误状态
  if (error) {
    return (
      <div className="docx-preview-error">
        <span className="error-icon">⚠</span>
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={handleRetry}>
          重试
        </button>
      </div>
    )
  }

  // 加载状态
  if (loading) {
    return (
      <div className="docx-preview-loading">
        <div className="loading-spinner"></div>
        <p>正在加载文档...</p>
      </div>
    )
  }

  // 空状态
  if (!hasContent && !blob) {
    return (
      <div className="docx-preview-placeholder">
        <span className="docx-icon">📝</span>
        <p>上传模板并填写信息后</p>
        <p>即可预览生成效果</p>
      </div>
    )
  }

  // 内容状态
  return (
    <div className="docx-preview">
      <div ref={containerRef} className="docx-preview-content docx-wrapper"></div>
    </div>
  )
}
