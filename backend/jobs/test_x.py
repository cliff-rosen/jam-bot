from datetime import datetime
import asyncio
from agents.primary_agent import graph as primary_agent, State
from schemas.chat import Message, MessageRole
from schemas.workflow import Mission, MissionStatus
import uuid
import os
from config.settings import settings

# Use settings from config
OPENAI_API_KEY = settings.OPENAI_API_KEY
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is not set")
print(OPENAI_API_KEY)

defaultMission = Mission(
    id="default",
    name="AI Newsletter Summarization",
    description="Summarize AI news for a given date range.",
    goal="Generate a concise report of AI news for the selected date range.",
    success_criteria=["Report is accurate and covers all major AI news in the range."],
    inputs=[],
    outputs=[],
    mission_status=MissionStatus.PENDING,
    state={},
    hops=[],
    current_hop_index=0,
    metadata={},
    created_at=datetime.now().isoformat(),
    updated_at=datetime.now().isoformat()
)

async def run():
    state = State(
        messages=[Message(
            id=str(uuid.uuid4()),
            role=MessageRole.USER,
            content="What is the capital of France?",
            timestamp=datetime.now().isoformat()
        )],
        mission=defaultMission,
        next_node="supervisor_node"
    )

    async for output in primary_agent.astream(state, stream_mode="custom"):
        print(output)

if __name__ == "__main__":
    asyncio.run(run())

