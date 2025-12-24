# Manga Recap Video Generator

A free, web-based application that converts manga PDFs into narrated recap videos with AI-generated voiceovers. Perfect for creating manga recap content for YouTube channels.

## Features

- 📤 **Easy PDF Upload**: Simple drag-and-drop interface
- 🎬 **Automatic Video Generation**: Converts manga pages into video format
- 🎙️ **AI Narration**: Generates narration based on manga content
- 📊 **Real-time Progress**: See processing status in real-time
- 💯 **100% Free**: Uses only free tools and APIs
- 🚀 **Web-based**: No installation required, runs in browser

## Quick Start

### Prerequisites

1. Node.js (v18+)
2. FFmpeg installed on system

### Installation

```bash
npm install
npm run dev
```

Open http://localhost:3000

## How It Works

1. Upload manga PDF
2. System extracts pages as images
3. AI analyzes scenes and generates narration
4. FFmpeg creates video with subtitles
5. Download your recap video

## Deployment

**Important**: This app requires FFmpeg and file system access. Not suitable for Vercel serverless deployment.

Recommended platforms: VPS, Docker, Railway, Render, or Fly.io

## License

MIT License - Free for personal and commercial use
