import React from "react"
import { Button } from "@/components/ui/button"
import { AlertOctagon } from "lucide-react"

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onReset?: () => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('Application error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })

    this.setState({ errorInfo })

    // Allow parent to handle error
    this.props.onError?.(error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false })

    // Allow parent to handle reset
    this.props.onReset?.()

    // Fallback to page reload if no reset handler
    if (!this.props.onReset) {
      window.location.reload()
    }
  }

  private handleBack = () => {
    // Only show back button if we can go back
    if (window.history.length > 1) {
      window.history.back()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-full max-w-md space-y-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertOctagon className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Something went wrong</h2>
            </div>

            <div className="text-gray-600 mb-4 text-left space-y-2">
              <p className="font-medium">Error Message:</p>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                {this.state.error?.message}
              </pre>

              {import.meta.env.DEV && this.state.errorInfo && (
                <>
                  <p className="font-medium mt-4">Component Stack:</p>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={this.handleReset}>
                Try Again
              </Button>
              {window.history.length > 1 && (
                <Button
                  variant="outline"
                  onClick={this.handleBack}
                >
                  Go Back
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Example usage:
/*
<ErrorBoundary
  fallback={<CustomErrorComponent />}
  onError={(error, errorInfo) => {
    // Send to error reporting service
    reportError(error, errorInfo)
  }}
  onReset={() => {
    // Clear error state and retry operation
    clearErrorState()
    retryOperation()
  }}
>
  <YourComponent />
</ErrorBoundary>
*/