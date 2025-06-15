import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export function middleware(request) {
  // Only apply to M3U files
  if (request.nextUrl.pathname.endsWith('.m3u')) {
    
    // Get the id parameter from URL
    const id = request.nextUrl.searchParams.get('id')
    
    // If no id provided, block access
    if (!id) {
      console.log(`Blocked access - No ID provided from IP: ${request.ip}`)
      return new Response('Access Denied: ID required', { 
        status: 401,
        headers: {
          'Content-Type': 'text/plain'
        }
      })
    }
    
    try {
      // Read valid IDs from separate file
      const validIds = getValidIds()
      
      // Check if provided ID is valid
      if (!validIds.includes(id)) {
        console.log(`Blocked access - Invalid ID: ${id} from IP: ${request.ip}`)
        return new Response('Access Denied: Invalid ID', { 
          status: 403,
          headers: {
            'Content-Type': 'text/plain'
          }
        })
      }
      
      // Valid ID - log access and allow
      console.log(`Valid access - ID: ${id} from IP: ${request.ip}`)
      
      // Optional: Log usage for analytics
      logAccess(id, request.ip, request.geo?.country)
      
    } catch (error) {
      console.error('Error validating ID:', error)
      return new Response('Service Unavailable', { status: 503 })
    }
  }
  
  return NextResponse.next()
}

// Function to read valid IDs from file
function getValidIds() {
  try {
    // Read from valid_ids.json file
    const validIdsPath = join(process.cwd(), 'valid_ids.json')
    const fileContent = readFileSync(validIdsPath, 'utf8')
    const data = JSON.parse(fileContent)
    
    return data.valid_ids || []
  } catch (error) {
    // Fallback to environment variable if file doesn't exist
    const envIds = process.env.VALID_IDS
    if (envIds) {
      return envIds.split(',').map(id => id.trim())
    }
    
    // Default fallback IDs (remove in production)
    console.warn('No valid_ids.json found, using fallback IDs')
    return ['sjissjsjjs', 'weekly123', 'monthly456']
  }
}

// Optional: Log access for analytics
function logAccess(id, ip, country) {
  const timestamp = new Date().toISOString()
  console.log(`ACCESS_LOG: ${timestamp} | ID: ${id} | IP: ${ip} | Country: ${country}`)
  
  // You can extend this to write to database/file for analytics
}

// Apply middleware to M3U files
export const config = {
  matcher: [
    '/filtered_channels.m3u',
    '/((?!api/|_next/|favicon.ico).*\\.m3u$)'
  ]
}