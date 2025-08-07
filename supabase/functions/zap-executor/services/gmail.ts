import { supabase } from "../lib/supabase.ts";
export class GmailService {
  maxRetries = 3;
  retryDelay = 1000;
  async fetchNewEmails(userId, query = 'is:unread', maxResults = 10) {
    const integration = await this.retrieveIntegration(userId, 'gmail');
    if (!integration) {
      throw new Error('Gmail integration not found for user');
    }
    let accessToken = integration.credentials.access_token;
    try {
      const messages = await this.listMessages(accessToken, query, maxResults);
      // Process messages sequentially to avoid rate limits
      const emails = [];
      for (const msg of messages.slice(0, 5)){
        try {
          const email = await this.getMessageDetails(accessToken, msg.id);
          emails.push(email);
          // Add small delay between requests
          await this.delay(200); // 200ms delay
        } catch (error) {
          console.warn(`Failed to fetch email ${msg.id}:`, error.message);
        // Continue with other emails
        }
      }
      return emails;
    } catch (error) {
      // If 401 error, try to refresh token
      if (error.message.includes('401') && integration.credentials.refresh_token) {
        console.log('Access token expired, attempting refresh');
        try {
          accessToken = await this.refreshAccessToken(integration);
          // Retry with new token
          const messages = await this.listMessages(accessToken, query, maxResults);
          const emails = [];
          for (const msg of messages.slice(0, 5)){
            try {
              const email = await this.getMessageDetails(accessToken, msg.id);
              emails.push(email);
              await this.delay(200);
            } catch (error) {
              console.warn(`Failed to fetch email ${msg.id}:`, error.message);
            }
          }
          return emails;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Gmail authentication failed. Please reconnect Gmail in integrations.');
        }
      }
      console.error('Failed to fetch emails:', error);
      throw error;
    }
  }
  async fetchEmailsWithFilters(userId, filters) {
    let query = 'is:unread';
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordQuery = filters.keywords.map((k)=>`"${k}"`).join(' OR ');
      query += ` AND (${keywordQuery})`;
    }
    if (filters.fromEmail) {
      query += ` AND from:${filters.fromEmail}`;
    }
    return this.fetchNewEmails(userId, query, filters.maxResults || 10);
  }
  async retrieveIntegration(userId, serviceName) {
    const { data, error } = await supabase.from('integrations').select('*').eq('user_id', userId).eq('service_name', serviceName).single();
    if (error) {
      console.error('Error retrieving integration:', error);
      return null;
    }
    return data;
  }
  async listMessages(accessToken, query = 'is:unread', maxResults = 10) {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });
    return this.retryApiCall(async ()=>{
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error fetching message list: ${error}`);
      }
      const data = await response.json();
      return data.messages || [];
    });
  }
  async getMessageDetails(accessToken, messageId) {
    return this.retryApiCall(async ()=>{
      // Request full format to get complete email body
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Error fetching message details: ${error}`);
      }
      const rawEmail = await response.json();
      return this.parseEmailMessage(rawEmail);
    });
  }
  parseEmailMessage(rawEmail) {
    const headers = rawEmail.payload?.headers || [];
    const subject = headers.find((h)=>h.name === 'Subject')?.value || 'No Subject';
    const fromHeader = headers.find((h)=>h.name === 'From')?.value || '';
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.match(/<([^>]+)>/);
    const sender = emailMatch ? emailMatch[1] : fromHeader;
    // Extract full body content instead of just snippet
    const body = this.extractEmailBody(rawEmail.payload);
    const timestamp = rawEmail.internalDate ? new Date(parseInt(rawEmail.internalDate)) : new Date();
    return {
      id: rawEmail.id,
      subject,
      sender,
      body,
      timestamp,
      threadId: rawEmail.threadId
    };
  }
  extractEmailBody(payload) {
    if (!payload) return '';
    // Handle different email structures
    if (payload.body && payload.body.data) {
      // Single part message
      return this.decodeBase64Url(payload.body.data);
    }
    if (payload.parts && payload.parts.length > 0) {
      // Multi-part message
      let textBody = '';
      let htmlBody = '';
      const extractFromParts = (parts)=>{
        for (const part of parts){
          const mimeType = part.mimeType;
          if (part.parts) {
            // Nested parts (e.g., multipart/alternative within multipart/mixed)
            extractFromParts(part.parts);
          } else if (part.body && part.body.data) {
            const content = this.decodeBase64Url(part.body.data);
            if (mimeType === 'text/plain') {
              textBody = content;
            } else if (mimeType === 'text/html') {
              htmlBody = content;
            }
          }
        }
      };
      extractFromParts(payload.parts);
      // Prefer HTML content if available, otherwise use plain text
      if (htmlBody) {
        // Strip HTML tags for plain text representation
        return this.stripHtmlTags(htmlBody);
      } else if (textBody) {
        return textBody;
      }
    }
    // Fallback to snippet if body extraction fails
    return payload.snippet || '';
  }
  decodeBase64Url(encodedData) {
    try {
      // Convert base64url to base64
      const base64 = encodedData.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if necessary
      const padded = base64 + '==='.slice(0, (4 - base64.length % 4) % 4);
      // Decode base64
      const decoded = atob(padded);
      // Convert to UTF-8
      return decodeURIComponent(escape(decoded));
    } catch (error) {
      console.warn('Error decoding base64 email content:', error);
      return '';
    }
  }
  stripHtmlTags(html) {
    // Basic HTML tag removal - you might want to use a more sophisticated HTML parser
    return html.replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  }
  async retryApiCall(apiCall) {
    let lastError;
    for(let attempt = 1; attempt <= this.maxRetries; attempt++){
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        // Check if error is retryable (429 rate limit, 5xx server errors)
        const isRetryable = error.message.includes('429') || error.message.includes('5') || error.message.includes('timeout');
        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }
        console.warn(`API call failed (attempt ${attempt}/${this.maxRetries}), retrying in ${this.retryDelay}ms:`, error.message);
        await this.delay(this.retryDelay * attempt); // Exponential backoff
      }
    }
    throw lastError;
  }
  delay(ms) {
    return new Promise((resolve)=>setTimeout(resolve, ms));
  }
  async refreshAccessToken(integration) {
    const { credentials } = integration;
    if (!credentials.refresh_token) {
      throw new Error('No refresh token available');
    }
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token'
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }
    const tokens = await response.json();
    // Update the integration with new tokens
    const newCredentials = {
      ...credentials,
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      obtained_at: new Date().toISOString()
    };
    // Update in database
    await supabase.from('integrations').update({
      credentials: newCredentials
    }).eq('id', integration.id);
    console.log('Access token refreshed successfully');
    return tokens.access_token;
  }
}

