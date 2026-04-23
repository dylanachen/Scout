import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info);
    try {
      window.dispatchEvent(
        new CustomEvent('scout-error', {
          detail: {
            message: error?.message,
            stack: error?.stack,
            componentStack: info?.componentStack,
          },
        }),
      );
    } catch {
      /* noop */
    }
  }

  copyDetails = async () => {
    const error = this.state.error;
    const details = [
      `Error: ${error?.message || 'Unknown error'}`,
      '',
      'Stack:',
      error?.stack || '(no stack)',
      '',
      `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      `Time: ${new Date().toISOString()}`,
      `UserAgent: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      /* noop */
    }
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            padding: 20,
          }}
        >
          <div
            style={{
              maxWidth: 520,
              width: '100%',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: 22,
              background: 'var(--color-surface)',
            }}
          >
            <div style={{ fontSize: 32 }} aria-hidden>⚠️</div>
            <h2 style={{ margin: '6px 0 4px' }}>Something went wrong</h2>
            <p style={{ margin: '0 0 14px', color: 'var(--color-text-3)' }}>
              The app hit an unexpected error. You can reload, or copy the details to share with support.
            </p>
            {error?.message ? (
              <pre
                style={{
                  fontSize: 12,
                  background: 'var(--color-surface-2)',
                  padding: 10,
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  overflow: 'auto',
                  color: 'var(--color-text-2)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 180,
                }}
              >
                {error.message}
              </pre>
            ) : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  border: 'none',
                  borderRadius: 10,
                  background: 'var(--color-primary)',
                  color: '#fff',
                  padding: '10px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reload app
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  padding: '10px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Go back
              </button>
              <button
                type="button"
                onClick={this.copyDetails}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  padding: '10px 14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {this.state.copied ? 'Copied ✓' : 'Copy error details'}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
