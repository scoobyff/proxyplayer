import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const LOGS_FILE = 'access-logs.json';
const BLOCKED_IPS_FILE = 'blocked-ips.json';

export default async function handler(req, res) {
  try {
    // Get client IP and info
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const referer = req.headers.referer || null;
    const timestamp = new Date().toISOString();
    
    // Check if IP is blocked
    const blockedIPs = getBlockedIPs();
    if (blockedIPs.includes(clientIP)) {
      console.log(`Blocked IP attempted access: ${clientIP}`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Your IP has been blocked'
      });
    }
    
    // Log the access
    logAccess({
      ip: clientIP,
      userAgent,
      referer,
      timestamp
    });
    
    // Read your M3U playlist file
    const playlistPath = path.join(process.cwd(), 'playlist.m3u');
    let playlistContent;
    
    try {
      playlistContent = readFileSync(playlistPath, 'utf8');
    } catch (error) {
      console.error('Playlist file not found:', error);
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'attachment; filename="playlist.m3u"');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    
    // Send the playlist
    res.send(playlistContent);
    
  } catch (error) {
    console.error('Error in playlist API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cfIP = req.headers['cf-connecting-ip'];
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfIP) {
    return cfIP;
  }
  
  return req.socket.remoteAddress || 'unknown';
}

function logAccess(accessData) {
  try {
    let logs = [];
    
    // Read existing logs
    if (existsSync(LOGS_FILE)) {
      const fileContent = readFileSync(LOGS_FILE, 'utf8');
      logs = JSON.parse(fileContent);
    }
    
    // Add new log
    logs.push(accessData);
    
    // Keep only last 1000 logs to prevent file from getting too large
    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }
    
    // Write back to file
    writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
    
  } catch (error) {
    console.error('Error logging access:', error);
  }
}

function getBlockedIPs() {
  try {
    if (existsSync(BLOCKED_IPS_FILE)) {
      const fileContent = readFileSync(BLOCKED_IPS_FILE, 'utf8');
      const blockedData = JSON.parse(fileContent);
      return blockedData.map(item => item.ip);
    }
    return [];
  } catch (error) {
    console.error('Error reading blocked IPs:', error);
    return [];
  }
}