'use client'

import { useEffect, useRef, useState } from 'react'

interface LogoWithTransparentBgProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}

export const LogoWithTransparentBg = ({
  src,
  alt,
  width,
  height,
  className,
}: LogoWithTransparentBgProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [processedSrc, setProcessedSrc] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      // Remove white/light backgrounds (threshold for white/light colors)
      // Adjust threshold to match the header background color #F8F8F8
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const brightness = (r + g + b) / 3

        // Remove pixels that are close to the header background (#F8F8F8 = rgb(248, 248, 248))
        // Also remove very light/white pixels
        if (
          (brightness > 240 && r > 230 && g > 230 && b > 230) ||
          (r > 240 && g > 240 && b > 240)
        ) {
          data[i + 3] = 0 // Set alpha to 0 (transparent)
        }
      }

      ctx.putImageData(imageData, 0, 0)
      setProcessedSrc(canvas.toDataURL('image/png'))
    }
    img.src = src
  }, [src, width, height])

  if (processedSrc) {
    return (
      <img
        src={processedSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{ display: 'block' }}
      />
    )
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        style={{ display: 'block' }}
      />
    </>
  )
}

