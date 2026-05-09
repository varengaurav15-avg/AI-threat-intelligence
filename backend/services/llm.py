from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
import os, json

load_dotenv()

# Lazy initialization - only create LLM when needed
_llm = None
def get_llm():
    global _llm
    if _llm is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None
        _llm = ChatOpenAI(model="gpt-4o", temperature=0.2, api_key=api_key)
    return _llm

def load_prompt(name: str) -> str:
    path = os.path.join(os.path.dirname(__file__), f"../prompts/{name}.txt")
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        return f"Analyze the following data and provide a summary: {{raw_data}}"

async def summarize_threat(raw_data: str) -> str:
    try:
        llm = get_llm()
        if llm is None:
            return "AI summary unavailable: No OpenAI API key configured"
        chain  = PromptTemplate.from_template(load_prompt("summarizer")) | llm
        result = await chain.ainvoke({"raw_data": raw_data[:3000]})
        return result.content
    except Exception as e:
        return f"AI summary unavailable: {str(e)}"

async def get_ai_verdict(sandbox_report: str) -> dict:
    try:
        llm = get_llm()
        if llm is None:
            return {"verdict": "UNKNOWN", "explanation": "No OpenAI API key configured"}
        chain  = PromptTemplate.from_template(load_prompt("verdict")) | llm
        result = await chain.ainvoke({"sandbox_report": sandbox_report[:3000]})
        lines  = result.content.strip().split("\n")
        return {
            "verdict":     lines[0].strip().upper(),
            "explanation": lines[1].strip() if len(lines) > 1 else ""
        }
    except Exception as e:
        return {"verdict": "UNKNOWN", "explanation": str(e)}

async def generate_morning_brief(threats: list) -> str:
    try:
        llm = get_llm()
        if llm is None:
            return "Brief generation unavailable: No OpenAI API key configured"
        chain  = PromptTemplate.from_template(load_prompt("brief")) | llm
        result = await chain.ainvoke({"threats_json": json.dumps(threats[:20])})
        return result.content
    except Exception as e:
        return f"Brief generation failed: {str(e)}"