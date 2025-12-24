import { ExtractedPage } from './pdfProcessor'

export interface NarrationSegment {
  text: string
  pageNumber: number
  duration: number // in seconds
}

/**
 * Generates narration for manga pages using free AI APIs
 * This is a simplified version that uses rule-based narration
 * For production, you would integrate with free LLM APIs like:
 * - Hugging Face Inference API (free tier)
 * - OpenAI compatible APIs with free tier
 * - Local LLMs using Ollama
 */
export async function generateNarration(pages: ExtractedPage[]): Promise<NarrationSegment[]> {
  const segments: NarrationSegment[] = []

  // Simple rule-based narration generator
  // In production, this would use vision-language models to analyze the images

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    let narrationText = ''

    if (i === 0) {
      narrationText = "Welcome to this manga recap. Let's dive into the story."
    } else if (i === pages.length - 1) {
      narrationText = "And that wraps up this chapter. Stay tuned for more exciting developments."
    } else {
      narrationText = `On page ${page.pageNumber}, the story continues with intense action and drama.`
    }

    // Calculate duration based on text length (rough estimate: 150 words per minute)
    const wordCount = narrationText.split(' ').length
    const duration = Math.max(3, (wordCount / 150) * 60)

    segments.push({
      text: narrationText,
      pageNumber: page.pageNumber,
      duration,
    })
  }

  return segments
}

/**
 * Alternative: Use Hugging Face API for image captioning (free tier available)
 * Uncomment and configure if you want to use actual AI vision models
 */
/*
export async function generateNarrationWithAI(pages: ExtractedPage[]): Promise<NarrationSegment[]> {
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || ''
  const segments: NarrationSegment[] = []

  for (const page of pages) {
    try {
      // Use Hugging Face's image-to-text models (free tier)
      const response = await fetch(
        'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: page.imageBase64,
          }),
        }
      )

      const result = await response.json()
      const caption = result[0]?.generated_text || 'The story continues.'

      // Enhance caption into narration
      const narrationText = enhanceCaption(caption, page.pageNumber)
      const wordCount = narrationText.split(' ').length
      const duration = Math.max(3, (wordCount / 150) * 60)

      segments.push({
        text: narrationText,
        pageNumber: page.pageNumber,
        duration,
      })
    } catch (error) {
      console.error(`Error generating narration for page ${page.pageNumber}:`, error)
      segments.push({
        text: `On page ${page.pageNumber}, the action intensifies.`,
        pageNumber: page.pageNumber,
        duration: 3,
      })
    }
  }

  return segments
}

function enhanceCaption(caption: string, pageNumber: number): string {
  // Transform image caption into engaging narration
  return `On page ${pageNumber}, we see ${caption}. The tension builds as our characters face new challenges.`
}
*/
