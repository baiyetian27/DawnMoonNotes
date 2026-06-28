import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 全局 React 错误边界。
 * 捕获组件树中任何未处理的渲染异常，显示 fallback UI 而非白屏。
 * 在 Android WebView (file:// 协议) 环境下尤为重要：
 * - ResizeObserver 在某些旧 WebView 中不可用
 * - IndexedDB 可能因存储配额或其他原因失败
 * - 任何未预期的异常都不应导致整个应用崩溃
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 捕获到渲染错误:', error)
    console.error('[ErrorBoundary] 组件栈:', info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: '#0F0F1A',
            color: '#A0A0B0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#E0E0E0', margin: '0 0 12px', fontSize: '18px' }}>
            应用出现错误
          </h2>
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '14px',
              lineHeight: '1.6',
              maxWidth: '320px',
            }}
          >
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '10px 20px',
                backgroundColor: '#7C3AED',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 20px',
                backgroundColor: 'transparent',
                color: '#A0A0B0',
                border: '1px solid #333',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
