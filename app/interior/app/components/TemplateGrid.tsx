// @ts-nocheck
"use client"

import { useRouter } from 'next/navigation'

interface Template {
  id: string
  title: string
  description?: string
  bgColor?: string
}

export function TemplateGrid() {
  const router = useRouter()

  // placeholder template definitions; you can extend these
  // with images/metadata in the future.
  const templates: Template[] = [
    { id: 'blank', title: 'Blank Canvas', bgColor: 'bg-gray-100' },
    { id: 'modern', title: 'Modern Living', bgColor: 'bg-blue-100' },
    { id: 'office', title: 'Office Layout', bgColor: 'bg-green-100' }
  ]

  const openTemplate = (templateId: string) => {
    router.push(`/editor?template=${templateId}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-8 bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-8">Choose a template</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-5xl">
        {templates.map((t) => (
          <div
            key={t.id}
            onClick={() => openTemplate(t.id)}
            className={`cursor-pointer rounded-lg p-6 border border-border hover:shadow-lg transition ${t.bgColor}`}
          >
            <div className="h-40 flex items-center justify-center text-xl font-semibold">
              {t.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
