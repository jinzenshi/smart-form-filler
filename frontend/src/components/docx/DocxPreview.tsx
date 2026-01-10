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
  const currentBlobRef = useRef<Blob | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 检查 blob 是否仍然有效（防止 stale callbacks）
  function isCurrentBlob(blob: Blob | null) {
    return blob === currentBlobRef.current && containerRef.current
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
    // 优先使用 ref，如果 ref 为 null，则尝试直接查询 DOM
    let content: HTMLElement | null = containerRef.current
    if (!content) {
      content = document.querySelector('.docx-preview-loading, .docx-preview-content, .docx-preview-error')
    }
    if (!content) {
      console.log('DocxPreview: checkContentRendered - no container found')
      return false
    }
    // 使用 innerHTML 长度检测，因为 docx-preview 在 loading-spinner 内部渲染内容
    const innerHTMLLength = content.innerHTML.length
    // 超过 1000 字符认为有内容渲染
    const hasContent = innerHTMLLength > 1000
    const hasDocxWrapper = content.innerHTML.includes('docx-wrapper')
    console.log('DocxPreview: checkContentRendered - innerHTMLLength:', innerHTMLLength, 'hasContent:', hasContent, 'hasDocxWrapper:', hasDocxWrapper)
    if (hasContent || hasDocxWrapper) {
      cleanupTimeout()
      // 直接操作 DOM 移除 loading 状态
      content.classList.remove('loading-spinner')
      content.classList.add('docx-preview-content')
      // 移除 loading-spinner 子元素，保留内容
      const spinner = content.querySelector('.loading-spinner')
      if (spinner) {
        const spinnerContent = spinner.innerHTML
        spinner.remove()
        content.innerHTML = spinnerContent
      }
      // 强制 React 重新渲染
      const currentHTML = content.innerHTML
      content.innerHTML = ''
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          content!.innerHTML = currentHTML
        })
      })
      setShowContent(true)
      setLoading(false)
      onRendered?.()
      cleanupObserver()
      console.log('DocxPreview: Content rendered successfully')
      return true
    }
    return false
  }

  // 强制显示内容（用于超时处理）- 直接操作 DOM
  function forceShowContent() {
    // 优先使用 ref，如果 ref 为 null，则尝试直接查询 DOM
    let content: HTMLElement | null = containerRef.current
    if (!content) {
      content = document.querySelector('.docx-preview-loading, .docx-preview-content, .docx-preview-error')
    }
    if (!content) return false

    // 使用 innerHTML 长度检测
    const innerHTMLLength = content.innerHTML.length
    const hasContent = innerHTMLLength > 1000
    const hasDocxWrapper = content.innerHTML.includes('docx-wrapper')
    console.log('DocxPreview: forceShowContent - innerHTMLLength:', innerHTMLLength, 'hasContent:', hasContent, 'hasDocxWrapper:', hasDocxWrapper)
    if (hasContent || hasDocxWrapper) {
      cleanupTimeout()
      // 直接操作 DOM 移除 loading 状态
      content.classList.remove('loading-spinner')
      content.classList.add('docx-preview-content')
      // 移除 loading-spinner 子元素，保留内容
      const spinner = content.querySelector('.loading-spinner')
      if (spinner) {
        const spinnerContent = spinner.innerHTML
        spinner.remove()
        content.innerHTML = spinnerContent
      }
      // 强制 React 重新渲染
      const currentHTML = content.innerHTML
      content.innerHTML = ''
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          content!.innerHTML = currentHTML
        })
      })
      setShowContent(true)
      setLoading(false)
      onRendered?.()
      cleanupObserver()
      console.log('DocxPreview: Force showed content')
      return true
    }
    return false
  }

  // 渲染预览
  const renderPreview = useCallback(async () => {
    // 优先使用 ref，如果 ref 为 null，则尝试直接查询 DOM
    let content = containerRef.current
    if (!content) {
      content = document.querySelector('.docx-preview-loading, .docx-preview-content, .docx-preview-error')
    }

    if (!blob || !content) {
      console.log('DocxPreview: Skipping render - missing requirements', {
        hasBlob: !!blob,
        hasContainer: !!content
      })
      return
    }

    // 设置当前 blob（用于检测 stale callbacks）
    currentBlobRef.current = blob

    console.log('DocxPreview: Starting render, blob size:', blob.size)
    cleanupTimeout()
    setError(undefined)
    setLoading(true)
    retryCountRef.current++

    try {
      await loadDocxLibrary()

      // 清空容器
      console.log('DocxPreview: Clearing container')
      content.innerHTML = ''

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
        // 直接检测并更新状态，不依赖 checkContentRendered
        const content = containerRef.current
        if (content) {
          // 使用 innerHTML 长度作为主要检测（docx-preview 使用 wrapper 结构）
          const innerHTMLLength = content.innerHTML.length
          const hasContent = innerHTMLLength > 1000 // 大于 1000 字符认为有内容
          console.log('DocxPreview: Observer check - innerHTML length:', innerHTMLLength, 'hasContent:', hasContent)
          if (hasContent) {
            cleanupTimeout()
            // 直接操作 DOM 移除 loading 状态
            content.classList.remove('loading-spinner')
            content.classList.add('docx-preview-content')
            // 移除 loading-spinner 子元素，保留内容
            const spinner = content.querySelector('.loading-spinner')
            if (spinner) {
              const spinnerContent = spinner.innerHTML
              spinner.remove()
              // 强制刷新：重新设置 innerHTML
              content.innerHTML = spinnerContent
            }
            // 强制 React 重新渲染：保存当前内容，临时清空再恢复
            const currentHTML = content.innerHTML
            content.innerHTML = ''
            // 使用 requestAnimationFrame 确保 DOM 更新
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                content.innerHTML = currentHTML
              })
            })
            setShowContent(true)
            setLoading(false)
            onRendered?.()
            cleanupObserver()
            console.log('DocxPreview: Content rendered successfully (from observer)')
          }
        }
      })

      if (containerRef.current) {
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
        useBase64URL: true, // 使用 base64 URL 避免可能的 worker 问题
        debug: true, // 启用调试模式捕获隐藏错误
      }

      console.log('DocxPreview: Starting renderDocx with options:', renderOptions, 'using:', renderFn === renderAsync ? 'renderAsync' : 'renderDocx')

      // renderAsync 签名: renderAsync(document, bodyContainer, styleContainer, options)
      // renderAsync 返回一个 Promise，在服务器环境可能表现不同
      // 我们不等待 Promise 完成，而是依赖 MutationObserver 和 Promise resolve 回调来检测内容变化
      try {
        const renderResult = renderFn(blob, containerRef.current!, null, renderOptions)
        console.log('DocxPreview: renderDocx called, result type:', typeof renderResult)
        // 如果是 Promise，添加成功/失败处理但不阻塞
        if (renderResult instanceof Promise) {
          renderResult
            .then(() => {
              console.log('DocxPreview: renderAsync promise resolved, checking content...')
              // 等待一下让 DOM 更新，然后强制检查并更新状态
              setTimeout(() => {
                const content = containerRef.current
                if (content) {
                  const innerHTMLLength = content.innerHTML.length
                  console.log('DocxPreview: After promise resolve, innerHTML length:', innerHTMLLength)
                  if (innerHTMLLength > 1000) {
                    cleanupTimeout()
                    // 直接操作 DOM 移除 loading 状态
                    content.classList.remove('loading-spinner')
                    content.classList.add('docx-preview-content')
                    // 移除 loading-spinner 子元素，保留内容
                    const spinner = content.querySelector('.loading-spinner')
                    if (spinner) {
                      const spinnerContent = spinner.innerHTML
                      spinner.remove()
                      // 强制刷新：重新设置 innerHTML
                      content.innerHTML = spinnerContent
                    }
                    // 强制 React 重新渲染：保存当前内容，临时清空再恢复
                    const currentHTML = content.innerHTML
                    content.innerHTML = ''
                    // 使用 requestAnimationFrame 确保 DOM 更新
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        content.innerHTML = currentHTML
                      })
                    })
                    setShowContent(true)
                    setLoading(false)
                    onRendered?.()
                    cleanupObserver()
                    console.log('DocxPreview: Content rendered successfully (from promise callback)')
                  }
                }
              }, 500)
            })
            .catch((err: any) => {
              console.error('DocxPreview: renderAsync promise rejected:', err)
            })
        }
      } catch (renderError: any) {
        console.error('DocxPreview: renderDocx threw error:', renderError)
        throw renderError
      }

      // 等待一下让内容渲染（减少等待时间，因为 renderAsync 已经在后台运行）
      await new Promise(resolve => setTimeout(resolve, 300))

      // 检查内容
      if (!checkContentRendered()) {
        console.log('DocxPreview: No content after first check, waiting...')
        // 如果没有内容，强制等待后检查
        await new Promise(resolve => setTimeout(resolve, 1500))

        if (!checkContentRendered()) {
          console.log('DocxPreview: No content after second check, setting timeout')
          // 设置超时，强制显示已渲染的内容或报告错误
          timeoutTimerRef.current = setTimeout(() => {
            console.log('DocxPreview: Timeout reached, checking content...')
            if (!forceShowContent()) {
              console.log('DocxPreview: Still no content, retrying or showing error')
              if (retryCountRef.current < maxRetries && containerRef.current) {
                // 重试
                console.log('DocxPreview: Retrying...')
                setTimeout(() => renderPreview(), 1500)
              } else if (containerRef.current) {
                const msg = '文档加载失败，请重试'
                setError(msg)
                onError?.(msg)
                setLoading(false)
              }
            }
          }, 2000)
          return
        }
      }

    } catch (err: any) {
      console.error('DocxPreview render error:', err.message || err)

      // 检查是否有内容
      if (containerRef.current && containerRef.current.children.length > 0) {
        console.log('DocxPreview: Error but content exists, showing it')
        setShowContent(true)
        setLoading(false)
        onRendered?.()
        return
      }

      if (retryCountRef.current < maxRetries && containerRef.current) {
        console.log('DocxPreview: Retrying after error...')
        setTimeout(() => renderPreview(), 1500)
        return
      }

      if (containerRef.current) {
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
      // 清理时检查是否是当前 blob，避免干扰新 blob 的渲染
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
