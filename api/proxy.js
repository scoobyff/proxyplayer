// api/proxy.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(targetUrl);
    
    // Set headers to mimic a request from Bangladesh
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'bn-BD,bn;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'X-Forwarded-For': '103.179.156.62', // Bangladesh IP range
      'CF-IPCountry': 'BD'
    };

    // Forward Range header if present (for video streaming)
    if (req.headers.range) {
      headers.Range = req.headers.range;
    }

    // Fetch the content
    const response = await fetch(decodedUrl, {
      method: req.method,
      headers: headers,
    });

    // Forward status code
    res.status(response.status);

    // Forward relevant headers
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges');
    const contentRange = response.headers.get('content-range');
    const cacheControl = response.headers.get('cache-control');

    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (cacheControl) res.setHeader('Cache-Control', cacheControl);

    // Stream the response
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch content',
      message: error.message 
    });
  }
  }
