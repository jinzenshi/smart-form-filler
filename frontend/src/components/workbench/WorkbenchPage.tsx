'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { getAuthData } from '@/lib/auth-client'
import { processDocx, analyzeMissingFields, getTokenBalance, base64ToBlob } from '@/lib/docx'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/common/Toast'

// 默认模板 URL
const DEFAULT_TEMPLATE_URL = 'https://uwajqrjmamoaccslzrzo.supabase.co/storage/v1/object/public/docx-files/templates/template_20260107_091842_a18da2cb.docx'

// 默认用户信息
const DEFAULT_USER_INFO = `姓名：张*
性别：男
民族：汉
籍贯：湖南省长沙市
出生日期：1996年6月15日
参加工作时间：2018年7月
政治面貌：中共党员
婚姻状况：未婚
身份证号：43010119960615001*
学历：本科
毕业院校：湖南大学
专业：计算机科学与技术
特长：编程、项目管理
联系电话：138****1234
户口地址：湖南省长沙市岳麓区橘子洲路100号
常住地址：湖南省长沙市岳麓区麓谷大道188号

## 教育经历
1. 2014.09-2018.06 湖南大学 计算机科学与技术 本科

## 工作经历
1. 2018.07-2021.06 长沙某科技公司 软件开发工程师
2. 2021.07-至今 深圳某互联网公司 高级工程师

## 家庭主要成员
1. 姓名：张华  关系：父亲  工作单位：长沙某中学 教师
2. 姓名：李芳  关系：母亲  工作单位：长沙某医院 护士`

const LazyDocxPreview = dynamic(
  () => import('@/components/docx/DocxPreview').then((mod) => mod.DocxPreview),
  {
    ssr: false,
    loading: () => (
      <div className="preview-placeholder">
        <div className="placeholder-content">
          <span className="fun-icon">📝</span>
          <p className="placeholder-text">正在加载预览组件...</p>
        </div>
      </div>
    )
  }
)

export function WorkbenchPage() {
  const router = useRouter()
  const toast = useToast()
  const { token } = getAuthData()

  // Hydration guard
  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  // 文件上传状态
  const docxInputRef = useRef<HTMLInputElement>(null)
  const infoInputRef = useRef<HTMLInputElement>(null)
  const [docxFile, setDocxFile] = useState<File | null>(null)
  const [docxFileName, setDocxFileName] = useState('')
  const [infoFile, setInfoFile] = useState<File | null>(null)
  const [infoFileName, setInfoFileName] = useState('')

  // 信息填写方式
  const [infoTab, setInfoTab] = useState<'manual' | 'upload'>('manual')
  // 使用函数初始化器避免 hydration 不匹配
  const [userInfo, setUserInfo] = useState(() => DEFAULT_USER_INFO)

  // 预览状态
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [progressStep, setProgressStep] = useState(-1)

  // Token 余额
  const [tokenBalance, setTokenBalance] = useState<number | null>(null)

  // 下载确认弹窗
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false)
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null)

  // 默认模板
  const [defaultTemplateBlob, setDefaultTemplateBlob] = useState<Blob | null>(null)

  // Wizard 步骤状态 (1: 填写个人信息, 2: 上传模板, 3: 补充信息, 4: 预览结果)
  const [currentStep, setCurrentStep] = useState(1)

  // 补充信息状态 (Step 3)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [supplementaryInfo, setSupplementaryInfo] = useState('')
  const [analyzeLoading, setAnalyzeLoading] = useState(false)

  // 是否可以进入下一步
  const canGoToStep2 = userInfo.trim().length > 0
  const canGoToStep3 = docxFile || defaultTemplateBlob

  // 是否可以预览
  const canPreview = (docxFile || defaultTemplateBlob) && (userInfo.trim() || infoFile)

  // 初始化
  useEffect(() => {
    setMounted(true)
    // 从 localStorage 获取用户名
    const savedUsername = localStorage.getItem('username')
    setUsername(savedUsername)

    // 检查登录状态
    if (!token) {
      router.push('/login')
      return
    }

    // 加载 Token 余额
    loadTokenBalance()

    // 加载本地保存的用户信息
    loadUserInfo()
  }, [router, token])

  useEffect(() => {
    if (currentStep === 2 && !defaultTemplateBlob) {
      loadDefaultTemplate()
    }
  }, [currentStep, defaultTemplateBlob])

  // 加载默认模板
  async function loadDefaultTemplate(): Promise<Blob | null> {
    try {
      const response = await fetch(DEFAULT_TEMPLATE_URL)
      if (!response.ok) return null

      const blob = await response.blob()
      setDefaultTemplateBlob(blob)
      return blob
    } catch (e) {
      console.log('未找到内置模板文件')
      return null
    }
  }

  // 加载 Token 余额
  async function loadTokenBalance() {
    try {
      const data = await getTokenBalance()
      setTokenBalance(data.balance)
    } catch (e) {
      console.error('获取余额失败')
    }
  }

  // 加载本地保存的用户信息
  function loadUserInfo() {
    const saved = localStorage.getItem('user_info_text')
    if (saved) {
      setUserInfo(saved)
    }
  }

  // 保存用户信息到本地
  function saveUserInfo() {
    localStorage.setItem('user_info_text', userInfo)
  }

  // 文件选择处理
  function handleDocxSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.docx')) {
      setDocxFile(file)
      setDocxFileName(file.name)
    }
  }

  function handleInfoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setInfoFile(file)
      setInfoFileName(file.name)
      // 读取文件内容
      const reader = new FileReader()
      reader.onload = (ev) => {
        setUserInfo(ev.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  // 下载默认模板
  async function downloadTemplate() {
    let blob = defaultTemplateBlob
    if (!blob) {
      blob = await loadDefaultTemplate()
    }

    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '报名表模板.docx'
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }

  // 开始处理
  async function handlePreview() {
    if (!canPreview) return

    setLoading(true)
    setProgressStep(0)

    try {
      setProgressStep(1)

      const templateFile = docxFile || new File([defaultTemplateBlob!], '模板.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })

      setProgressStep(2)
      const response = await processDocx(templateFile, userInfo, true)

      if (response.success) {
        setProgressStep(3)
        if (response.data) {
          setPreviewBlob(base64ToBlob(response.data))
          setCurrentStep(4)
        } else {
          toast.error(response.message || '预览数据为空，请重试')
        }
      } else {
        toast.error(response.message || '处理失败')
      }
    } catch (e: any) {
      toast.error(e.message || '网络错误，请重试')
    } finally {
      setLoading(false)
      setProgressStep(-1)
    }
  }

  // 生成缺失字段的 placeholder 提示
  function generateMissingFieldsPlaceholder(): string {
    if (missingFields.length === 0) return ''
    return missingFields.map(field => `${field}: `).join('\n')
  }

  // 从第二步开始填充，分析缺失字段并跳转到第三步
  async function handleStartFill() {
    if (!canPreview) return

    setAnalyzeLoading(true)
    try {
      const templateFile = docxFile || new File([defaultTemplateBlob!], '模板.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })

      // 调用分析接口获取缺失字段
      const response = await analyzeMissingFields(templateFile, userInfo)

      if (response.success && response.missing_fields && response.missing_fields.length > 0) {
        // 有缺失字段，跳转到 Step 3
        setMissingFields(response.missing_fields)
        setSupplementaryInfo('')
        setCurrentStep(3)
      } else {
        // 无缺失字段，直接生成预览并跳转到 Step 4
        await handlePreview()
      }
    } catch (e: any) {
      toast.error(e.message || '分析失败，请重试')
    } finally {
      setAnalyzeLoading(false)
    }
  }

  // 确认补充信息后生成预览
  async function handleConfirmSupplement() {
    setLoading(true)
    setProgressStep(0)

    try {
      setProgressStep(1)

      // 合并用户信息和补充信息
      const mergedUserInfo = supplementaryInfo.trim()
        ? `${userInfo}\n\n## 补充信息\n${supplementaryInfo}`
        : userInfo

      const templateFile = docxFile || new File([defaultTemplateBlob!], '模板.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })

      setProgressStep(2)
      const response = await processDocx(templateFile, mergedUserInfo, true)

      if (response.success) {
        setProgressStep(3)
        if (response.data) {
          setPreviewBlob(base64ToBlob(response.data))
          setMissingFields([])  // 清空缺失字段
          setCurrentStep(4)  // 跳转到 Step 4
        } else {
          toast.error(response.message || '预览数据为空，请重试')
        }
      } else {
        toast.error(response.message || '处理失败')
      }
    } catch (e: any) {
      toast.error(e.message || '网络错误，请重试')
    } finally {
      setLoading(false)
      setProgressStep(-1)
    }
  }

  // 下载文档
  async function handleDownload() {
    if (previewBlob) {
      // 直接使用预览的 blob 下载
      setDownloadBlob(previewBlob)
      setShowDownloadConfirm(true)
      return
    }

    setLoading(true)
    try {
      const templateFile = docxFile || new File([defaultTemplateBlob!], '模板.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })

      const response = await processDocx(templateFile, userInfo, false)

      if (response.blob) {
        setDownloadBlob(response.blob)
        setShowDownloadConfirm(true)
        // 更新余额
        if (response.balance !== undefined) {
          setTokenBalance(response.balance)
        }
      } else if (response.success === false) {
        toast.error(response.message || '下载失败')
      }
    } catch (e: any) {
      toast.error(e.message || '网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 确认下载
  function confirmDownload() {
    if (downloadBlob) {
      const url = URL.createObjectURL(downloadBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = '报名表_已填写.docx'
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setShowDownloadConfirm(false)
    }
  }

  // 退出登录
  function handleLogout() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('username')
    router.push('/login')
  }

  // Wizard 导航
  function goToStep1() {
    setCurrentStep(1)
    setPreviewBlob(null)
    setMissingFields([])
    setSupplementaryInfo('')
  }

  function goToStep2() {
    if (canGoToStep2) {
      setCurrentStep(2)
      // 保留预览结果，用户可以返回查看
    }
  }

  function goToStep3() {
    // 只有存在缺失字段时才允许跳转到 Step 3
    if (missingFields.length > 0) {
      setCurrentStep(3)
    }
  }

  function goToStep4() {
    // 如果已经有预览结果，直接跳转到预览页面
    if (previewBlob) {
      setCurrentStep(4)
      return
    }
    // 否则需要检查前置条件
    if (canGoToStep3 && canGoToStep2) {
      setCurrentStep(4)
    }
  }

  return (
    <div className="workbench-page">
      {/* Header */}
      <header className="main-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="logo">
              <span className="logo-icon">◇</span>
              文档工坊
            </h1>
          </div>

          <div className="header-right">
            <div className="user-info">
              {mounted && username && (
                <>
                  <span className="user-avatar">{username.charAt(0).toUpperCase()}</span>
                  <span className="user-name">{username}</span>
                </>
              )}
              {mounted && tokenBalance !== null && (
                <span className="balance-badge">
                  {tokenBalance} Token
                </span>
              )}
            </div>

            <div className="user-actions">
              <a href="/admin" className="action-link">管理</a>
              <button className="logout-btn" onClick={handleLogout}>退出</button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Wizard Progress Indicator */}
        <div className="wizard-progress">
          <div className={`wizard-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`} onClick={goToStep1}>
            <div className="wizard-step-icon">{currentStep > 1 ? '✓' : '1'}</div>
            <span className="wizard-step-label">填写个人信息</span>
          </div>
          <div className={`wizard-connector ${currentStep >= 2 ? 'active' : ''}`}></div>
          <div className={`wizard-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`} onClick={goToStep2}>
            <div className="wizard-step-icon">{currentStep > 2 ? '✓' : '2'}</div>
            <span className="wizard-step-label">上传报名表</span>
          </div>
          <div className={`wizard-connector ${currentStep >= 3 ? 'active' : ''}`}></div>
          <div className={`wizard-step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`} onClick={missingFields.length > 0 ? goToStep3 : undefined}>
            <div className="wizard-step-icon">{currentStep > 3 ? '✓' : '3'}</div>
            <span className="wizard-step-label">补充信息</span>
          </div>
          <div className={`wizard-connector ${currentStep >= 4 ? 'active' : ''}`}></div>
          <div className={`wizard-step ${currentStep >= 4 ? 'active' : ''}`} onClick={goToStep4}>
            <div className="wizard-step-icon">4</div>
            <span className="wizard-step-label">预览结果</span>
          </div>
        </div>

        <div className="content-grid">
          {/* Left Panel - Editor (hide on step 4) */}
          {currentStep !== 4 && (
            <section className="panel editor-panel">
              <div className="panel-header">
                <h2>
                  <span className="panel-icon">✎</span>
                  {currentStep === 1 && '填写个人信息'}
                  {currentStep === 2 && '上传报名表'}
                  {currentStep === 3 && '补充信息'}
                </h2>
              </div>

              <div className="panel-body">
                {/* Step 1: Fill Personal Info */}
                {currentStep === 1 && (
                  <div className="wizard-content">
                    <div className="info-tabs">
                      <button
                        className={`tab-btn ${infoTab === 'manual' ? 'active' : ''}`}
                        onClick={() => setInfoTab('manual')}
                      >
                        手动填写
                      </button>
                      <button
                        className={`tab-btn ${infoTab === 'upload' ? 'active' : ''}`}
                        onClick={() => setInfoTab('upload')}
                      >
                        上传文件
                      </button>
                    </div>

                    {infoTab === 'manual' && (
                      <div className="tab-content">
                        <textarea
                          value={userInfo}
                          onChange={(e) => {
                            setUserInfo(e.target.value)
                            saveUserInfo()
                          }}
                          className="input textarea code-editor large-textarea"
                          placeholder="# 请填写要替换的变量信息..."
                          spellCheck={false}
                        />
                      </div>
                    )}

                    {infoTab === 'upload' && (
                      <div className="tab-content">
                        <div
                          className="file-upload-area"
                          onClick={() => infoInputRef.current?.click()}
                        >
                          <input
                            ref={infoInputRef}
                            type="file"
                            accept=".txt,.md,.markdown"
                            onChange={handleInfoSelect}
                          />
                          <div className="upload-content">
                            <span className="upload-icon">📋</span>
                            <span className="upload-text">{infoFileName || '点击上传个人信息文件'}</span>
                            <span className="upload-hint">支持 .txt .md 格式</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="wizard-actions">
                      <Button
                        variant="primary"
                        onClick={goToStep2}
                        disabled={!canGoToStep2}
                      >
                        下一步：上传报名表
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Upload Template */}
                {currentStep === 2 && (
                  <div className="wizard-content">
                    <div className="template-section">
                      <div className="step-header">
                        <h3>上传 DOCX 模板</h3>
                        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                          下载示例模板
                        </Button>
                      </div>
                      <div
                        className="file-upload-area"
                        onClick={() => docxInputRef.current?.click()}
                      >
                        <input
                          ref={docxInputRef}
                          type="file"
                          accept=".docx"
                          onChange={handleDocxSelect}
                        />
                        <div className="upload-content">
                          <span className="upload-icon">📄</span>
                          <span className="upload-text">{docxFileName || '点击或拖拽上传模板'}</span>
                          <span className="upload-hint">支持 .docx 格式，最大 10MB</span>
                        </div>
                      </div>
                      {docxFileName && <p className="file-note">✓ {docxFileName}</p>}
                    </div>

                    <div className="wizard-actions">
                      <Button variant="secondary" onClick={goToStep1}>
                        上一步
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleStartFill}
                        disabled={!canPreview || loading || analyzeLoading}
                      >
                        {analyzeLoading ? '分析中...' : loading ? '处理中...' : '开始填充并预览'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Supplement Missing Info */}
                {currentStep === 3 && (
                  <div className="wizard-content">
                    <div className="supplement-section">
                      <div className="supplement-header">
                        <h3>补充缺失信息</h3>
                      </div>
                      <div className="supplement-hint">
                        <span className="hint-icon">💡</span>
                        <p>以下字段未能从您的个人信息中自动匹配，请补充：</p>
                      </div>

                      {missingFields.length > 0 ? (
                        <div className="supplement-form">
                          <textarea
                            value={supplementaryInfo}
                            onChange={(e) => setSupplementaryInfo(e.target.value)}
                            className="input textarea code-editor large-textarea"
                            placeholder={generateMissingFieldsPlaceholder()}
                            spellCheck={false}
                          />
                          <p className="form-hint">
                            请按照「字段: 内容」的格式填写，例如：身高: 175cm
                          </p>
                        </div>
                      ) : (
                        <div className="no-missing-fields">
                          <span className="success-icon">✓</span>
                          <p>所有字段都已匹配，无需补充信息</p>
                        </div>
                      )}
                    </div>

                    <div className="wizard-actions">
                      <Button variant="secondary" onClick={goToStep2}>
                        上一步
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleConfirmSupplement}
                        disabled={loading || (missingFields.length > 0 && !supplementaryInfo.trim())}
                      >
                        {loading ? '处理中...' : '确认补充并生成预览'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Preview */}
                {currentStep === 4 && (
                  <div className="wizard-content">
                    {/* Actions */}
                    <div className="action-section">
                      <Button
                        className="action-btn"
                        disabled={!canPreview || loading}
                        onClick={handlePreview}
                      >
                        <span className="btn-icon">◉</span>
                        {loading ? '处理中...' : '重新生成预览'}
                      </Button>
                    </div>

                    <div className="wizard-actions">
                      <Button variant="secondary" onClick={goToStep2}>
                        上一步
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Right Panel - Preview (only show in step 4) */}
          {currentStep === 4 && (
            <section className="panel preview-panel">
              <div className="panel-header">
                <h2>
                  <span className="panel-icon">◫</span>
                  预览结果
                </h2>
                {previewBlob && (
                  <Button variant="primary" size="sm" onClick={handleDownload} disabled={loading}>
                    下载文档
                  </Button>
                )}
              </div>

              <div className="panel-body">
                {/* Progress Steps */}
                {loading && (
                  <div className="progress-steps">
                    <div className={`progress-step ${progressStep === 0 ? 'active' : ''} ${progressStep > 0 ? 'completed' : ''}`}>
                      <div className="progress-step-icon">{progressStep > 0 ? '✓' : '①'}</div>
                      <div className="progress-step-text">解析模板...</div>
                    </div>
                    <div className={`progress-step ${progressStep === 1 ? 'active' : ''} ${progressStep > 1 ? 'completed' : ''}`}>
                      <div className="progress-step-icon">{progressStep > 1 ? '✓' : '②'}</div>
                      <div className="progress-step-text">智能填写...</div>
                    </div>
                    <div className={`progress-step ${progressStep === 2 ? 'active' : ''} ${progressStep > 2 ? 'completed' : ''}`}>
                      <div className="progress-step-icon">{progressStep > 2 ? '✓' : '③'}</div>
                      <div className="progress-step-text">渲染预览...</div>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {previewBlob ? (
                  <LazyDocxPreview
                    blob={previewBlob}
                    onRendered={() => { }}
                    onError={(msg) => toast.error(msg)}
                  />
                ) : (
                  <div className="preview-placeholder">
                    <div className="placeholder-content">
                      <span className="fun-icon">📝</span>
                      <p className="placeholder-text">点击「开始填充并预览」生成结果</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Download Confirmation Modal */}
      <Modal
        isOpen={showDownloadConfirm}
        onClose={() => setShowDownloadConfirm(false)}
        title="确认下载"
      >
        <div className="confirm-content">
          <p>确定要下载处理后的文档吗？</p>
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setShowDownloadConfirm(false)}>
            取消
          </Button>
          <Button variant="primary" onClick={confirmDownload}>
            确认下载
          </Button>
        </div>
      </Modal>

      <style jsx>{`
        .workbench-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--background, #faf9f7);
        }

        .main-header {
          background: var(--bg-card, white);
          border-bottom: 1px solid var(--border-light, #e5e5e5);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .logo-icon {
          color: #d97706;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #92400e);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .user-name {
          font-weight: 500;
          color: #1a1a1a;
        }

        .balance-badge {
          padding: 4px 12px;
          background: #fef3c7;
          color: #92400e;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
        }

        .user-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .action-link {
          padding: 8px 12px;
          color: #6b6b6b;
          border-radius: 6px;
          font-size: 14px;
          text-decoration: none;
        }

        .action-link:hover {
          background: #f5f5f5;
        }

        .logout-btn {
          padding: 8px 16px;
          background: #fee2e2;
          color: #dc2626;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          cursor: pointer;
        }

        .logout-btn:hover {
          background: #dc2626;
          color: white;
        }

        .main-content {
          flex: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }

        .panel {
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e5e5;
          overflow: hidden;
          width: 100%;
        }

        .panel-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e5e5;
          background: #fafafa;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .panel-header h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .panel-icon {
          color: #d97706;
        }

        .panel-body {
          padding: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .step-section {
          margin-bottom: 24px;
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
        }

        .step-header h3 {
          font-size: 22px;
          font-weight: 600;
          margin: 0;
        }

        .step-header :global(.btn) {
          margin-left: auto;
          font-size: 13px;
          padding: 8px 12px;
        }

        .file-upload-area {
          border: 2px dashed #fbbf24;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: #fafafa;
        }

        .file-upload-area:hover {
          border-color: #f59e0b;
          background: #fef3c7;
        }

        .file-upload-area input {
          display: none;
        }

        .file-upload-area.small {
          padding: 16px;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .upload-icon {
          font-size: 32px;
        }

        .upload-text {
          font-size: 15px;
          font-weight: 500;
          color: #1a1a1a;
        }

        .upload-hint {
          font-size: 13px;
          color: #9ca3af;
        }

        .file-note {
          margin-top: 8px;
          font-size: 13px;
          color: #d97706;
        }

        .info-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 16px;
          border-bottom: 1px solid #e5e5e5;
        }

        .tab-btn {
          padding: 12px 20px;
          background: transparent;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: #9ca3af;
          cursor: pointer;
          position: relative;
        }

        .tab-btn.active {
          color: #d97706;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: #f59e0b;
        }

        .tab-content {
          animation: fadeSlideIn 0.2s ease;
          width: 100%;
        }

        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .code-editor {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 15px;
          line-height: 1.7;
          min-height: 200px;
          letter-spacing: 0.02em;
          width: 100%;
          box-sizing: border-box;
        }

        .large-textarea {
          min-height: 400px;
          height: calc(100vh - 420px);
          max-height: 600px;
          resize: vertical;
          width: 100%;
          box-sizing: border-box;
        }

        /* Wizard Progress */
        .wizard-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 24px;
          padding: 16px 24px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e5e5;
          width: 100%;
          box-sizing: border-box;
        }

        .wizard-step {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
          justify-content: center;
        }

        .wizard-step:hover {
          background: #fef3c7;
        }

        .wizard-step.active {
          background: #fef3c7;
        }

        .wizard-step-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          background: #f5f5f5;
          border: 2px solid #e5e5e5;
          color: #9ca3af;
          transition: all 0.2s ease;
        }

        .wizard-step.active .wizard-step-icon {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-color: #f59e0b;
          color: white;
        }

        .wizard-step.completed .wizard-step-icon {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .wizard-step-label {
          font-size: 15px;
          font-weight: 500;
          color: #6b6b6b;
          white-space: nowrap;
        }

        .wizard-step.active .wizard-step-label {
          color: #1a1a1a;
          font-weight: 600;
        }

        .wizard-connector {
          width: 60px;
          height: 2px;
          background: #e5e5e5;
          transition: background 0.2s ease;
        }

        .wizard-connector.active {
          background: #f59e0b;
        }

        /* Wizard Content */
        .wizard-content {
          animation: fadeSlideIn 0.2s ease;
        }

        .wizard-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
        }

        .wizard-actions :global(.btn) {
          flex: 1;
        }

        .template-section {
          margin-bottom: 20px;
        }

        /* Step 3: Supplement Section */
        .supplement-section {
          animation: fadeSlideIn 0.2s ease;
        }

        .supplement-header {
          margin-bottom: 16px;
        }

        .supplement-header h3 {
          font-size: 22px;
          font-weight: 600;
          margin: 0;
          color: #1a1a1a;
        }

        .supplement-hint {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 16px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
          border: 1px solid #fbbf24;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .hint-icon {
          font-size: 18px;
          flex-shrink: 0;
        }

        .supplement-hint p {
          margin: 0;
          font-size: 14px;
          color: #92400e;
          line-height: 1.5;
        }

        .supplement-form {
          margin-bottom: 16px;
        }

        .form-hint {
          font-size: 13px;
          color: #9ca3af;
          margin-top: 8px;
        }

        .no-missing-fields {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 30px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
          border: 1px solid #10b981;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .success-icon {
          font-size: 20px;
          color: #10b981;
        }

        .no-missing-fields p {
          margin: 0;
          font-size: 15px;
          color: #059669;
          font-weight: 500;
        }

        .action-section {
          display: flex;
          gap: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e5e5;
        }

        .action-btn {
          flex: 1;
        }

        .btn-icon {
          font-size: 14px;
        }

        .missing-fields-inline {
          margin-top: 12px;
          padding: 16px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
          border: 1px solid #fbbf24;
          border-radius: 8px;
        }

        .warning-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .warning-title {
          font-weight: 600;
          color: #92400e;
          font-size: 15px;
        }

        .missing-fields-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .missing-field-item {
          position: relative;
          padding-left: 20px;
          padding-bottom: 4px;
          color: #d97706;
          font-size: 14px;
        }

        .missing-field-item::before {
          content: '•';
          position: absolute;
          left: 8px;
          color: #f59e0b;
        }

        /* 旧的样式已注释，改为 panel-footer-warning
        .missing-fields-below-preview {
          padding: 16px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.05) 100%);
          border: 1px solid #fbbf24;
          border-radius: 0 0 8px 8px;
          border-top: none;
        }
        */

        .panel-footer-warning {
          padding: 16px 24px;
          background: #fffbeb;
          border-top: 1px solid #fcd34d;
          width: 100%;
          box-sizing: border-box;
        }

        .missing-fields-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .missing-fields-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .missing-field-item {
          position: relative;
          color: #b45309;
          font-size: 13px;
          background: rgba(251, 191, 36, 0.2);
          padding: 4px 10px;
          border-radius: 4px;
          font-family: monospace;
        }

        .preview-panel .panel-body {
          min-height: 500px;
          background: #f5f5f5;
          padding: 0;
          display: block;
          overflow: auto;
        }

        /* DocxPreview 组件外层容器 */
        .docx-preview {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 30px 0;
          box-sizing: border-box;
        }

        /* --- 核心修复：强制覆盖插件生成的容器样式 --- */

        /* 1. 强制 wrapper 占满宽度或根据内容伸展，并垂直居中其内容 */
        :global(.docx-wrapper) {
          background-color: transparent !important;
          padding: 0 !important;
          width: fit-content !important;
          min-width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }

        /* 2. 强制具体的"纸张"页面居中并添加阴影 */
        :global(.docx-wrapper > section.docx) {
          margin: 0 auto 24px auto !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
          transform-origin: center top !important;
        }

        .docx-preview-content {
          width: fit-content;
          min-width: 100%;
          border: none !important;
          outline: none !important;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .docx-preview-wrapper {
          border: none !important;
          outline: none !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }

        .docx-preview-wrapper .docx-page {
          border: none !important;
          box-shadow: none !important;
          margin: 0 auto 24px auto !important;
        }

        .preview-placeholder {
          height: 100%;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .placeholder-content {
          text-align: center;
          color: #9ca3af;
        }

        .fun-icon {
          font-size: 56px;
          animation: bounce 2s ease-in-out infinite;
          display: block;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .placeholder-text {
          font-size: 18px;
          margin-bottom: 4px;
          color: #6b6b6b;
          font-weight: 500;
        }

        .placeholder-subtext {
          font-size: 15px;
          color: #9ca3af;
        }

        .progress-steps {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: white;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0.4;
          transition: all 0.3s ease;
        }

        .progress-step.active {
          opacity: 1;
        }

        .progress-step.completed {
          opacity: 0.7;
        }

        .progress-step-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          background: #f5f5f5;
          border: 2px solid #e5e5e5;
          color: #9ca3af;
          flex-shrink: 0;
        }

        .progress-step.active .progress-step-icon {
          background: #f59e0b;
          border-color: #f59e0b;
          color: white;
        }

        .progress-step.completed .progress-step-icon {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }

        .progress-step-text {
          font-size: 14px;
          color: #6b6b6b;
        }

        .progress-step.active .progress-step-text {
          font-weight: 500;
          color: #1a1a1a;
        }

        .confirm-content {
          text-align: center;
        }

        .modal-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 20px;
        }

        .docx-preview-error,
        .docx-preview-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          color: #6b6b6b;
        }

        .error-icon {
          font-size: 48px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e5e5;
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .header-content {
            gap: 12px;
            padding: 12px;
          }

          .header-right {
            width: 100%;
            justify-content: space-between;
            gap: 8px;
          }

          .user-info {
            min-width: 0;
            gap: 8px;
          }

          .user-name {
            max-width: 90px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .main-content {
            padding: 10px;
          }

          .wizard-progress {
            padding: 10px;
            gap: 6px;
            overflow-x: auto;
            justify-content: flex-start;
            scrollbar-width: thin;
          }

          .wizard-step {
            min-width: 110px;
            padding: 8px;
            flex: 0 0 auto;
            gap: 6px;
          }

          .wizard-step-label {
            font-size: 12px;
            white-space: normal;
            line-height: 1.2;
            text-align: center;
          }

          .wizard-connector {
            width: 24px;
          }

          .panel-header,
          .panel-body {
            padding: 14px;
          }

          .panel-header h2 {
            font-size: 16px;
          }

          .step-header h3,
          .supplement-header h3 {
            font-size: 18px;
          }

          .large-textarea {
            min-height: 280px;
            height: 42vh;
            max-height: none;
          }

          .wizard-actions {
            flex-direction: column;
          }

          .wizard-actions :global(.btn) {
            width: 100%;
          }

          .preview-panel .panel-body {
            min-height: 320px;
          }
        }
      `}</style>
    </div>
  )
}
