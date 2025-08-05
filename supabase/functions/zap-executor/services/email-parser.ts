import { EmailMessage } from "./gmail.ts";

export class EmailParser {
  // Legacy method for backward compatibility
  parse(rawEmail: any): { subject: string, sender: string, body: string, timestamp: Date } {
    const headers = rawEmail.payload?.headers || [];
    const subject = headers.find((header: any) => header.name === 'Subject')?.value || 'No Subject';
    const senderDetails = headers.find((header: any) => header.name === 'From')?.value || '';
    const sender = senderDetails.split('<')[1]?.replace('>', '') || senderDetails;
    const snippet = rawEmail.snippet || '';
    const timestamp = rawEmail.internalDate ? new Date(parseInt(rawEmail.internalDate)) : new Date();

    return {
      subject,
      sender,
      body: snippet,
      timestamp
    };
  }

  // Enhanced method that returns EmailMessage interface
  parseToEmailMessage(rawEmail: any): EmailMessage {
    const headers = rawEmail.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
    const fromHeader = headers.find((h: any) => h.name === 'From')?.value || '';
    
    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.match(/<([^>]+)>/);
    const sender = emailMatch ? emailMatch[1] : fromHeader;
    
    const body = rawEmail.snippet || '';
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

  // Check if email matches trigger filters
  matchesFilters(email: EmailMessage, filters: {
    keywords?: string[]
    fromEmail?: string
  }): boolean {
    // Check keywords in subject and body
    if (filters.keywords && filters.keywords.length > 0) {
      const searchText = `${email.subject} ${email.body}`.toLowerCase();
      const hasKeyword = filters.keywords.some(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) return false;
    }

    // Check sender email
    if (filters.fromEmail && !email.sender.toLowerCase().includes(filters.fromEmail.toLowerCase())) {
      return false;
    }

    return true;
  }
}

