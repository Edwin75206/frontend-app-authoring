export const validPdf = file => Boolean(file && /\.pdf$/i.test(file.name)
  && (!file.type || ['application/pdf', 'application/octet-stream'].includes(file.type)));

// Use the URL returned by the existing course-assets API. Never synthesize an asset key.
export const pdfAssetUrl = asset => {
  const url = asset?.url;
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')
    || /[\\\s]/.test(url) || !asset.id) {
    throw new Error('Invalid course asset response');
  }
  return url;
};

export const validSettings = (title, height) => Boolean(title.trim()
  && /^\d+$/.test(String(height)) && Number(height) >= 200 && Number(height) <= 2000);

export const pdfHtml = (asset, title, height) => {
  if (!validSettings(title, height)) { throw new Error('Invalid PDF settings'); }
  const frame = document.createElement('iframe');
  frame.setAttribute('src', pdfAssetUrl(asset));
  frame.setAttribute('title', title.trim());
  frame.setAttribute('width', '100%');
  frame.setAttribute('height', String(Number(height)));
  frame.setAttribute('style', 'width: 100%; border: 0;');
  frame.setAttribute('data-academus-pdf', 'true');
  return frame.outerHTML;
};

export const isPdfAsset = asset => {
  try {
    pdfAssetUrl(asset);
    return asset.contentType === 'application/pdf' || /\.pdf$/i.test(asset.displayName || '');
  } catch (error) {
    return false;
  }
};
