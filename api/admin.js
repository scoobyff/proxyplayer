import { readFileSync, writeFileSync, existsSync } from 'fs';

const LOGS_FILE = 'access-logs.json';
const BLOCKED_IPS_FILE = 'blocked-ips.json';

export default async function handler(req, res) {
  // Simple password authentication
  const { password, action, ip, reason } = req.method === 'POST' ? req.body : req.query;
  
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  
  try {
    // Handle different actions
    switch (action) {
      case 'logs':
        return getLogs(req, res);
      case 'block':
        return blockIP(req, res, ip, reason);
      case 'unblock':
        return unblockIP(req, res, ip);
      case 'stats':
        return getStats(req, res);
      default:
        return getLogs(req, res);
    }
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function getLogs(req, res) {
  try {
    const { limit = 100 } = req.query;
    
    let logs = [];
    if (existsSync(LOGS_FILE)) {
      const fileContent = readFileSync(LOGS_FILE, 'utf8');
      logs = JSON.parse(fileContent);
    }
    
    // Sort by timestamp (newest first) and limit
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    logs = logs.slice(0, parseInt(limit));
    
    // Calculate IP frequency for last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter(log => new Date(log.timestamp) > oneDayAgo);
    
    const ipCounts = {};
    recentLogs.forEach(log => {
      ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
    });
    
    res.json({
      logs: logs.map(log => ({
        ip_address: log.ip,
        user_agent: log.userAgent,
        referer: log.referer,
        accessed_at: log.timestamp
      })),
      ipCounts,
      totalLogs: logs.length
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
}

function blockIP(req, res, ip, reason = 'Blocked by admin') {
  try {
    if (!ip) {
      return res.status(400).json({ error: 'IP address required' });
    }
    
    let blockedIPs = [];
    if (existsSync(BLOCKED_IPS_FILE)) {
      const fileContent = readFileSync(BLOCKED_IPS_FILE, 'utf8');
      blockedIPs = JSON.parse(fileContent);
    }
    
    // Check if IP is already blocked
    if (blockedIPs.some(item => item.ip === ip)) {
      return res.json({ message: 'IP already blocked' });
    }
    
    // Add new blocked IP
    blockedIPs.push({
      ip: ip,
      reason: reason,
      blocked_at: new Date().toISOString()
    });
    
    // Write back to file
    writeFileSync(BLOCKED_IPS_FILE, JSON.stringify(blockedIPs, null, 2));
    
    res.json({ message: `IP ${ip} has been blocked` });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({ error: 'Failed to block IP' });
  }
}

function unblockIP(req, res, ip) {
  try {
    if (!ip) {
      return res.status(400).json({ error: 'IP address required' });
    }
    
    let blockedIPs = [];
    if (existsSync(BLOCKED_IPS_FILE)) {
      const fileContent = readFileSync(BLOCKED_IPS_FILE, 'utf8');
      blockedIPs = JSON.parse(fileContent);
    }
    
    // Remove the IP from blocked list
    const originalLength = blockedIPs.length;
    blockedIPs = blockedIPs.filter(item => item.ip !== ip);
    
    // Write back to file
    writeFileSync(BLOCKED_IPS_FILE, JSON.stringify(blockedIPs, null, 2));
    
    if (blockedIPs.length < originalLength) {
      res.json({ message: `IP ${ip} has been unblocked` });
    } else {
      res.json({ message: `IP ${ip} was not in blocked list` });
    }
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ error: 'Failed to unblock IP' });
  }
}

function getStats(req, res) {
  try {
    let logs = [];
    if (existsSync(LOGS_FILE)) {
      const fileContent = readFileSync(LOGS_FILE, 'utf8');
      logs = JSON.parse(fileContent);
    }
    
    let blockedIPs = [];
    if (existsSync(BLOCKED_IPS_FILE)) {
      const fileContent = readFileSync(BLOCKED_IPS_FILE, 'utf8');
      blockedIPs = JSON.parse(fileContent);
    }
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filter logs by time periods
    const todayLogs = logs.filter(log => new Date(log.timestamp) > oneDayAgo);
    const weekLogs = logs.filter(log => new Date(log.timestamp) > oneWeekAgo);
    
    // Calculate unique IPs
    const uniqueIPsToday = new Set(todayLogs.map(log => log.ip)).size;
    const uniqueIPsWeek = new Set(weekLogs.map(log => log.ip)).size;
    
    res.json({
      accessesToday: todayLogs.length,
      accessesThisWeek: weekLogs.length,
      uniqueIPsToday,
      uniqueIPsWeek,
      totalBlockedIPs: blockedIPs.length
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
}