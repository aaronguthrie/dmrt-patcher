import { validatePhotoUrl } from './validation'

export async function postToFacebook(postText: string, photoUrls: string[]): Promise<{ id: string }> {
  const pageId = process.env.FACEBOOK_PAGE_ID!
  const accessToken = process.env.META_ACCESS_TOKEN!

  if (photoUrls.length === 0) {
    // Text only
    const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
      method: 'POST',
      body: new URLSearchParams({
        message: postText,
        access_token: accessToken,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      // Sanitize error message to prevent information disclosure
      throw new Error('Failed to post to Facebook')
    }

    return response.json()
  } else {
    // With photo(s) - use first photo
    // Validate photo URL to prevent SSRF
    if (!validatePhotoUrl(photoUrls[0])) {
      throw new Error('Invalid photo URL')
    }
    
    const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
      method: 'POST',
      body: new URLSearchParams({
        url: photoUrls[0],
        caption: postText,
        access_token: accessToken,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      // Sanitize error message to prevent information disclosure
      throw new Error('Failed to post to Facebook')
    }

    return response.json()
  }
}

export async function postToInstagram(postText: string, photoUrl: string): Promise<{ id: string }> {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID!
  const accessToken = process.env.META_ACCESS_TOKEN!

  // Validate photo URL to prevent SSRF
  if (!validatePhotoUrl(photoUrl)) {
    throw new Error('Invalid photo URL')
  }

  // Step 1: Create media container
  const containerResponse = await fetch(
    `https://graph.instagram.com/v18.0/${accountId}/media`,
    {
      method: 'POST',
      body: new URLSearchParams({
        image_url: photoUrl,
        caption: postText,
        access_token: accessToken,
      }),
    }
  )

  if (!containerResponse.ok) {
    const error = await containerResponse.json()
    // Sanitize error message to prevent information disclosure
    throw new Error('Failed to post to Instagram')
  }

  const containerData = await containerResponse.json()
  const creationId = containerData.id

  // Step 2: Publish media
  const publishResponse = await fetch(
    `https://graph.instagram.com/v18.0/${accountId}/media_publish`,
    {
      method: 'POST',
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: accessToken,
      }),
    }
  )

  if (!publishResponse.ok) {
    const error = await publishResponse.json()
    // Sanitize error message to prevent information disclosure
    throw new Error('Failed to post to Instagram')
  }

  return publishResponse.json()
}
