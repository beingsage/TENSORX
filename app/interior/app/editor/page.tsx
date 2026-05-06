"use client"

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'

// dynamically load the heavy editor; no server-side rendering
const App = dynamic(() => import('../components/App'), { ssr: false })

function EditorContent() {
  const params = useSearchParams()
  const template = params.get('template') || undefined

  // the App component currently ignores the template prop, but we pass it
  // in case later logic needs to seed an initial design.  at minimum it
  // makes the URL reflective of the chosen template.
  return <App template={template} />
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  )
}
