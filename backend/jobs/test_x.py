from datetime import datetime
import asyncio
from agents.primary_agent import graph as primary_agent, State
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission, MissionStatus
import uuid
import os
from config.settings import settings
from schemas.tools import get_available_tools

# Use settings from config
OPENAI_API_KEY = settings.OPENAI_API_KEY
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is not set")
print(OPENAI_API_KEY)


async def run():
    print("Running test_x.py")
    print(get_available_tools())

if __name__ == "__main__":
    asyncio.run(run())

