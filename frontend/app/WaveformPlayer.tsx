'use client'

import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

export default function WaveformPlayer({ audioUrl, transcript }: { audioUrl: string, transcript?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [activeWord, setActiveWord] = useState(-1)
  
  const words = transcript ? transcript.split(/\s+/) : []

  useEffect(() => {
    if (!containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#c4b5fd',
      progressColor: '#7c3aed',
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
    ws.on('finish', () => {
      setIsPlaying(false)
      setActiveWord(-1) // Reset highlight when finished
    })
    
    // NEW: Karaoke highlight logic
    ws.on('audioprocess', (currentTime) => {
      const duration = ws.getDuration()
      if (duration > 0 && words.length > 0) {
        const progress = currentTime / duration
        const currentWordIndex = Math.floor(progress * words.length)
        if (currentWordIndex !== activeWord) {
          setActiveWord(currentWordIndex)
        }
      }
    })

    return () => {
      ws.destroy()
    }
  }, [audioUrl])

  const togglePlayPause = () => {
    wavesurferRef.current?.playPause()
  }

  return (
    <div className="mt-2 w-full">
      {/* NEW: Karaoke Transcript Display */}
      {transcript && (
        <p className="italic mb-2 block text-purple-500 text-xs leading-loose bg-white/60 rounded-md p-2 border border-purple-50 break-words" dir="rtl">
          {words.map((word, idx) => (
            <span key={idx} className={`transition-all duration-100 ease-in-out ${idx === activeWord ? 'bg-purple-200 text-purple-900 font-bold rounded px-1' : ''}`}>
              {word}{' '}
            </span>
          ))}
        </p>
      )}
      
      <div className="flex items-center gap-3 w-full bg-purple-50 p-2 rounded-lg border border-purple-100">
        <button 
          onClick={togglePlayPause} 
          disabled={!isReady}
          className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-sm disabled:opacity-50 hover:bg-purple-700 transition flex-shrink-0"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        <div ref={containerRef} className="flex-1 min-w-0" />
      </div>
    </div>
  )
}
