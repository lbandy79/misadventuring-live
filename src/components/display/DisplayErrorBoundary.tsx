import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary for the display view interaction area.
 * On error, shows a graceful fallback instead of crashing the whole projector.
 * Auto-recovers when interaction type changes (via key prop on parent).
 */
export default class DisplayErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[DisplayErrorBoundary] Component crashed:', error);
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-recover when children change (new interaction type)
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#a0a0b0',
          fontFamily: 'var(--tmp-font-body, monospace)',
          fontSize: '1.2rem',
          textAlign: 'center',
          padding: '2rem',
        }}>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📡</div>
            <div>Standby — recovering signal...</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
