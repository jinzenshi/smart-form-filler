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
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 检查组件是否已卸载
  function isUnmounted() {
    return isUnmountedRef.current || !containerRef.current
  }

  // 清理超时定时器
  function cleanupTimeout() {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current)
      timeoutTimerRef.current = null
    }
  }

  // 加载 docx-preview 库
  async function loadDocxLibrary(): Promise<void> {
    if (docxLibraryRef.current) return

    try {
      const docxModule = await import('docx-preview')
      docxLibraryRef.current = docxModule.default || docxModule
      console.log('DocxPreview: docx-preview library loaded, available functions:', Object.keys(docxLibraryRef.current))
      console.log('DocxPreview: renderDocx:', typeof docxLibraryRef.current.renderDocx)
      console.log('DocxPreview: renderAsync:', typeof docxLibraryRef.current.renderAsync)
    } catch (err) {
      console.error('DocxPreview: Failed to load docx-preview library:', err)
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
      cleanupTimeout()
      setShowContent(true)
      setLoading(false)
      onRendered?.()
      cleanupObserver()
      console.log('DocxPreview: Content rendered successfully')
      return true
    }
    return false
  }

  // 强制显示内容（用于超时处理）
  function forceShowContent() {
    if (isUnmounted()) return false
    const content = containerRef.current
    if (content) {
      const hasContent = content.children.length > 0 || content.innerHTML.trim().length > 0
      if (hasContent) {
        cleanupTimeout()
        setShowContent(true)
        setLoading(false)
        onRendered?.()
        cleanupObserver()
        console.log('DocxPreview: Force showed content')
        return true
      }
    }
    return false
  }

  // 渲染预览
  const renderPreview = useCallback(async () => {
    if (!blob || !containerRef.current || isUnmountedRef.current) {
      console.log('DocxPreview: Skipping render - missing requirements', {
        hasBlob: !!blob,
        hasContainer: !!containerRef.current,
        isUnmounted: isUnmountedRef.current
      })
      return
    }

    console.log('DocxPreview: Starting render, blob size:', blob.size)
    cleanupTimeout()
    setError(undefined)
    setLoading(true)
    retryCountRef.current++

    try {
      await loadDocxLibrary()

      // 清空容器 - 再次检查 ref
      if (isUnmounted()) return
      console.log('DocxPreview: Clearing container')
      containerRef.current.innerHTML = ''

      // 获取渲染函数 - 优先使用 renderDocx，否则使用 renderAsync
      const renderDocx = docxLibraryRef.current.renderDocx
      const renderAsync = docxLibraryRef.current.renderAsync
      const renderFn = renderDocx || renderAsync

      if (typeof renderFn !== 'function') {
        console.error('DocxPreview: No render function available. renderDocx:', typeof renderDocx, 'renderAsync:', typeof renderAsync)
        throw new Error('docx-preview 渲染函数不可用')
      }

      console.log('DocxPreview: Setting up MutationObserver')

      // 设置 MutationObserver 监听内容变化
      cleanupObserver()
      observerRef.current = new MutationObserver(() => {
        console.log('DocxPreview: MutationObserver triggered')
        checkContentRendered()
      })

      if (!isUnmounted() && containerRef.current) {
        observerRef.current.observe(containerRef.current, {
          childList: true,
          subtree: true
        })
      }

      // 渲染选项 - 使用更稳定的配置
      const renderOptions = {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        breakPages: true,
        useBase64URL: false, // 改为 false，避免可能的 base64 问题
        enableMultiWorker: false,
      }

      console.log('DocxPreview: Starting renderDocx with options:', renderOptions, 'using:', renderFn === renderAsync ? 'renderAsync' : 'renderDocx')

      // 使用 Promise 包装渲染调用
      // renderAsync 签名: renderAsync(document, bodyContainer, styleContainer, options)
      // renderAsync 返回一个 Promise，需要等待它完成
      const renderResult = renderFn(blob, containerRef.current!, null, renderOptions)
      if (renderResult instanceof Promise) {
        await renderResult
      }
      console.log('DocxPreview: renderDocx called successfully')

      // 等待一下让内容渲染
      await new Promise(resolve => setTimeout(resolve, 500))

      // 检查内容
      if (!checkContentRendered()) {
        console.log('DocxPreview: No content after first check, waiting...')
        // 如果没有内容，强制等待后检查
        await new Promise(resolve => setTimeout(resolve, 2500))

        if (!checkContentRendered()) {
          console.log('DocxPreview: No content after second check, setting timeout')
          // 设置超时，强制显示已渲染的内容或报告错误
          timeoutTimerRef.current = setTimeout(() => {
            console.log('DocxPreview: Timeout reached, checking content...')
            if (!forceShowContent()) {
              console.log('DocxPreview: Still no content, retrying or showing error')
              if (retryCountRef.current < maxRetries && !isUnmountedRef.current) {
                // 重试
                console.log('DocxPreview: Retrying...')
                setTimeout(() => renderPreview(), 1500)
              } else if (!isUnmountedRef.current) {
                const msg = '文档加载失败，请重试'
                setError(msg)
                onError?.(msg)
                setLoading(false)
              }
            }
          }, 3000)
          return
        }
      }

    } catch (err: any) {
      console.error('DocxPreview render error:', err.message || err)

      // 检查是否有内容
      if (!isUnmounted() && containerRef.current && containerRef.current.children.length > 0) {
        console.log('DocxPreview: Error but content exists, showing it')
        setShowContent(true)
        setLoading(false)
        onRendered?.()
        return
      }

      if (retryCountRef.current < maxRetries && !isUnmountedRef.current) {
        console.log('DocxPreview: Retrying after error...')
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
      console.log('DocxPreview: Blob changed, starting render')
      retryCountRef.current = 0
      renderPreview()
    }
    return () => {
      isUnmountedRef.current = true
      cleanupObserver()
      cleanupTimeout()
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
