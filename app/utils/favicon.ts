// utils/favicon.ts
export const setFavicon = (isTracking: boolean) => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Load your existing favicon
    const img = new Image();
    img.onload = () => {
      // Draw the original favicon
      ctx.drawImage(img, 0, 0, 32, 32);
      
      // Add green circle indicator if tracking
      if (isTracking) {
        ctx.beginPath();
        ctx.arc(24, 8, 6, 0, 2 * Math.PI); // Top-right corner
        ctx.fillStyle = '#00FF00'; // Bright green
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // Update favicon
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = canvas.toDataURL();
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = canvas.toDataURL();
        document.head.appendChild(newLink);
      }
    };
    
    // Set the source to your current favicon
    img.src = '/favicon.ico'; // or whatever your favicon path is
  }
};