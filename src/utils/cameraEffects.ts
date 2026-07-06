export function applyFocusPeaking(
  videoElement: HTMLVideoElement,
  peakingCanvas: HTMLCanvasElement,
  color: "green" | "cyan" | "red",
  threshold: number = 32
) {
  const ctx = peakingCanvas.getContext("2d");
  if (!ctx) return;

  // We run focus peaking on a smaller scale for optimal performance (fps)
  const scaleWidth = 480;
  const scaleHeight = 270;
  
  if (peakingCanvas.width !== videoElement.videoWidth || peakingCanvas.height !== videoElement.videoHeight) {
    peakingCanvas.width = videoElement.videoWidth || 640;
    peakingCanvas.height = videoElement.videoHeight || 360;
  }

  const width = peakingCanvas.width;
  const height = peakingCanvas.height;

  // Create a temporary offscreen canvas for downsampled processing
  const offscreen = document.createElement("canvas");
  offscreen.width = scaleWidth;
  offscreen.height = scaleHeight;
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;

  // Draw scaled video frame
  offCtx.drawImage(videoElement, 0, 0, scaleWidth, scaleHeight);
  const imgData = offCtx.getImageData(0, 0, scaleWidth, scaleHeight);
  const data = imgData.data;

  // Prepare full-size output image
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = color === "green" ? "#22c55e" : color === "cyan" ? "#06b6d4" : "#ef4444";
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  // Simple Sobel/contrast edge detection
  for (let y = 1; y < scaleHeight - 1; y++) {
    for (let x = 1; x < scaleWidth - 1; x++) {
      const idx = (y * scaleWidth + x) * 4;

      // Pixel luminance
      const l = data[idx] * 0.3 + data[idx + 1] * 0.59 + data[idx + 2] * 0.11;
      
      // Right neighbor luminance
      const lRight = data[idx + 4] * 0.3 + data[idx + 5] * 0.59 + data[idx + 6] * 0.11;
      
      // Bottom neighbor luminance
      const lBottom = data[((y + 1) * scaleWidth + x) * 4] * 0.3 + data[((y + 1) * scaleWidth + x) * 4 + 1] * 0.59 + data[((y + 1) * scaleWidth + x) * 4 + 2] * 0.11;

      // Compute simple gradient magnitude
      const gradX = lRight - l;
      const gradY = lBottom - l;
      const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);

      if (magnitude > threshold) {
        // Map back to canvas coordinates
        const mapX = (x / scaleWidth) * width;
        const mapY = (y / scaleHeight) * height;

        ctx.moveTo(mapX, mapY);
        ctx.lineTo(mapX + 2, mapY);
      }
    }
  }
  ctx.stroke();
}
