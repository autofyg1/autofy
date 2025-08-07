export class EmailParser {
  // Legacy method for backward compatibility
  parse(rawEmail) {
    const headers = rawEmail.payload?.headers || [];
    const subject = headers.find((header)=>header.name === 'Subject')?.value || 'No Subject';
    const senderDetails = headers.find((header)=>header.name === 'From')?.value || '';
    const sender = senderDetails.split('<')[1]?.replace('>', '') || senderDetails;
    // Extract full body instead of just snippet
    const body = this.extractEmailBody(rawEmail.payload) || rawEmail.snippet || '';
    const timestamp = rawEmail.internalDate ? new Date(parseInt(rawEmail.internalDate)) : new Date();
    return {
      subject,
      sender,
      body,
      timestamp
    };
  }
  // Enhanced method that returns EmailMessage interface
  parseToEmailMessage(rawEmail) {
    const headers = rawEmail.payload?.headers || [];
    const subject = headers.find((h)=>h.name === 'Subject')?.value || 'No Subject';
    const fromHeader = headers.find((h)=>h.name === 'From')?.value || '';
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.match(/<([^>]+)>/);
    const sender = emailMatch ? emailMatch[1] : fromHeader;
    // Extract full body instead of just snippet
    const body = this.extractEmailBody(rawEmail.payload) || rawEmail.snippet || '';
    const timestamp = rawEmail.internalDate ? new Date(parseInt(rawEmail.internalDate)) : new Date();
    return {
      id: rawEmail.id || '',
      subject,
      sender,
      body,
      timestamp,
      threadId: rawEmail.threadId || ''
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
    // Return empty string if body extraction fails
    return '';
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
  // Check if email matches trigger filters
  matchesFilters(email, filters) {
    // Check keywords in subject and body
    if (filters.keywords && filters.keywords.length > 0) {
      const searchText = `${email.subject} ${email.body}`.toLowerCase();
      const hasKeyword = filters.keywords.some((keyword)=>searchText.includes(keyword.toLowerCase()));
      if (!hasKeyword) return false;
    }
    // Check sender email
    if (filters.fromEmail && !email.sender.toLowerCase().includes(filters.fromEmail.toLowerCase())) {
      return false;
    }
    return true;
  }
}
