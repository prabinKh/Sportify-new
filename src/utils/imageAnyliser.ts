import { getColor } from 'colorthief';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    if (!src) {
      const fallbackImg = new Image();
      resolve(fallbackImg);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin
      const retryImg = new Image();
      retryImg.onload = () => resolve(retryImg);
      retryImg.onerror = () => resolve(img);
      retryImg.src = src;
    };
    img.src = src;
  });
}

function getAverageRGB(imgEl: HTMLImageElement) {
  const defaultRGB = { r: 36, g: 36, b: 36 }; // #242424

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext && canvas.getContext('2d');
    if (!context) return defaultRGB;

    const height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height || 100;
    const width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width || 100;

    context.drawImage(imgEl, 0, 0);

    const data = context.getImageData(0, 0, width, height);
    const length = data.data.length;
    let i = -4;
    let count = 0;
    const rgb = { r: 0, g: 0, b: 0 };
    const blockSize = 5;

    while ((i += blockSize * 4) < length) {
      ++count;
      rgb.r += data.data[i];
      rgb.g += data.data[i + 1];
      rgb.b += data.data[i + 2];
    }

    if (count === 0) return defaultRGB;

    rgb.r = ~~(rgb.r / count);
    rgb.g = ~~(rgb.g / count);
    rgb.b = ~~(rgb.b / count);
    return rgb;
  } catch (e) {
    return defaultRGB;
  }
}

function componentToHex(c: any) {
  const hex = (c || 0).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export const getImageAnalysis = async (src: string): Promise<string> => {
  try {
    if (!src) return '#181818';
    const img = await loadImage(src);
    const response = getAverageRGB(img);
    return rgbToHex(response.r, response.g, response.b);
  } catch {
    return '#181818';
  }
};

export const getImageAnalysis2 = async (src: string): Promise<string> => {
  try {
    if (!src) return '#181818';
    const img = await loadImage(src);
    try {
      const color = await getColor(img);
      if (color && typeof color.hex === 'function') {
        return color.hex();
      }
    } catch {
      // ColorThief failed (e.g. CORS on canvas), use average RGB fallback
    }
    const avg = getAverageRGB(img);
    return rgbToHex(avg.r, avg.g, avg.b);
  } catch {
    return '#181818';
  }
};
