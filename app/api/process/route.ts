import { NextRequest } from 'next/server'
import { processPDF } from '@/lib/pdfProcessor'
import { generateNarration } from '@/lib/narrationGenerator'
import { createVideo } from '@/lib/videoCreator'
import path from 'path'
import fs from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await request.formData()
        const file = formData.get('pdf') as File

        if (!file) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'No file uploaded' })}\n\n`)
          )
          controller.close()
          return
        }

        // Create uploads directory
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
        const outputsDir = path.join(process.cwd(), 'public', 'outputs')

        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }
        if (!fs.existsSync(outputsDir)) {
          fs.mkdirSync(outputsDir, { recursive: true })
        }

        // Save uploaded file
        const buffer = Buffer.from(await file.arrayBuffer())
        const timestamp = Date.now()
        const filename = `${timestamp}_${file.name}`
        const filepath = path.join(uploadsDir, filename)
        fs.writeFileSync(filepath, buffer)

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: 'Processing PDF...', progress: 20 })}\n\n`)
        )

        // Process PDF to extract pages as images
        const images = await processPDF(filepath)

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: 'Analyzing scenes...', progress: 40 })}\n\n`)
        )

        // Generate narration
        const narration = await generateNarration(images)

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: 'Generating narration audio...', progress: 60 })}\n\n`)
        )

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: 'Creating video...', progress: 80 })}\n\n`)
        )

        // Create video
        const videoPath = await createVideo(images, narration, timestamp)

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ status: 'Complete!', progress: 100, videoUrl: `/outputs/${path.basename(videoPath)}` })}\n\n`)
        )

        // Clean up uploaded PDF
        fs.unlinkSync(filepath)

        controller.close()
      } catch (error) {
        console.error('Error processing PDF:', error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' })}\n\n`
          )
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
