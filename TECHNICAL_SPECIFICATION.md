# Manga Recap Video Generator - Technical Specification

## Executive Summary

This document provides a comprehensive technical specification for a web-based manga recap video generator that processes manga PDFs and generates narrated recap videos using free, open-source tools and APIs.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Browser (Client)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  React/Next.js Frontend                               │  │
│  │  - File Upload Interface                              │  │
│  │  - Progress Tracking                                  │  │
│  │  - Video Player                                       │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/FormData
                        │ Server-Sent Events (SSE)
┌───────────────────────▼─────────────────────────────────────┐
│                    Next.js Server (Backend)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  API Route: /api/process                              │  │
│  │  - Streaming Response Handler                         │  │
│  │  - File Management                                    │  │
│  └───────────┬────────────────────┬──────────────────────┘  │
│              │                    │                          │
│  ┌───────────▼─────────┐ ┌────────▼──────────┐ ┌──────────┐│
│  │  PDF Processor      │ │  Narration Gen    │ │  Video   ││
│  │  - pdf.js           │ │  - AI/Rule-based  │ │  Creator ││
│  │  - Canvas           │ │  - HuggingFace    │ │  - FFmpeg││
│  │  - Image Extraction │ │  - Text Generator │ │  - Encode││
│  └─────────────────────┘ └───────────────────┘ └──────────┘│
└─────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    File System Storage                       │
│  - /public/uploads/    (Temporary PDF & Images)             │
│  - /public/outputs/    (Generated Videos)                   │
└─────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 1. Frontend Layer (Client-Side)

#### Technology Stack
- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Next.js built-in webpack

#### Key Components

**Main UI Component** (`app/page.tsx`)
```typescript
Features:
- File upload (drag-and-drop + click)
- Real-time progress bar
- Status messages
- Video preview player
- Download button

State Management:
- file: File | null (uploaded PDF)
- processing: boolean (processing state)
- progress: number (0-100%)
- status: string (status message)
- videoUrl: string (generated video URL)
- error: string (error messages)

Event Handlers:
- handleFileChange(): Validates and stores uploaded file
- handleUpload(): Initiates processing via API call
```

**Layout Component** (`app/layout.tsx`)
```typescript
Features:
- Root HTML structure
- Global metadata
- Font loading (Inter)
- CSS imports
```

#### API Communication

**Endpoint**: `POST /api/process`

**Request Format**:
```typescript
Content-Type: multipart/form-data
Body: FormData { pdf: File }
```

**Response Format**: Server-Sent Events (SSE)
```typescript
data: {"status": "Processing PDF...", "progress": 20}
data: {"status": "Analyzing scenes...", "progress": 40}
data: {"status": "Complete!", "progress": 100, "videoUrl": "/outputs/video.mp4"}
```

**Error Handling**:
```typescript
data: {"error": "Error message"}
```

### 2. Backend Layer (Server-Side)

#### Technology Stack
- **Runtime**: Node.js 18+
- **Framework**: Next.js API Routes
- **Language**: TypeScript

#### API Route Handler

**File**: `app/api/process/route.ts`

**Configuration**:
```typescript
export const runtime = 'nodejs'  // Use Node.js runtime
export const dynamic = 'force-dynamic'  // Disable caching
```

**Processing Pipeline**:
```typescript
1. Receive FormData with PDF file
2. Validate file (exists, type, size)
3. Create upload/output directories
4. Save PDF to /public/uploads/
5. Extract pages → processPDF()
6. Generate narration → generateNarration()
7. Create video → createVideo()
8. Return video URL
9. Cleanup temporary files
```

**Streaming Response**:
```typescript
Uses ReadableStream for Server-Sent Events
- Encodes JSON progress updates
- Streams to client in real-time
- Closes stream on completion or error
```

### 3. PDF Processing Module

**File**: `lib/pdfProcessor.ts`

**Dependencies**:
- `pdfjs-dist`: PDF parsing and rendering
- `canvas`: Node.js canvas implementation

**Core Function**: `processPDF(pdfPath: string)`

**Algorithm**:
```typescript
1. Load PDF file as Uint8Array
2. Parse PDF using pdf.js
3. Limit to first 20 pages (resource optimization)
4. For each page:
   a. Get page object
   b. Create viewport with 1.5x scale
   c. Create canvas matching viewport dimensions
   d. Render page to canvas
   e. Export canvas to PNG buffer
   f. Save PNG to /public/uploads/images/
   g. Convert to base64 for optional AI processing
5. Return array of ExtractedPage objects
```

**Data Structure**:
```typescript
interface ExtractedPage {
  imageBase64: string  // Base64 encoded PNG
  pageNumber: number   // Page index (1-based)
  imagePath: string    // Public URL path to image
}
```

**Performance Considerations**:
- Page limit: 20 pages maximum (configurable)
- Scale factor: 1.5x (balance quality vs. size)
- Image format: PNG (lossless for manga art)
- Memory management: Process pages sequentially

### 4. Narration Generation Module

**File**: `lib/narrationGenerator.ts`

**Approach**: Hybrid (Rule-based + Optional AI)

#### Rule-Based Narration (Default - Free)

**Core Function**: `generateNarration(pages: ExtractedPage[])`

**Algorithm**:
```typescript
1. Iterate through each page
2. Generate contextual narration:
   - First page: Introduction
   - Last page: Conclusion
   - Middle pages: Continuation text
3. Calculate duration based on word count
   - Formula: (wordCount / 150) * 60 seconds
   - Minimum: 3 seconds per page
4. Return NarrationSegment array
```

**Data Structure**:
```typescript
interface NarrationSegment {
  text: string         // Narration text
  pageNumber: number   // Associated page
  duration: number     // Duration in seconds
}
```

#### AI-Powered Narration (Optional)

**API Option 1: Hugging Face (Free Tier)**
```typescript
Model: Salesforce/blip-image-captioning-large
Endpoint: https://api-inference.huggingface.co/models/...
Authentication: Bearer token (free tier: 30k chars/month)

Process:
1. Send base64 image to API
2. Receive image caption
3. Enhance caption into engaging narration
4. Calculate duration
```

**API Option 2: Local LLM (Ollama)**
```typescript
Model: llava (vision-language model)
Endpoint: http://localhost:11434/api/generate
Cost: Free (runs locally)

Process:
1. Send image to local Ollama instance
2. Request scene description
3. Format as narration
4. Calculate duration
```

**Enhancement Strategy**:
```typescript
function enhanceCaption(caption: string, pageNumber: number): string {
  // Transform raw caption into engaging narration
  // Add context, drama, and narrative flow
  return `On page ${pageNumber}, we see ${caption}.
          The tension builds as our characters face new challenges.`
}
```

### 5. Video Creation Module

**File**: `lib/videoCreator.ts`

**Dependencies**:
- `ffmpeg`: External system dependency
- Node.js `child_process`: Execute FFmpeg commands

**Core Function**: `createVideo(pages, narration, timestamp)`

**Video Compilation Pipeline**:

```typescript
Step 1: Generate FFmpeg Concat File
├─ Format: FFmpeg concat demuxer format
├─ Content: List of images + durations
└─ Example:
   file '/path/to/page1.png'
   duration 5.2
   file '/path/to/page2.png'
   duration 4.8
   ...

Step 2: Generate SRT Subtitle File
├─ Format: SubRip subtitle format
├─ Content: Timed narration text
└─ Example:
   1
   00:00:00,000 --> 00:00:05,200
   Welcome to this manga recap. Let's dive into the story.

   2
   00:00:05,200 --> 00:00:10,000
   On page 2, the story continues...

Step 3: Execute FFmpeg Command
├─ Input: Concat file (images + durations)
├─ Filter: Subtitle overlay with styling
├─ Codec: H.264 (libx264)
├─ Format: MP4
└─ Output: /public/outputs/manga_recap_[timestamp].mp4

Step 4: Cleanup
├─ Delete temporary concat file
├─ Delete temporary subtitle file
└─ Delete extracted page images
```

**FFmpeg Command Template**:
```bash
ffmpeg \
  -f concat \
  -safe 0 \
  -i concat_file.txt \
  -vf "subtitles=subtitles.srt:force_style='
    Alignment=2,           # Bottom center
    Fontsize=20,           # Text size
    MarginV=50,            # Bottom margin
    PrimaryColour=&H00FFFFFF,    # White text
    OutlineColour=&H00000000,    # Black outline
    Outline=2              # Outline thickness
  '" \
  -c:v libx264 \          # H.264 codec
  -pix_fmt yuv420p \      # Pixel format (compatibility)
  -preset fast \          # Encoding speed/quality
  output.mp4
```

**Video Specifications**:
```typescript
Resolution: Matches source images (typically 1920x1080 or manga page ratio)
Codec: H.264 (libx264)
Container: MP4
Pixel Format: yuv420p (maximum compatibility)
Encoding Preset: fast (balance speed/quality)
Frame Rate: 1 fps (static images)
Subtitle Style: White text, black outline, bottom-center
```

**Subtitle Time Formatting**:
```typescript
function formatSrtTime(seconds: number): string {
  // Convert seconds to SRT format: HH:MM:SS,mmm
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`
}
```

## Data Flow Diagram

```
┌──────────────┐
│ User uploads │
│   PDF file   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ POST /api/process                        │
│ - Receives FormData                      │
│ - Saves to /public/uploads/[timestamp].pdf│
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ PDF Processor (lib/pdfProcessor.ts)     │
│ Input: PDF file path                     │
│ Output: ExtractedPage[]                  │
│   - imageBase64                          │
│   - pageNumber                           │
│   - imagePath                            │
│ Saves: /public/uploads/images/*.png      │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Narration Generator                      │
│ Input: ExtractedPage[]                   │
│ Output: NarrationSegment[]               │
│   - text                                 │
│   - pageNumber                           │
│   - duration                             │
│ Methods: Rule-based OR AI-powered        │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Video Creator (lib/videoCreator.ts)     │
│ Input: ExtractedPage[], NarrationSegment[]│
│ Process:                                  │
│   1. Generate concat file                │
│   2. Generate SRT subtitles              │
│   3. Execute FFmpeg                      │
│ Output: /public/outputs/[timestamp].mp4  │
│ Cleanup: Delete temp files and images   │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Return to Client via SSE                 │
│ data: {"videoUrl": "/outputs/video.mp4"} │
└──────────────────────────────────────────┘
```

## Deployment Architecture

### Development Environment

```bash
# System Requirements
- Node.js 18+
- npm 9+
- FFmpeg 4.4+

# Setup Commands
npm install
npm run dev

# Access
http://localhost:3000
```

### Production Environment Options

#### Option 1: VPS Deployment (Recommended)

**Platforms**: DigitalOcean, Linode, AWS EC2, Google Cloud VM

**System Setup**:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install FFmpeg
sudo apt install -y ffmpeg

# Install PM2 (process manager)
sudo npm install -g pm2
```

**Application Deployment**:
```bash
# Clone repository
git clone https://github.com/your-repo/manga-recap-generator
cd manga-recap-generator

# Install dependencies
npm install

# Build production
npm run build

# Start with PM2
pm2 start npm --name "manga-recap" -- start
pm2 save
pm2 startup
```

**Nginx Configuration** (Optional - for custom domain):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2: Docker Deployment

**Dockerfile**:
```dockerfile
FROM node:18-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Build Next.js
RUN npm run build

# Create directories
RUN mkdir -p /app/public/uploads /app/public/outputs

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

**Docker Compose**:
```yaml
version: '3.8'

services:
  manga-recap:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./public/uploads:/app/public/uploads
      - ./public/outputs:/app/public/outputs
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

#### Option 3: Platform-as-a-Service

**Compatible Platforms**:
- Railway.app
- Render.com
- Fly.io

**Requirements**:
- FFmpeg buildpack/layer
- Persistent storage volume
- Node.js runtime

**Note**: Vercel is NOT compatible due to:
- Serverless function limitations
- No FFmpeg support
- No persistent file system

## Security Considerations

### File Upload Security

```typescript
// Validation checks
1. File type validation (PDF only)
2. File size limit (50MB max)
3. Filename sanitization (timestamp prefix)
4. Isolated storage directory
5. Automatic cleanup after processing
```

### API Security

```typescript
// Recommended implementations
1. Rate limiting (express-rate-limit)
2. File size limits (next.config.js)
3. Input sanitization
4. CSRF protection
5. CORS configuration
```

### File System Security

```typescript
// Best practices
1. Separate directories for uploads/outputs
2. Non-executable file permissions
3. Regular cleanup of old files
4. Temporary file cleanup on error
5. Path traversal prevention
```

## Performance Optimization

### Backend Optimizations

```typescript
1. Page Limit
   - Default: 20 pages
   - Reduces processing time and memory usage

2. Image Quality
   - Scale: 1.5x (balance quality/size)
   - Format: PNG (optimal for manga line art)

3. FFmpeg Settings
   - Preset: fast (balance speed/quality)
   - Codec: H.264 (hardware acceleration support)

4. Sequential Processing
   - Pages processed one at a time
   - Prevents memory spikes

5. Streaming Response
   - Server-Sent Events for real-time updates
   - Non-blocking processing
```

### Frontend Optimizations

```typescript
1. Progress Tracking
   - Real-time SSE updates
   - Visual feedback

2. Lazy Loading
   - Video player loaded on demand
   - Reduces initial page load

3. Error Handling
   - Graceful error messages
   - Retry mechanisms

4. File Validation
   - Client-side checks before upload
   - Reduces unnecessary server requests
```

### Resource Management

```typescript
Memory Usage:
- PDF processing: ~100-200MB per document
- Image generation: ~10-20MB per page
- Video encoding: ~200-500MB peak
- Total: 1-2GB recommended

Processing Time:
- PDF extraction: 10-30 seconds (20 pages)
- Narration generation: 1-5 seconds
- Video creation: 20-60 seconds
- Total: 30-90 seconds average

Storage Requirements:
- Uploaded PDF: 5-50MB
- Extracted images: 20-100MB
- Output video: 10-50MB
- Recommended free space: 5GB+
```

## API Integration Options

### Free AI Services

#### 1. Hugging Face Inference API

```typescript
Endpoint: https://api-inference.huggingface.co/models/[model-id]
Authentication: Bearer token
Free Tier: 30,000 characters/month

Recommended Models:
- Salesforce/blip-image-captioning-large (image captioning)
- nlpconnect/vit-gpt2-image-captioning (alt. captioning)

Usage:
const response = await fetch(HF_API_URL, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ inputs: imageBase64 }),
})
```

#### 2. Local LLM (Ollama)

```typescript
Installation:
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llava

Endpoint: http://localhost:11434/api/generate
Cost: Free (local processing)
No Rate Limits

Usage:
const response = await fetch('http://localhost:11434/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    model: 'llava',
    prompt: 'Describe this manga page',
    images: [imageBase64],
  }),
})
```

## Error Handling Strategy

### Client-Side Errors

```typescript
1. File Validation Errors
   - Invalid file type → "Please upload a PDF file"
   - File too large → "File size must be under 50MB"
   - No file selected → "Please select a file"

2. Network Errors
   - Connection timeout → "Request timeout. Please try again."
   - Server error → "Server error. Please try again later."

3. Processing Errors
   - Display error message from server
   - Allow retry with same file
```

### Server-Side Errors

```typescript
1. File Processing Errors
   - PDF parse error → "Unable to process PDF"
   - Image extraction error → "Failed to extract pages"
   - Log detailed error to server console

2. FFmpeg Errors
   - FFmpeg not found → "Video encoding unavailable"
   - Encoding failure → "Failed to create video"
   - Check FFmpeg installation and permissions

3. File System Errors
   - Directory creation error → "Storage unavailable"
   - File write error → "Unable to save file"
   - Check disk space and permissions
```

## Testing Strategy

### Unit Tests

```typescript
// PDF Processor
test('Extract pages from valid PDF', async () => {
  const pages = await processPDF('./test.pdf')
  expect(pages.length).toBeGreaterThan(0)
  expect(pages[0]).toHaveProperty('imageBase64')
})

// Narration Generator
test('Generate narration for pages', async () => {
  const narration = await generateNarration(mockPages)
  expect(narration.length).toBe(mockPages.length)
  expect(narration[0]).toHaveProperty('text')
  expect(narration[0]).toHaveProperty('duration')
})

// Video Creator
test('Create video from images and narration', async () => {
  const videoPath = await createVideo(mockPages, mockNarration, Date.now())
  expect(fs.existsSync(videoPath)).toBe(true)
})
```

### Integration Tests

```typescript
test('Complete PDF to video pipeline', async () => {
  // Upload PDF
  const formData = new FormData()
  formData.append('pdf', testPdfFile)

  // Process
  const response = await fetch('/api/process', {
    method: 'POST',
    body: formData,
  })

  // Verify streaming response
  expect(response.headers.get('content-type')).toBe('text/event-stream')

  // Parse events
  const events = await parseSSE(response)
  const finalEvent = events[events.length - 1]

  // Verify video URL
  expect(finalEvent).toHaveProperty('videoUrl')
  expect(finalEvent.progress).toBe(100)
})
```

### Manual Testing Checklist

```markdown
- [ ] Upload valid manga PDF (under 20 pages)
- [ ] Upload large PDF (over 20 pages, should limit)
- [ ] Upload non-PDF file (should reject)
- [ ] Upload oversized PDF (should reject)
- [ ] Verify progress updates during processing
- [ ] Verify video generation completes
- [ ] Verify video playback in browser
- [ ] Verify download functionality
- [ ] Test error handling (invalid file)
- [ ] Test concurrent uploads (if supported)
```

## Monitoring and Logging

### Application Logging

```typescript
// Structured logging
console.log(`[PDF-PROCESSOR] Processing ${filename}`)
console.log(`[NARRATION] Generated ${segments.length} segments`)
console.log(`[VIDEO] Created video: ${videoPath}`)
console.error(`[ERROR] ${error.message}`, { stack: error.stack })
```

### Performance Metrics

```typescript
// Track processing times
const startTime = Date.now()
await processPDF(filepath)
const pdfTime = Date.now() - startTime
console.log(`[METRICS] PDF processing: ${pdfTime}ms`)
```

### Resource Monitoring

```bash
# Disk space monitoring
df -h /path/to/public/uploads
df -h /path/to/public/outputs

# Memory monitoring
pm2 monit

# Process monitoring
pm2 status
pm2 logs manga-recap
```

## Cost Analysis

### Infrastructure Costs (Monthly)

```
VPS Hosting (Recommended):
├─ DigitalOcean Droplet ($6-12/month)
│  - 1-2 GB RAM
│  - 1-2 CPU cores
│  - 25-50 GB SSD
├─ Linode Nanode ($5-10/month)
└─ AWS EC2 t3.micro ($10-15/month)

Docker Hosting:
├─ Railway ($5-10/month for hobby tier)
├─ Render ($7/month for starter)
└─ Fly.io ($0-5/month with free tier)

Domain & SSL (Optional):
├─ Domain: $10-15/year
└─ SSL: Free (Let's Encrypt)

Total: $5-15/month
```

### API Costs (Free Tier)

```
Hugging Face:
└─ Free: 30,000 chars/month (sufficient for moderate use)

Local LLM (Ollama):
└─ Free: Unlimited (uses local compute)

FFmpeg:
└─ Free: Open-source

Next.js:
└─ Free: Open-source framework
```

## Scalability Considerations

### Single Server Limits

```
Concurrent Users: 5-10 (with queue)
Processing Queue: 1 at a time (sequential)
Storage: 20-50 GB (regular cleanup needed)
Bandwidth: 100-500 GB/month
```

### Scaling Strategies

```
Horizontal Scaling:
├─ Multiple server instances
├─ Load balancer (nginx/HAProxy)
├─ Shared file storage (NFS/S3)
└─ Redis queue for job management

Vertical Scaling:
├─ Increase server resources
├─ More CPU for faster FFmpeg encoding
├─ More RAM for larger PDFs
└─ SSD for faster I/O

Optimization:
├─ Implement job queue (Bull/Redis)
├─ Add caching layer (Redis)
├─ CDN for video delivery
└─ Background processing workers
```

## Future Enhancement Roadmap

### Phase 1: Core Improvements
- Text-to-speech integration (Google TTS, Azure TTS free tier)
- Better scene detection algorithms
- Character recognition and tracking
- Multiple output quality options

### Phase 2: User Features
- User accounts and authentication
- Processing history
- Custom narration styles
- Template system for video styles

### Phase 3: Advanced AI
- GPT-4 Vision integration for better scene analysis
- Voice cloning for consistent narration
- Automatic background music selection
- Multi-language support

### Phase 4: Platform Features
- Batch processing for multiple PDFs
- Scheduled processing
- API access for developers
- Mobile app (React Native)

## Conclusion

This technical specification outlines a complete, production-ready system for converting manga PDFs into narrated recap videos. The architecture prioritizes:

1. **Free and Open Source**: All core components use free tools
2. **User-Friendly**: Simple web interface, no technical knowledge required
3. **Scalable**: Can be deployed on various platforms
4. **Extensible**: Modular design allows for easy enhancements
5. **Performant**: Optimized for reasonable processing times

The system is designed to run efficiently on modest hardware while providing professional-quality output suitable for content creators building manga recap channels on platforms like YouTube.

---

**Document Version**: 1.0
**Last Updated**: 2024
**Maintained By**: Open Source Community
