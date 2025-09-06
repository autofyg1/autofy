"""
Gmail LangChain tools for email operations
"""
import json
import base64
from typing import Dict, List, Optional, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from langchain.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.database import get_supabase
from config.settings import settings


class GmailFetchInput(BaseModel):
    """Input for Gmail fetch tool"""
    user_id: str = Field(description="User ID for authentication")
    query: str = Field(default="is:unread", description="Gmail search query")
    max_results: int = Field(default=10, description="Maximum number of emails to fetch")
    keywords: Optional[List[str]] = Field(default=None, description="Keywords to filter emails")
    from_email: Optional[str] = Field(default=None, description="Filter by sender email")


class GmailSendInput(BaseModel):
    """Input for Gmail send tool"""
    user_id: str = Field(description="User ID for authentication")
    to_email: str = Field(description="Recipient email address")
    subject: str = Field(description="Email subject")
    body: str = Field(description="Email body content")
    is_html: bool = Field(default=False, description="Whether body is HTML")


class GmailReplyInput(BaseModel):
    """Input for Gmail reply tool"""
    user_id: str = Field(description="User ID for authentication")
    message_id: str = Field(description="Original message ID to reply to")
    thread_id: str = Field(description="Thread ID for proper threading")
    body: str = Field(description="Reply body content")
    is_html: bool = Field(default=False, description="Whether body is HTML")
    custom_to_email: Optional[str] = Field(default=None, description="Custom recipient (overrides original sender)")


class GmailService:
    """Gmail service helper class"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def get_gmail_credentials(self, user_id: str) -> Credentials:
        """Get and refresh Gmail credentials for user"""
        # Get integration from database
        result = self.supabase.table("integrations").select("*").eq("user_id", user_id).eq("service_name", "gmail").single().execute()
        
        if not result.data:
            raise ValueError("Gmail integration not found for user")
        
        integration = result.data
        creds_data = integration["credentials"]
        
        # Create credentials object
        creds = Credentials(
            token=creds_data.get("access_token"),
            refresh_token=creds_data.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
            scopes=["https://www.googleapis.com/auth/gmail.modify"]
        )
        
        # Refresh if needed
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                
                # Update database with new token
                updated_creds = {
                    **creds_data,
                    "access_token": creds.token,
                    "expires_at": creds.expiry.isoformat() if creds.expiry else None
                }
                
                self.supabase.table("integrations").update(
                    {"credentials": updated_creds}
                ).eq("id", integration["id"]).execute()
                
            except RefreshError:
                raise ValueError("Gmail authentication expired. Please reconnect Gmail integration.")
        
        return creds
    
    def build_query(self, base_query: str, keywords: Optional[List[str]], from_email: Optional[str]) -> str:
        """Build Gmail search query with filters"""
        query = base_query
        
        if keywords:
            keyword_query = " OR ".join(f'"{keyword}"' for keyword in keywords)
            query += f" AND ({keyword_query})"
        
        if from_email:
            query += f" AND from:{from_email}"
        
        return query
    
    def parse_email_message(self, raw_message: Dict) -> Dict[str, Any]:
        """Parse Gmail API message into standard format"""
        headers = raw_message.get("payload", {}).get("headers", [])
        
        # Extract headers
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "No Subject")
        from_header = next((h["value"] for h in headers if h["name"] == "From"), "")
        
        # Extract sender email from "Name <email>" format
        import re
        email_match = re.search(r'<([^>]+)>', from_header)
        sender = email_match.group(1) if email_match else from_header
        
        # Extract body
        body = self.extract_email_body(raw_message.get("payload", {}))
        
        # Parse timestamp
        from datetime import datetime
        timestamp = datetime.fromtimestamp(int(raw_message["internalDate"]) / 1000) if raw_message.get("internalDate") else datetime.now()
        
        return {
            "id": raw_message["id"],
            "thread_id": raw_message.get("threadId"),
            "subject": subject,
            "sender": sender,
            "body": body,
            "timestamp": timestamp.isoformat(),
            "raw_message": raw_message
        }
    
    def extract_email_body(self, payload: Dict) -> str:
        """Extract email body from payload"""
        if payload.get("body", {}).get("data"):
            return self.decode_base64_url(payload["body"]["data"])
        
        if payload.get("parts"):
            for part in payload["parts"]:
                if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
                    return self.decode_base64_url(part["body"]["data"])
                elif part.get("mimeType") == "text/html" and part.get("body", {}).get("data"):
                    html_content = self.decode_base64_url(part["body"]["data"])
                    return self.strip_html_tags(html_content)
        
        return payload.get("snippet", "")
    
    def decode_base64_url(self, data: str) -> str:
        """Decode base64url encoded data"""
        try:
            # Convert base64url to base64
            data = data.replace('-', '+').replace('_', '/')
            # Add padding if needed
            data += '=' * (4 - len(data) % 4) % 4
            return base64.b64decode(data).decode('utf-8', errors='ignore')
        except Exception:
            return ""
    
    def strip_html_tags(self, html: str) -> str:
        """Strip HTML tags from content"""
        import re
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html).strip()


class GmailFetchTool(BaseTool):
    """Tool to fetch emails from Gmail"""
    name: str = "gmail_fetch"
    description: str = "Fetch emails from Gmail with optional filters"
    args_schema = GmailFetchInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, query: str = "is:unread", max_results: int = 10, 
             keywords: Optional[List[str]] = None, from_email: Optional[str] = None) -> str:
        """Synchronous version (not recommended for async apps)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, query: str = "is:unread", max_results: int = 10,
                    keywords: Optional[List[str]] = None, from_email: Optional[str] = None) -> str:
        """Fetch emails from Gmail"""
        try:
            # Create Gmail service
            gmail_service = GmailService()
            
            # Get credentials
            creds = await gmail_service.get_gmail_credentials(user_id)
            
            # Build Gmail service
            service = build('gmail', 'v1', credentials=creds)
            
            # Build search query
            search_query = gmail_service.build_query(query, keywords, from_email)
            
            # List messages
            results = service.users().messages().list(userId='me', q=search_query, maxResults=max_results).execute()
            messages = results.get('messages', [])
            
            if not messages:
                return json.dumps({"emails": [], "count": 0, "message": "No emails found"})
            
            # Fetch message details
            emails = []
            for msg in messages[:max_results]:  # Limit to prevent too many API calls
                try:
                    message = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
                    parsed_email = gmail_service.parse_email_message(message)
                    emails.append(parsed_email)
                except HttpError as e:
                    print(f"Error fetching email {msg['id']}: {e}")
                    continue
            
            return json.dumps({
                "emails": emails,
                "count": len(emails),
                "query_used": search_query
            })
        
        except Exception as e:
            return json.dumps({"error": str(e), "emails": [], "count": 0})


class GmailSendTool(BaseTool):
    """Tool to send emails via Gmail"""
    name: str = "gmail_send"
    description: str = "Send an email via Gmail"
    args_schema = GmailSendInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, to_email: str, subject: str, body: str, is_html: bool = False) -> str:
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, to_email: str, subject: str, body: str, is_html: bool = False) -> str:
        """Send email via Gmail"""
        try:
            # Create Gmail service
            gmail_service = GmailService()
            
            # Get credentials
            creds = await gmail_service.get_gmail_credentials(user_id)
            
            # Build Gmail service
            service = build('gmail', 'v1', credentials=creds)
            
            # Create message
            if is_html:
                message = MIMEMultipart('alternative')
                html_part = MIMEText(body, 'html')
                message.attach(html_part)
            else:
                message = MIMEText(body)
            
            message['to'] = to_email
            message['subject'] = subject
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Send message
            result = service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            return json.dumps({
                "success": True,
                "message_id": result["id"],
                "thread_id": result.get("threadId"),
                "to": to_email
            })
        
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


class GmailReplyTool(BaseTool):
    """Tool to reply to emails via Gmail"""
    name: str = "gmail_reply"
    description: str = "Reply to an email via Gmail"
    args_schema = GmailReplyInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, message_id: str, thread_id: str, body: str, 
             is_html: bool = False, custom_to_email: Optional[str] = None) -> str:
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, message_id: str, thread_id: str, body: str,
                    is_html: bool = False, custom_to_email: Optional[str] = None) -> str:
        """Reply to email via Gmail"""
        try:
            # Create Gmail service
            gmail_service = GmailService()
            
            # Get credentials
            creds = await gmail_service.get_gmail_credentials(user_id)
            
            # Build Gmail service
            service = build('gmail', 'v1', credentials=creds)
            
            # Get original message to extract details
            original_message = service.users().messages().get(
                userId='me', id=message_id, format='full'
            ).execute()
            
            # Parse original message
            parsed_original = gmail_service.parse_email_message(original_message)
            
            # Determine reply recipient and subject
            to_email = custom_to_email or parsed_original["sender"]
            reply_subject = parsed_original["subject"]
            if not reply_subject.lower().startswith("re:"):
                reply_subject = f"Re: {reply_subject}"
            
            # Create reply message
            if is_html:
                message = MIMEMultipart('alternative')
                html_part = MIMEText(body, 'html')
                message.attach(html_part)
            else:
                message = MIMEText(body)
            
            message['to'] = to_email
            message['subject'] = reply_subject
            message['In-Reply-To'] = f"<{message_id}>"
            message['References'] = f"<{message_id}>"
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            
            # Send reply
            result = service.users().messages().send(
                userId='me',
                body={
                    'raw': raw_message,
                    'threadId': thread_id
                }
            ).execute()
            
            return json.dumps({
                "success": True,
                "message_id": result["id"],
                "thread_id": result["threadId"],
                "to": to_email,
                "is_reply": True
            })
        
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


# Tool instances
gmail_fetch_tool = GmailFetchTool()
gmail_send_tool = GmailSendTool()
gmail_reply_tool = GmailReplyTool()

# Export all Gmail tools
gmail_tools = [gmail_fetch_tool, gmail_send_tool, gmail_reply_tool]
