'use client'

import { useEffect, useRef, useState } from 'react'

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
  const docxLibraryRef = useRef<any>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 3

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

  // 渲染预览
  async function renderPreview() {
    if (!blob || !containerRef.current) return

    setError(undefined)
    setLoading(true)
    retryCountRef.current++

    try {
      await loadDocxLibrary()

      // 清空容器
      containerRef.current.innerHTML = ''

      // 使用 renderDocx 替代 renderAsync，减少外部请求
      const renderFn = docxLibraryRef.current.renderDocx || docxLibraryRef.current.renderAsync

      if (typeof renderFn !== 'function') {
        throw new Error('docx-preview 渲染函数不可用')
      }

      // 渲染选项 - 禁用外部资源加载
      const renderOptions = {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        breakPages: true,
        useBase64URL: true,
        enableMultiWorker: false,
        // 添加自定义解析器来处理字体加载
        experimental: true,
      }

      await renderFn(blob, containerRef.current, renderOptions)

      setRendered(true)
      onRendered?.()
    } catch (err: any) {
      console.error('DocxPreview render error:', err)

      // 如果还有重试次数，延迟重试
      if (retryCountRef.current < maxRetries) {
        setLoading(true)
        setTimeout(() => {
          renderPreview()
        }, 1000)
        return
      }

      const errorMsg = err.message || '文档加载失败，请重试'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      if (retryCountRef.current >= maxRetries) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (blob && !rendered) {
      retryCountRef.current = 0
      renderPreview()
    }
  }, [blob])

  // 重试处理
  function handleRetry(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    retryCountRef.current = 0
    setError(undefined)
    setRendered(false)
    renderPreview()
  }

  // 如果已经渲染成功，显示内容
  if (rendered) {
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
