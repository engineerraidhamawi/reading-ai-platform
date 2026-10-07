'use client'

import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

export default function WaveformPlayer({ audioUrl }: { audioUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize WaveSurfer
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#c4b5fd', // Light purple
      progressColor: '#7c3aed', // Dark purple
      url: audioUrl,
      barWidth: 2,
      barRadius: 1,
      height: 40,
      normalize: true,
    })
    
    wavesurferRef.current = ws

    ws.on('ready', () => setIsReady(true))
    ws.on('play', () => setIsPlaying(true))
    ws.on('pause', () => setIsPlaying(false))
    ws.on('finish', () => setIsPlaying(false))

    // Cleanup on unmount
    return () => {
      ws.destroy()
    }
  }, [audioUrl])

  const togglePlayPause = () => {
    wavesurferRef.current?.playPause()
  }

  return (
    <div className="flex items-center gap-3 mt-2 w-full bg-purple-50 p-2 rounded-lg border border-purple-100">
      <button 
        onClick={togglePlayPause} 
        disabled={!isReady}
        className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-sm disabled:opacity-50 hover:bg-purple-700 transition flex-shrink-0"
      >
        {isPlaying ? '⏸️' : '▶️'}
      </button>
      <div ref={containerRef} className="flex-1 min-w-0" />
    </div>
  )
}
