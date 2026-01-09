'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface DocxPreviewProps {
  blob: Blob | null
  onRendered?: () => void
  onError?: (error: string) => void
}

export function DocxPreview({ blob, onRendered, onError }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const docxLibraryRef = useRef<any>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 加载 docx-preview 库
  async function loadDocxLibrary(): Promise<void> {
    if (docxLibraryRef.current) return

    try {
      const docxModule = await import('docx-preview')
      docxLibraryRef.current = docxModule.default || docxModule
    } catch (err) {
      console.error('Failed to load docx-preview library:', err)
      throw new Error('docx-preview 库加载失败')
    }
  }

  // 清理函数
  function cleanup() {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current)
      renderTimeoutRef.current = null
    }
  }

  // 渲染预览 - 使用稳定引用
  const renderPreview = useCallback(async () => {
    if (!blob || !containerRef.current) return

    cleanup()
    setError(undefined)
    setLoading(true)
    retryCountRef.current++

    try {
      await loadDocxLibrary()

      // 清空容器
      containerRef.current.innerHTML = ''

      // 获取渲染函数
      const renderFn = docxLibraryRef.current.renderDocx || docxLibraryRef.current.renderAsync

      if (typeof renderFn !== 'function') {
        throw new Error('docx-preview 渲染函数不可用')
      }

      // 渲染选项
      const renderOptions = {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        breakPages: true,
        useBase64URL: true,
        enableMultiWorker: false,
      }

      // 创建超时保护
      const renderPromise = renderFn(blob, containerRef.current, renderOptions)

      renderTimeoutRef.current = setTimeout(() => {
        // 如果渲染超时，强制显示已渲染的内容
        if (!showContent) {
          console.warn('DocxPreview render timeout, showing partial content')
          setRendered(true)
          setShowContent(true)
          onRendered?.()
        }
      }, 8000) // 8秒超时

      await renderPromise

      // 渲染成功
      cleanup()
      setRendered(true)
      setShowContent(true)
      onRendered?.()

    } catch (err: any) {
      cleanup()
      console.error('DocxPreview render error:', err)

      // 如果还有重试次数，延迟重试
      if (retryCountRef.current < maxRetries) {
        setLoading(true)
        renderTimeoutRef.current = setTimeout(() => {
          renderPreview()
        }, 1500)
        return
      }

      const errorMsg = err.message || '文档加载失败，请重试'
      setError(errorMsg)
      onError?.(errorMsg)
      setLoading(false)
    }
  }, [blob, showContent, onRendered, onError])

  // blob 变化时触发渲染
  useEffect(() => {
    if (blob && !showContent) {
      retryCountRef.current = 0
      renderPreview()
    }
    return cleanup
  }, [blob, showContent, renderPreview])

  // 重试处理
  function handleRetry(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    retryCountRef.current = 0
    setError(undefined)
    setRendered(false)
    setShowContent(false)
    renderPreview()
  }

  // 如果已经渲染成功，显示内容
  if (showContent) {
    return (
      <div className="docx-preview">
        <div ref={containerRef} className="docx-preview-content"></div>
      </div>
    )
  }

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

  if (loading) {
    return (
      <div className="docx-preview-loading">
        <div className="loading-spinner"></div>
        <p>正在加载文档...</p>
      </div>
    )
  }

  return (
    <div className="docx-preview">
      <div ref={containerRef} className="docx-preview-content"></div>
    </div>
  )
}
