import asyncio
from services.email_service import EmailService
from database import get_db
import base64
from bs4 import BeautifulSoup



email_service = EmailService()  
db = next(get_db())

async def main():
    if not await email_service.authenticate(1, db):
        raise Exception("Failed to authenticate with Gmail API")

    result = await email_service.get_message(
        "195c93f8d9dc9551"
    )

    body_decoded = result["body"]

    print(body_decoded)

if __name__ == "__main__":
    asyncio.run(main())

