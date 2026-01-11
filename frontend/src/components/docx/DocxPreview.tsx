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
  const [hasContent, setHasContent] = useState(false)
  const docxLibRef = useRef<any>(null)
  const currentBlobRef = useRef<Blob | null>(null)
  const isMountedRef = useRef(true)
  const isRenderingRef = useRef(false)

  // 组件卸载时标记
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 安全调用回调
  const safeCallRendered = useCallback(() => {
    try {
      onRendered?.()
    } catch (e) {
      console.error('onRendered callback error:', e)
    }
  }, [onRendered])

  // 安全设置状态
  const safeSetState = useCallback((setter: () => void) => {
    try {
      if (isMountedRef.current) {
        setter()
      }
    } catch (e) {
      console.error('State setter error:', e)
    }
  }, [])

  // 渲染函数
  const renderDocx = useCallback(async () => {
    if (!blob || !containerRef.current) return
    if (isRenderingRef.current) return // 防止重复渲染
    if (currentBlobRef.current === blob) return // 防止重复渲染同一个 blob

    isRenderingRef.current = true
    currentBlobRef.current = blob

    safeSetState(() => {
      setLoading(true)
      setError(undefined)
      setHasContent(false)
    })

    try {
      // 动态导入 docx-preview
      const docxModule = await import('docx-preview')
      docxLibRef.current = docxModule.default || docxModule

      // 清空容器
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      // 转换 blob 为 arrayBuffer
      const buffer = blob instanceof ArrayBuffer
        ? blob
        : await blob.arrayBuffer()

      // 调用渲染
      const renderAsync = docxLibRef.current.renderAsync
      if (typeof renderAsync === 'function' && containerRef.current) {
        await renderAsync(buffer, containerRef.current, containerRef.current, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          breakPages: true,
          useBase64URL: true,
        })

        // 渲染成功 - 只更新状态，不调用回调（避免潜在问题）
        safeSetState(() => {
          setHasContent(true)
          setLoading(false)
        })
      } else {
        throw new Error('renderAsync function not available')
      }
    } catch (err: any) {
      console.error('DocxPreview render error:', err)
      safeSetState(() => {
        const msg = err.message || '文档渲染失败'
        setError(msg)
        setLoading(false)
        if (onError) {
          try {
            onError(msg)
          } catch (e) {
            console.error('onError callback error:', e)
          }
        }
      })
    } finally {
      isRenderingRef.current = false
    }
  }, [blob, onError, safeSetState, onRendered])

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
      safeSetState(() => {
        setHasContent(false)
        setLoading(false)
        setError(undefined)
      })
    }
  }, [blob, renderDocx, safeSetState])

  // 重试处理
  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    currentBlobRef.current = null
    isRenderingRef.current = false
    safeSetState(() => {
      setError(undefined)
    })
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

    if (loading || (!hasContent && blob)) {
      return (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>正在加载文档...</p>
        </div>
      )
    }

    if (!blob && !hasContent) {
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
