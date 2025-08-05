import { Integration, supabase } from "../lib/supabase.ts";

export interface EmailMessage {
  id: string
  subject: string
  sender: string
  body: string
  timestamp: Date
  threadId: string
}

export class GmailService {
  private readonly maxRetries = 3
  private readonly retryDelay = 1000 // 1 second

  async fetchNewEmails(userId: string, query = 'is:unread', maxResults = 10): Promise<EmailMessage[]> {
    const integration = await this.retrieveIntegration(userId, 'gmail');

    if (!integration) {
      throw new Error('Gmail integration not found for user');
    }

    let accessToken = integration.credentials.access_token;

    try {
      const messages = await this.listMessages(accessToken, query, maxResults);
      // Process messages sequentially to avoid rate limits
      const emails: EmailMessage[] = [];
      for (const msg of messages.slice(0, 5)) { // Limit to 5 emails per run to avoid rate limits
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
          const emailPromises = messages.map(msg => this.getMessageDetails(accessToken, msg.id));
          return await Promise.all(emailPromises);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw new Error('Gmail authentication failed. Please reconnect Gmail in integrations.');
        }
      }
      console.error('Failed to fetch emails:', error);
      throw error;
    }
  }

  async fetchEmailsWithFilters(userId: string, filters: {
    keywords?: string[]
    fromEmail?: string
    maxResults?: number
  }): Promise<EmailMessage[]> {
    let query = 'is:unread';
    
    if (filters.keywords && filters.keywords.length > 0) {
      const keywordQuery = filters.keywords.map(k => `"${k}"`).join(' OR ');
      query += ` AND (${keywordQuery})`;
    }
    
    if (filters.fromEmail) {
      query += ` AND from:${filters.fromEmail}`;
    }

    return this.fetchNewEmails(userId, query, filters.maxResults || 10);
  }

  private async retrieveIntegration(userId: string, serviceName: string): Promise<Integration | null> {
    const { data, error } = await supabase
      .from<Integration>('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('service_name', serviceName)
      .single();

    if (error) {
      console.error('Error retrieving integration:', error);
      return null;
    }

    return data;
  }

  private async listMessages(accessToken: string, query = 'is:unread', maxResults = 10): Promise<any[]> {
    const params = new URLSearchParams({
      q: query,
      maxResults: maxResults.toString()
    });

    return this.retryApiCall(async () => {
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

  private async getMessageDetails(accessToken: string, messageId: string): Promise<EmailMessage> {
    return this.retryApiCall(async () => {
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
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

  private parseEmailMessage(rawEmail: any): EmailMessage {
    const headers = rawEmail.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
    const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
    
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.match(/<([^>]+)>/);
    const sender = emailMatch ? emailMatch[1] : fromHeader;
    
    const body = rawEmail.snippet || '';
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

  private async retryApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable (429 rate limit, 5xx server errors)
        const isRetryable = error.message.includes('429') || 
                           error.message.includes('5') || 
                           error.message.includes('timeout');
        
        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }
        
        console.warn(`API call failed (attempt ${attempt}/${this.maxRetries}), retrying in ${this.retryDelay}ms:`, error.message);
        await this.delay(this.retryDelay * attempt); // Exponential backoff
      }
    }
    
    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async refreshAccessToken(integration: Integration): Promise<string> {
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
      expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      obtained_at: new Date().toISOString()
    };

    // Update in database
    await supabase
      .from('integrations')
      .update({ credentials: newCredentials })
      .eq('id', integration.id);

    console.log('Access token refreshed successfully');
    return tokens.access_token;
  }
}

