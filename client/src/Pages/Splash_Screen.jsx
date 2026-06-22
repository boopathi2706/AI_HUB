import React, { useState, useEffect, useRef } from 'react';

const Splash_Screen = () => {
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  const totalFrames = 97;
  const duration = 10000; // 10 seconds

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const images = [];
    let loadedCount = 0;

    // Load images
    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      const frameNum = i.toString().padStart(3, '0');
      img.src = `ezgif-frame-${frameNum}.jpg`;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalFrames) {
          setIsLoaded(true);
        }
      };
      images.push(img);
    }

    // Animation Loop
    let animationFrameId;
    const startAnimation = () => {
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const p = Math.min(elapsed / duration, 1);
        setProgress(p);

        const frameIndex = Math.floor(p * (totalFrames - 1));
        const img = images[frameIndex];

        if (img && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const x = (canvas.width - img.width * scale) / 2;
          const y = (canvas.height - img.height * scale) / 2;
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        }

        if (p < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };
      animationFrameId = requestAnimationFrame(animate);
    };

    if (isLoaded) {
      startAnimation();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isLoaded]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="w-[80vw] max-w-[500px] aspect-square">
        {!isLoaded && (
          <div className="text-white flex items-center justify-center h-full">
            Loading Assets...
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          width={500} 
          height={500}
          className="w-screen h-screen block"
        />
      </div>
    </div>
  );
};

export default Splash_Screen;