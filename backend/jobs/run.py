import asyncio
from langchain_core.prompts import ChatPromptTemplate

from config.settings import settings


# Use settings from config
OPENAI_API_KEY = settings.OPENAI_API_KEY
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is not set")
print(OPENAI_API_KEY)


async def run():
    print("Running...")

    prompt_template = ChatPromptTemplate([
        ("system", "You are a helpful assistant that can answer questions."),
        ("user", "{message}")
    ])

    result = prompt_template.invoke({"message": "What is the capital of France?"})

    prompt_template.pretty_print()

    print("Done")

if __name__ == "__main__":
    asyncio.run(run())

