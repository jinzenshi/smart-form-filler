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
  const [showContent, setShowContent] = useState(false)
  const docxLibraryRef = useRef<any>(null)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const observerRef = useRef<MutationObserver | null>(null)
  const isUnmountedRef = useRef(false)

  // 检查组件是否已卸载
  function isUnmounted() {
    return isUnmountedRef.current || !containerRef.current
  }

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

  // 清理 observer
  function cleanupObserver() {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }

  // 检测内容是否已渲染
  function checkContentRendered() {
    if (isUnmounted()) return false
    if (containerRef.current && containerRef.current.children.length > 0) {
      setShowContent(true)
      setLoading(false)
      onRendered?.()
      cleanupObserver()
      return true
    }
    return false
  }

  // 渲染预览
  const renderPreview = useCallback(async () => {
    if (!blob || !containerRef.current || isUnmountedRef.current) return

    setError(undefined)
    setLoading(true)
    retryCountRef.current++

    try {
      await loadDocxLibrary()

      // 清空容器 - 再次检查 ref
      if (isUnmounted()) return
      containerRef.current.innerHTML = ''

      // 获取渲染函数
      const renderFn = docxLibraryRef.current.renderDocx || docxLibraryRef.current.renderAsync

      if (typeof renderFn !== 'function') {
        throw new Error('docx-preview 渲染函数不可用')
      }

      // 设置 MutationObserver 监听内容变化
      cleanupObserver()
      observerRef.current = new MutationObserver(() => {
        checkContentRendered()
      })

      if (!isUnmounted() && containerRef.current) {
        observerRef.current.observe(containerRef.current, {
          childList: true,
          subtree: true
        })
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

      // 开始渲染
      await renderFn(blob, containerRef.current, renderOptions)

      // 等待一下让内容渲染
      await new Promise(resolve => setTimeout(resolve, 500))

      // 检查内容
      if (!checkContentRendered()) {
        // 如果没有内容，可能是资源加载错误，继续等待
        await new Promise(resolve => setTimeout(resolve, 3000))
        if (!checkContentRendered()) {
          // 设置超时，强制显示已渲染的内容
          setTimeout(() => {
            if (!isUnmounted() && containerRef.current && containerRef.current.children.length > 0) {
              setShowContent(true)
              setLoading(false)
              onRendered?.()
            } else if (retryCountRef.current < maxRetries && !isUnmountedRef.current) {
              // 重试
              setTimeout(() => renderPreview(), 1500)
            } else if (!isUnmountedRef.current) {
              setError('文档加载失败，请重试')
              onError?.('文档加载失败，请重试')
              setLoading(false)
            }
          }, 5000)
          return
        }
      }

    } catch (err: any) {
      console.error('DocxPreview render error:', err)

      // 检查是否有内容
      if (!isUnmounted() && containerRef.current && containerRef.current.children.length > 0) {
        setShowContent(true)
        setLoading(false)
        onRendered?.()
        return
      }

      if (retryCountRef.current < maxRetries && !isUnmountedRef.current) {
        setTimeout(() => renderPreview(), 1500)
        return
      }

      if (!isUnmountedRef.current) {
        const errorMsg = err.message || '文档加载失败，请重试'
        setError(errorMsg)
        onError?.(errorMsg)
        setLoading(false)
      }
    }
  }, [blob, onRendered, onError])

  // blob 变化时触发渲染
  useEffect(() => {
    if (blob && !showContent) {
      retryCountRef.current = 0
      renderPreview()
    }
    return () => {
      isUnmountedRef.current = true
      cleanupObserver()
    }
  }, [blob, showContent, renderPreview])

  // 重试处理
  function handleRetry(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    retryCountRef.current = 0
    setError(undefined)
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
