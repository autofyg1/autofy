// Gmail API functions for email operations
import { supabase } from './supabase';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  replyToMessageId?: string;
  threadId?: string;
  isHtml?: boolean;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId: string;
    mimeType: string;
    filename: string;
    headers: { name: string; value: string }[];
    body: {
      attachmentId?: string;
      size: number;
      data?: string;
    };
    parts?: any[];
  };
  sizeEstimate: number;
  raw?: string;
}

// Get Gmail access token for the current user
export const getGmailAccessToken = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data: integration } = await supabase
    .from('integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .eq('service', 'gmail')
    .single();

  if (!integration) {
    throw new Error('Gmail integration not found. Please connect your Gmail account first.');
  }

  // Check if token needs refresh
  if (integration.expires_at && new Date(integration.expires_at) <= new Date()) {
    // Token expired, need to refresh
    // This should ideally be handled by your OAuth flow
    throw new Error('Gmail access token expired. Please reconnect your Gmail account.');
  }

  return integration.access_token;
};

// Send an email using Gmail API
export const sendEmail = async (message: EmailMessage): Promise<{ messageId: string; threadId: string }> => {
  const accessToken = await getGmailAccessToken();
  
  // Create the email message in RFC 2822 format
  const emailBody = createRawEmailMessage(message);
  
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: emailBody,
      threadId: message.threadId // Include threadId if replying
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  const result = await response.json();
  return {
    messageId: result.id,
    threadId: result.threadId
  };
};

// Create a raw email message in base64url format
const createRawEmailMessage = (message: EmailMessage): string => {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36)}`;
  
  let emailContent = '';
  emailContent += `To: ${message.to}\r\n`;
  emailContent += `Subject: ${message.subject}\r\n`;
  
  if (message.replyToMessageId) {
    emailContent += `In-Reply-To: <${message.replyToMessageId}>\r\n`;
  }
  
  emailContent += `Content-Type: ${message.isHtml ? 'text/html' : 'text/plain'}; charset=utf-8\r\n`;
  emailContent += `MIME-Version: 1.0\r\n`;
  emailContent += `\r\n`;
  emailContent += message.body;

  // Convert to base64url format (Gmail API requirement)
  return btoa(emailContent)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Get email details for replies
export const getEmailDetails = async (messageId: string): Promise<GmailMessage> => {
  const accessToken = await getGmailAccessToken();
  
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get email details: ${error}`);
  }

  return await response.json();
};

// Extract sender's email from Gmail message
export const getSenderEmail = (message: GmailMessage): string => {
  const fromHeader = message.payload.headers.find(h => h.name.toLowerCase() === 'from');
  if (!fromHeader) {
    throw new Error('No sender found in email');
  }
  
  // Extract email from "Name <email@domain.com>" format
  const emailMatch = fromHeader.value.match(/<([^>]+)>/) || [null, fromHeader.value];
  return emailMatch[1] || fromHeader.value;
};

// Extract subject from Gmail message (for replies)
export const getSubjectForReply = (message: GmailMessage): string => {
  const subjectHeader = message.payload.headers.find(h => h.name.toLowerCase() === 'subject');
  const originalSubject = subjectHeader?.value || 'No Subject';
  
  // Add "Re: " prefix if not already present
  if (!originalSubject.toLowerCase().startsWith('re:')) {
    return `Re: ${originalSubject}`;
  }
  
  return originalSubject;
};

// Extract Message-ID from Gmail message (for proper reply threading)
export const getMessageId = (message: GmailMessage): string => {
  const messageIdHeader = message.payload.headers.find(h => h.name.toLowerCase() === 'message-id');
  return messageIdHeader?.value || '';
};

// Process template variables in email content
export const processEmailTemplate = (
  template: string, 
  variables: Record<string, any>
): string => {
  let processed = template;
  
  // Replace all template variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, String(value || ''));
  });
  
  return processed;
};

// Validate email address format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Send a reply to an existing email
export const sendReply = async (
  originalMessageId: string,
  replyContent: string,
  customTo?: string
): Promise<{ messageId: string; threadId: string }> => {
  // Get original email details
  const originalMessage = await getEmailDetails(originalMessageId);
  
  const toEmail = customTo || getSenderEmail(originalMessage);
  const subject = getSubjectForReply(originalMessage);
  const replyToId = getMessageId(originalMessage);
  
  return sendEmail({
    to: toEmail,
    subject: subject,
    body: replyContent,
    replyToMessageId: replyToId,
    threadId: originalMessage.threadId,
    isHtml: false
  });
};
