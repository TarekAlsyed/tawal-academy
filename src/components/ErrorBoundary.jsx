import React from 'react';
import api from '../services/api';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Report error to the backend (Error Hunting System)
    const errorData = {
      errorType: 'REACT_ERROR',
      message: error.toString(),
      stackTrace: error.stack,
      component: 'Frontend React',
      severity: 'high',
      details: {
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    // Attempt to report but don't crash if reporting fails
    api.post('/monitoring/report-error', errorData)
      .catch(e => console.error('Failed to report error to server:', e));
    
    // Also log to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '20px', textAlign: 'center', direction: 'rtl' }}>
          <h2>عذراً، حدث خطأ غير متوقع.</h2>
          <p>لقد تم إرسال تقرير بالخطأ للفريق التقني وسنقوم بحله قريباً.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
