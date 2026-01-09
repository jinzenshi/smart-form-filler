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
  const docxLibraryRef = useRef<any>(null)

  // 加载 docx-preview 库
  async function loadDocxLibrary(): Promise<void> {
    if (docxLibraryRef.current) return

    try {
      const docxModule = await import('docx-preview')
      docxLibraryRef.current = docxModule.default || docxModule
    } catch (err) {
      throw new Error('docx-preview 库加载失败')
    }
  }

  // 等待库加载
  async function waitForLibrary(maxAttempts = 50): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      if (typeof docxLibraryRef.current?.renderAsync === 'function') {
        return
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('库加载超时')
  }

  // 渲染预览
  async function renderPreview() {
    if (!blob || !containerRef.current) return

    setError(undefined)
    setLoading(true)

    try {
      await loadDocxLibrary()
      await waitForLibrary()

      // 清空容器
      containerRef.current.innerHTML = ''

      await docxLibraryRef.current.renderAsync(blob, containerRef.current, null, {
        className: 'docx-wrapper',
        inWrapper: true,
        ignoreWidth: false,
        breakPages: true,
        useBase64URL: true,
        enableMultiWorker: false,
      })

      onRendered?.()
    } catch (err: any) {
      const errorMsg = '文档加载失败，请重试'
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (blob) {
      renderPreview()
    }
  }, [blob])

  if (error) {
    return (
      <div className="docx-preview-error">
        <span className="error-icon">⚠</span>
        <p>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={renderPreview}>
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
