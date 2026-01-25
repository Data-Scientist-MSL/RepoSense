import sys
import asyncio
import os
import json
import base64
from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama

async def main():
    if len(sys.argv) < 5:
        print(json.dumps({"type": "error", "message": "Usage: python agent_test_bridge.py <provider> <model> <url> <task>"}))
        return

    provider = sys.argv[1]
    model_name = sys.argv[2]
    base_url = sys.argv[3]
    task_desc = sys.argv[4]

    # Helper to send structured data to TS service
    def send_event(event_type, data):
        print(f"EVENT_JSON:{json.dumps({'type': event_type, 'data': data})}")
        sys.stdout.flush()

    llm = None
    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            send_event("error", "OPENAI_API_KEY environment variable not set")
            return
        llm = ChatOpenAI(model=model_name, api_key=api_key)
    elif provider == "ollama":
        llm = ChatOllama(model=model_name, base_url="http://localhost:11434")
    else:
        send_event("error", f"Unsupported provider: {provider}")
        return

    # Configure browser to allow screenshots and vision
    browser = Browser(config=BrowserConfig(headless=True))
    
    full_task = f"Go to {base_url}. {task_desc}. At each step, describe what you are doing. Verify if the test goal is met."

    agent = Agent(
        task=full_task,
        llm=llm,
        browser=browser,
        use_vision=True
    )
    
    send_event("info", f"Agent starting with {provider}/{model_name}")
    
    try:
        # Run agent and capture history
        history = await agent.run()
        
        # Process history for the UI
        for i, step in enumerate(history.steps):
            step_data = {
                "stepNumber": i + 1,
                "goal": step.state.interacted_element.text if step.state.interacted_element else "Thinking...",
                "action": str(step.action),
                "thinking": step.state.thought if step.state else "",
                "result": "success" if not step.action_error else "failed",
                "details": step.action_error if step.action_error else ""
            }
            
            # If we have a screenshot, include it (base64)
            if step.state and step.state.screenshot:
                step_data["screenshot"] = step.state.screenshot
            
            send_event("step", step_data)

        send_event("completed", {"summary": str(history.final_result())})
        
    except Exception as e:
        send_event("error", f"Agent execution failed: {str(e)}")
        sys.exit(1)
    finally:
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
