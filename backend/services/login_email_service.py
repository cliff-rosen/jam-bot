"""
Login Email Service

Service for sending login tokens via email.
Uses SMTP for sending emails.
"""

import smtplib
import secrets
from datetime import datetime, timedelta
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from typing import Optional
import logging

from config.settings import settings

logger = logging.getLogger(__name__)


class LoginEmailService:
    """Service for sending login token emails"""
    
    def __init__(self):
        # For now, use simple SMTP. In production, you'd use a service like SendGrid
        self.smtp_server = getattr(settings, 'SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_username = getattr(settings, 'SMTP_USERNAME', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@jambot.com')
        self.app_name = getattr(settings, 'APP_NAME', 'JamBot')
        self.frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    
    def generate_login_token(self) -> tuple[str, datetime]:
        """
        Generate a secure login token and expiration time.
        
        Returns:
            tuple: (token, expiration_datetime)
        """
        # Generate a secure random token
        token = secrets.token_urlsafe(32)
        
        # Set expiration to 30 minutes from now
        expires_at = datetime.utcnow() + timedelta(minutes=30)
        
        return token, expires_at
    
    def _create_login_email(self, email: str, token: str) -> MimeMultipart:
        """
        Create the login email with token link.
        
        Args:
            email: User's email address
            token: Login token
            
        Returns:
            MimeMultipart: Email message
        """
        # Create login URL
        login_url = f"{self.frontend_url}/auth/token-login?token={token}"
        
        # Create email
        msg = MimeMultipart('alternative')
        msg['Subject'] = f"{self.app_name} - One-Click Login"
        msg['From'] = self.from_email
        msg['To'] = email
        
        # Create HTML and text versions
        text_content = f"""
        Hello!
        
        You requested a one-click login for {self.app_name}.
        
        Click the link below to log in (expires in 30 minutes):
        {login_url}
        
        If you didn't request this login, you can safely ignore this email.
        
        Best regards,
        The {self.app_name} Team
        """
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">One-Click Login</h2>
                    
                    <p>Hello!</p>
                    
                    <p>You requested a one-click login for <strong>{self.app_name}</strong>.</p>
                    
                    <div style="margin: 30px 0;">
                        <a href="{login_url}" 
                           style="background-color: #2563eb; 
                                  color: white; 
                                  padding: 12px 24px; 
                                  text-decoration: none; 
                                  border-radius: 5px; 
                                  display: inline-block;
                                  font-weight: bold;">
                            Log In to {self.app_name}
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        This link expires in 30 minutes.
                    </p>
                    
                    <p style="color: #666; font-size: 14px;">
                        If you didn't request this login, you can safely ignore this email.
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    
                    <p style="color: #999; font-size: 12px;">
                        Best regards,<br>
                        The {self.app_name} Team
                    </p>
                </div>
            </body>
        </html>
        """
        
        # Attach parts
        text_part = MimeText(text_content, 'plain')
        html_part = MimeText(html_content, 'html')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        return msg
    
    async def send_login_token(self, email: str, token: str) -> bool:
        """
        Send login token email to user.
        
        Args:
            email: User's email address
            token: Login token
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Create email message
            msg = self._create_login_email(email, token)
            
            # For development, just log the token instead of sending email
            if not self.smtp_username or not self.smtp_password:
                logger.info(f"DEV MODE: Login token for {email}: {token}")
                logger.info(f"DEV MODE: Login URL: {self.frontend_url}/auth/token-login?token={token}")
                return True
            
            # Send email via SMTP
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                
                text = msg.as_string()
                server.sendmail(self.from_email, email, text)
                
            logger.info(f"Login token email sent successfully to {email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send login token email to {email}: {str(e)}")
            return False