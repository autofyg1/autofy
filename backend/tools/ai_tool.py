"""
AI Processing LangChain tools with multiple LLM providers
"""
import json
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from langchain.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from langchain.schema import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.settings import settings


class AIProcessInput(BaseModel):
    """Input for AI processing tool"""
    user_id: str = Field(description="User ID for authentication")
    content: str = Field(description="Content to process with AI")
    prompt: str = Field(description="AI prompt/instruction for processing")
    provider: str = Field(default="gemini", description="LLM provider: gemini, openrouter")
    model: str = Field(default="gemini-2.0-flash", description="Specific model to use")
    temperature: float = Field(default=0.7, description="Temperature for response randomness (0.0-2.0)")
    max_tokens: int = Field(default=1000, description="Maximum tokens to generate")
    system_prompt: Optional[str] = Field(default=None, description="System prompt for context")


class AIEmbeddingInput(BaseModel):
    """Input for AI embedding tool"""
    user_id: str = Field(description="User ID for authentication")
    text: str = Field(description="Text to create embeddings for")
    provider: str = Field(default="openai", description="Embedding provider: openai, gemini")
    model: str = Field(default="text-embedding-ada-002", description="Embedding model to use")


class AIService:
    """AI service helper class"""
    
    def __init__(self):
        self.llm_cache = {}
        self.embedding_cache = {}
    
    def get_llm(self, provider: str, model: str, temperature: float = 0.7, max_tokens: int = 1000):
        """Get LLM instance based on provider"""
        cache_key = f"{provider}_{model}_{temperature}_{max_tokens}"
        
        if cache_key in self.llm_cache:
            return self.llm_cache[cache_key]
        
        llm = None
        
        if provider.lower() == "openai":
            config = settings.get_llm_config("openai")
            llm = ChatOpenAI(
                api_key=config["api_key"],
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
        
        elif provider.lower() == "anthropic":
            config = settings.get_llm_config("anthropic")
            llm = ChatAnthropic(
                api_key=config["api_key"],
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
        
        elif provider.lower() == "gemini":
            config = settings.get_llm_config("gemini")
            llm = ChatGoogleGenerativeAI(
                google_api_key=config["api_key"],
                model=model,
                temperature=temperature,
                max_output_tokens=max_tokens
            )
        
        elif provider.lower() == "openrouter":
            config = settings.get_llm_config("openrouter")
            # OpenRouter uses OpenAI-compatible interface
            llm = ChatOpenAI(
                api_key=config["api_key"],
                base_url="https://openrouter.ai/api/v1",
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                extra_headers={
                    "HTTP-Referer": settings.backend_url,
                    "X-Title": "Autofy Workflow Engine"
                }
            )
        
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
        
        self.llm_cache[cache_key] = llm
        return llm
    
    def get_embedding_model(self, provider: str, model: str):
        """Get embedding model based on provider"""
        cache_key = f"embed_{provider}_{model}"
        
        if cache_key in self.embedding_cache:
            return self.embedding_cache[cache_key]
        
        embedding_model = None
        
        if provider.lower() == "openai":
            from langchain_openai import OpenAIEmbeddings
            config = settings.get_llm_config("openai")
            embedding_model = OpenAIEmbeddings(
                api_key=config["api_key"],
                model=model
            )
        
        elif provider.lower() == "gemini":
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            config = settings.get_llm_config("gemini")
            embedding_model = GoogleGenerativeAIEmbeddings(
                google_api_key=config["api_key"],
                model=model
            )
        
        else:
            raise ValueError(f"Unsupported embedding provider: {provider}")
        
        self.embedding_cache[cache_key] = embedding_model
        return embedding_model
    
    def process_content_with_prompt(self, content: str, prompt: str, variables: Optional[Dict[str, Any]] = None) -> str:
        """Process content by replacing variables in prompt"""
        # Default variables from content
        default_vars = {
            "content": content,
            "body": content,
            "text": content
        }
        
        # Merge with provided variables
        all_vars = {**default_vars, **(variables or {})}
        
        # Replace placeholders in prompt
        processed_prompt = prompt
        for key, value in all_vars.items():
            placeholder = f"{{{{{key}}}}}"
            processed_prompt = processed_prompt.replace(placeholder, str(value))
        
        return processed_prompt
    
    def format_ai_response(self, response: Union[str, BaseMessage], provider: str, model: str, 
                          prompt: str, processing_time: float) -> Dict[str, Any]:
        """Format AI response consistently"""
        # Extract content from response
        if isinstance(response, BaseMessage):
            content = response.content
        elif hasattr(response, 'content'):
            content = response.content
        else:
            content = str(response)
        
        return {
            "success": True,
            "content": content,
            "provider": provider,
            "model": model,
            "prompt": prompt[:200] + "..." if len(prompt) > 200 else prompt,
            "processing_time_seconds": round(processing_time, 3),
            "processed_at": datetime.now().isoformat(),
            "content_length": len(content),
            "word_count": len(content.split()) if content else 0
        }


class AIProcessTool(BaseTool):
    """Tool to process content with AI using various LLM providers"""
    name: str = "ai_process"
    description: str = "Process content with AI using specified LLM provider and model"
    args_schema = AIProcessInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, content: str, prompt: str, provider: str = "openai",
             model: str = "gpt-3.5-turbo", temperature: float = 0.7, max_tokens: int = 1000,
             system_prompt: Optional[str] = None) -> str:
        """Synchronous version (not recommended for async apps)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, content: str, prompt: str, provider: str = "openai",
                    model: str = "gpt-3.5-turbo", temperature: float = 0.7, max_tokens: int = 1000,
                    system_prompt: Optional[str] = None) -> str:
        """Process content with AI"""
        start_time = datetime.now()
        
        try:
            # Create AI service
            ai_service = AIService()
            
            # Get LLM instance
            llm = ai_service.get_llm(provider, model, temperature, max_tokens)
            
            # Process prompt with content
            processed_prompt = ai_service.process_content_with_prompt(content, prompt)
            
            # Prepare messages
            messages = []
            if system_prompt:
                messages.append(SystemMessage(content=system_prompt))
            messages.append(HumanMessage(content=processed_prompt))
            
            # Generate response
            response = await llm.agenerate([messages])
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Format response
            if response.generations and len(response.generations) > 0:
                result = ai_service.format_ai_response(
                    response.generations[0][0].message,
                    provider,
                    model,
                    processed_prompt,
                    processing_time
                )
                return json.dumps(result)
            else:
                raise ValueError("No response generated from AI model")
        
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            return json.dumps({
                "success": False,
                "error": str(e),
                "provider": provider,
                "model": model,
                "processing_time_seconds": processing_time
            })


class AIEmbeddingTool(BaseTool):
    """Tool to create embeddings from text"""
    name: str = "ai_embedding"
    description: str = "Create embeddings from text using specified embedding provider"
    args_schema = AIEmbeddingInput
    
    def __init__(self):
        super().__init__()
    
    def _run(self, user_id: str, text: str, provider: str = "openai",
             model: str = "text-embedding-ada-002") -> str:
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, text: str, provider: str = "openai",
                    model: str = "text-embedding-ada-002") -> str:
        """Create embeddings from text"""
        start_time = datetime.now()
        
        try:
            # Create AI service
            ai_service = AIService()
            
            # Get embedding model
            embedding_model = ai_service.get_embedding_model(provider, model)
            
            # Generate embeddings
            embeddings = await embedding_model.aembed_documents([text])
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return json.dumps({
                "success": True,
                "embeddings": embeddings[0] if embeddings else [],
                "dimensions": len(embeddings[0]) if embeddings else 0,
                "provider": provider,
                "model": model,
                "text_length": len(text),
                "processing_time_seconds": round(processing_time, 3)
            })
        
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            return json.dumps({
                "success": False,
                "error": str(e),
                "provider": provider,
                "model": model,
                "processing_time_seconds": processing_time
            })


class AIModelListTool(BaseTool):
    """Tool to list available AI models by provider"""
    name: str = "ai_list_models"
    description: str = "List available AI models for each provider"
    
    class AIModelListInput(BaseModel):
        user_id: str = Field(description="User ID for authentication")
        provider: Optional[str] = Field(default=None, description="Specific provider to list models for")
    
    args_schema = AIModelListInput
    
    def _run(self, user_id: str, provider: Optional[str] = None) -> str:
        raise NotImplementedError("Use async version")
    
    async def _arun(self, user_id: str, provider: Optional[str] = None) -> str:
        """List available AI models"""
        try:
            models_by_provider = {
                "openai": {
                    "chat": ["gpt-4", "gpt-4-turbo-preview", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"],
                    "embedding": ["text-embedding-ada-002", "text-embedding-3-small", "text-embedding-3-large"]
                },
                "anthropic": {
                    "chat": ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"],
                    "embedding": []
                },
                "gemini": {
                    "chat": ["gemini-2.0-flash"],
                    "embedding": ["models/text-embedding-004"]
                },
                "openrouter": {
                    "chat": [
                        "meta-llama/llama-3.2-3b-instruct:free",
                        "meta-llama/llama-3.2-1b-instruct:free",
                        "microsoft/phi-3-mini-128k-instruct:free",
                        "microsoft/phi-3-medium-128k-instruct:free",
                        "mistralai/mistral-7b-instruct:free",
                        "huggingface/zephyr-7b-beta:free",
                        "openchat/openchat-7b:free"
                    ],
                    "embedding": []
                }
            }
            
            # Filter by provider if specified
            if provider:
                if provider.lower() in models_by_provider:
                    filtered_models = {provider.lower(): models_by_provider[provider.lower()]}
                else:
                    return json.dumps({
                        "success": False,
                        "error": f"Unknown provider: {provider}",
                        "available_providers": list(models_by_provider.keys())
                    })
            else:
                filtered_models = models_by_provider
            
            return json.dumps({
                "success": True,
                "models": filtered_models,
                "total_providers": len(filtered_models),
                "total_models": sum(
                    len(models["chat"]) + len(models["embedding"])
                    for models in filtered_models.values()
                )
            })
        
        except Exception as e:
            return json.dumps({
                "success": False,
                "error": str(e)
            })


# Tool instances
ai_process_tool = AIProcessTool()
ai_embedding_tool = AIEmbeddingTool()
ai_model_list_tool = AIModelListTool()

# Export all AI tools
ai_tools = [ai_process_tool, ai_embedding_tool, ai_model_list_tool]


# Additional workflow execution methods
class AIWorkflowTool:
    """AI tool for workflow execution (non-LangChain)"""
    
    def __init__(self, supabase=None):
        self.supabase = supabase  # Not used by AI tool, but for consistency
        self.logger = None
        self.service = AIService()
        try:
            import logging
            self.logger = logging.getLogger(__name__)
        except ImportError:
            pass
    
    async def process_text(self, prompt: str, model: str = "gemini-2.0-flash", api_key: str = None, 
                          content: str = "", temperature: float = 0.7, max_tokens: int = 1000) -> Dict[str, Any]:
        """Process text with AI for workflows"""
        try:
            # Determine provider from model name
            provider = "gemini"  # Default to free Gemini
            if "claude" in model.lower():
                provider = "anthropic"
            elif "gemini" in model.lower() or "bard" in model.lower():
                provider = "gemini"
            elif "llama" in model.lower() or "mistral" in model.lower() or "phi-" in model.lower() or "openchat" in model.lower() or "zephyr" in model.lower():
                provider = "openrouter"
            elif "gpt" in model.lower():
                provider = "openai"
            
            # Get LLM instance
            llm = self.service.get_llm(provider, model, temperature, max_tokens)
            
            # Prepare messages
            messages = []
            
            if content:
                # If content is provided, use it as context
                messages.append(SystemMessage(content=f"Process the following content: {content}"))
                messages.append(HumanMessage(content=prompt))
            else:
                messages.append(HumanMessage(content=prompt))
            
            # Get response
            response = await llm.ainvoke(messages)
            
            result = {
                'success': True,
                'response': response.content,
                'model': model,
                'provider': provider,
                'tokens_used': getattr(response, 'usage', {}).get('total_tokens', 0)
            }
            
            if self.logger:
                self.logger.info(f"AI processing completed: {model} - {len(response.content)} chars")
            
            return result
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"Error processing text with AI: {e}")
            return {'success': False, 'error': str(e)}
    
    async def summarize_text(self, text: str, model: str = "gemini-2.0-flash", api_key: str = None) -> Dict[str, Any]:
        """Summarize text for workflows"""
        prompt = f"Please provide a clear and concise summary of the following text:\n\n{text}"
        return await self.process_text(prompt, model, api_key)
    
    async def extract_keywords(self, text: str, model: str = "gemini-2.0-flash", api_key: str = None) -> Dict[str, Any]:
        """Extract keywords from text for workflows"""
        prompt = f"Extract the key words and phrases from the following text. Return them as a comma-separated list:\n\n{text}"
        return await self.process_text(prompt, model, api_key)
    
    async def classify_text(self, text: str, categories: List[str], model: str = "gemini-2.0-flash", api_key: str = None) -> Dict[str, Any]:
        """Classify text into categories for workflows"""
        categories_str = ", ".join(categories)
        prompt = f"Classify the following text into one of these categories: {categories_str}\n\nText: {text}\n\nReturn only the category name."
        return await self.process_text(prompt, model, api_key)


# Workflow tool instance
ai_workflow_tool = AIWorkflowTool()
