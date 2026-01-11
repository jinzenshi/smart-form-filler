'use client'

import { useEffect, useState } from 'react'
import DocViewer, { DocViewerRenderers } from 'react-doc-viewer'

interface DocPreviewProps {
  blob: Blob | null
  onRendered?: () => void
  onError?: (error: string) => void
}

export function DocxPreview({ blob, onRendered, onError }: DocPreviewProps) {
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [docs, setDocs] = useState<any[]>([])

  useEffect(() => {
    if (blob) {
      setLoading(true)
      setError(undefined)

      // 将 Blob 转换为 URL
      const url = URL.createObjectURL(blob)
      const document = {
        uri: url,
        fileName: 'document.docx',
        fileType: 'docx'
      }

      setDocs([document])
      setLoading(false)
      onRendered?.()

      // 清理 URL
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setDocs([])
    }
  }, [blob, onRendered])

  if (error) {
    return (
      <div className="docx-preview-error">
        <span className="error-icon">⚠</span>
        <p>{error}</p>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setError(undefined)}
        >
          重试
        </button>
      </div>
    )
  }

  if (docs.length === 0) {
    return (
      <div className="docx-preview-placeholder">
        <span className="docx-icon">📝</span>
        <p>上传模板并填写信息后</p>
        <p>即可预览生成效果</p>
      </div>
    )
  }

  return (
    <div className="docx-preview">
      <DocViewer
        documents={docs}
        pluginRenderers={DocViewerRenderers}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
