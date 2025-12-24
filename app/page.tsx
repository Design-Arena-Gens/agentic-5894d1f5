'use client'

import { useState } from 'react'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
      setVideoUrl('')
      setStatus('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file')
      return
    }

    setProcessing(true)
    setProgress(0)
    setError('')
    setVideoUrl('')

    const formData = new FormData()
    formData.append('pdf', file)

    try {
      setStatus('Uploading PDF...')
      setProgress(10)

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process PDF')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.status) {
                  setStatus(data.status)
                }
                if (data.progress) {
                  setProgress(data.progress)
                }
                if (data.videoUrl) {
                  setVideoUrl(data.videoUrl)
                  setProcessing(false)
                }
                if (data.error) {
                  setError(data.error)
                  setProcessing(false)
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProcessing(false)
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Manga Recap Video Generator
          </h1>
          <p className="text-gray-600 text-lg">
            Upload your manga PDF and generate an AI-narrated recap video
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Manga PDF
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg
                    className="w-12 h-12 mb-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF files only</p>
                  {file && (
                    <p className="mt-2 text-sm text-purple-600 font-medium">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileChange}
                  disabled={processing}
                />
              </label>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || processing}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {processing ? 'Processing...' : 'Generate Video'}
          </button>

          {processing && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="progress-bar bg-gradient-to-r from-purple-600 to-blue-600 h-full rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {videoUrl && (
            <div className="mt-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                <p className="text-green-600 font-medium">Video generated successfully!</p>
              </div>
              <video
                controls
                className="w-full rounded-lg shadow-lg"
                src={videoUrl}
              >
                Your browser does not support the video tag.
              </video>
              <a
                href={videoUrl}
                download
                className="mt-4 block w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium text-center hover:bg-green-700 transition-colors"
              >
                Download Video
              </a>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">How It Works</h2>
          <ol className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">1.</span>
              <span>Upload your manga PDF file</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">2.</span>
              <span>Our AI extracts pages and analyzes scenes</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">3.</span>
              <span>AI generates narration based on the manga content</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">4.</span>
              <span>Video is compiled with transitions and voiceover</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-purple-600 mr-2">5.</span>
              <span>Download your recap video!</span>
            </li>
          </ol>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Free and open-source. No account required.</p>
        </div>
      </div>
    </main>
  )
}
