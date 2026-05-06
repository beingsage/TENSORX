// OpenTelemetry Instrumentation
// This file is used to register OpenTelemetry instrumentations for the Next.js app
// Called automatically by Next.js server runtime via instrumentation hook

export async function register() {
  // Server-side only: Initialize OpenTelemetry
  if (typeof window === 'undefined') {
    try {
      // Optional: Initialize tracing if needed
      // For now, this is a placeholder that prevents build errors
      if (process.env.ENABLE_OTEL === 'true') {
        console.log('OpenTelemetry instrumentation enabled')
      }
    } catch (error) {
      // OpenTelemetry setup is optional, don't break the app if it fails
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to setup OpenTelemetry:', error)
      }
    }
  }
}
