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
      
      // Check if provided ID is valid and not expired
      const validationResult = validateId(id)
      
      if (!validationResult.isValid) {
        console.log(`Blocked access - ${validationResult.reason}: ${id} from IP: ${request.ip}`)
        return new Response(`Access Denied: ${validationResult.reason}`, { 
          status: validationResult.status,
          headers: {
            'Content-Type': 'text/plain'
          }
        })
      }
      
      // Valid ID - log access and allow
      console.log(`Valid access - ID: ${id} (${validationResult.type}) from IP: ${request.ip}`)
      
      // Optional: Log usage for analytics
      logAccess(id, request.ip, request.geo?.country, validationResult.type)
      
    } catch (error) {
      console.error('Error validating ID:', error)
      return new Response('Service Unavailable', { status: 503 })
    }
  }
  
  return NextResponse.next()
}

// Function to validate ID and check expiry
function validateId(id) {
  try {
    const validIdsPath = join(process.cwd(), 'valid_ids.json')
    const fileContent = readFileSync(validIdsPath, 'utf8')
    const data = JSON.parse(fileContent)
    
    // Check if ID exists
    if (!data.valid_ids || !data.valid_ids[id]) {
      return {
        isValid: false,
        reason: 'Invalid ID',
        status: 403
      }
    }
    
    const idDetails = data.valid_ids[id]
    const currentTime = new Date()
    const expiryDate = new Date(idDetails.expires)
    
    // Check if ID has expired
    if (expiryDate <= currentTime) {
      return {
        isValid: false,
        reason: 'ID Expired',
        status: 410, // Gone
        expiredOn: idDetails.expires
      }
    }
    
    // ID is valid and not expired
    return {
      isValid: true,
      type: idDetails.type,
      description: idDetails.description,
      expiresOn: idDetails.expires
    }
    
  } catch (error) {
    console.error('Error validating ID:', error)
    return {
      isValid: false,
      reason: 'Service Error',
      status: 500
    }
  }
}

// Function to read valid IDs from file and check expiry
function getValidIds() {
  try {
    // Read from valid_ids.json file
    const validIdsPath = join(process.cwd(), 'valid_ids.json')
    const fileContent = readFileSync(validIdsPath, 'utf8')
    const data = JSON.parse(fileContent)
    
    const currentTime = new Date()
    const validIds = []
    
    // Check each ID for expiry
    for (const [id, details] of Object.entries(data.valid_ids || {})) {
      const expiryDate = new Date(details.expires)
      
      if (expiryDate > currentTime) {
        validIds.push(id)
      } else {
        console.log(`ID expired: ${id} (expired on ${details.expires})`)
      }
    }
    
    return validIds
  } catch (error) {
    // Fallback to environment variable if file doesn't exist
    const envIds = process.env.VALID_IDS
    if (envIds) {
      return envIds.split(',').map(id => id.trim())
    }
    
    // Default fallback IDs (remove in production)
    console.warn('No valid_ids.json found, using fallback IDs')
    return ['sjissjsjjs']
  }
}

// Optional: Log access for analytics
function logAccess(id, ip, country, type) {
  const timestamp = new Date().toISOString()
  console.log(`ACCESS_LOG: ${timestamp} | ID: ${id} | Type: ${type} | IP: ${ip} | Country: ${country}`)
  
  // You can extend this to write to database/file for analytics
}

// Apply middleware to M3U files
export const config = {
  matcher: [
    '/filtered_channels.m3u',
    '/((?!api/|_next/|favicon.ico).*\\.m3u$)'
  ]
}