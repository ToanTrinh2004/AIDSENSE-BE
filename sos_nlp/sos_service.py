import json
import os
import re
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import torch
import requests
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL")
LM_MODEL = os.getenv("LM_MODEL")
PORT = int(os.getenv("NLP_PORT", 8001))

torch.set_num_threads(2)

app = FastAPI(title="SOS NLP Service")


# Load Vietnamese text correction model

corrector = pipeline(
    "text2text-generation",
    model="bmd1905/vietnamese-correction-v2",
    device=-1
)

class TextRequest(BaseModel):
    text: str

def extract_json(text: str) -> str:
    text = text.strip()
    
    # Try to find JSON object between curly braces
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    
    return text

def normalize_and_classify_sos(raw_text: str) -> dict:
    """
    - Thêm dấu tiếng Việt (không đổi nội dung)
    - Phân loại SOS
    - Trả về raw + fixed + category + confidence + llm_score
    """

    if not LM_STUDIO_URL or not LM_MODEL:
        return {
            "raw_text": raw_text,
            "fixed_text": raw_text,
            "category": "Không xác định",
            "confidence": 0.0,
            "llm_score": 0.0
        }

    prompt = f"""
    Bạn là hệ thống xử lý yêu cầu SOS.

    NHIỆM VỤ 1 – THÊM DẤU:
    - Thêm dấu tiếng Việt cho câu
    - KHÔNG thay đổi nội dung
    - KHÔNG thêm, xóa hoặc đảo từ
    - Chỉ thêm dấu nếu cần

    NHIỆM VỤ 2 – PHÂN LOẠI:
    Chọn MỘT nhóm phù hợp nhất:
    - RESCUE
    - MEDICAL
    - HELP
    - ESSENTIALS
    - OTHER
    - TOWING

    NHIỆM VỤ 3 – ĐÁNH GIÁ ĐỘ TIN CẬY:
    - Trả về mức độ tự tin của bạn khi phân loại
    - Giá trị từ 0.0 đến 1.0
    - 1.0 = cực kỳ chắc chắn
    - 0.0 = không chắc chắn

    CHỈ trả về JSON, KHÔNG giải thích:
    {{
    "fixed_text": "...",
    "category": "...",
    "confidence": 0.0,
    "llm_score": 0.0
    }}

    QUY ƯỚC llm_score:
    - MEDICAL nguy cấp → ≥ 0.8
    - RESCUE rõ ràng → 0.7 – 0.9
    - HELP / ESSENTIALS → 0.4 – 0.6
    - Mô tả mơ hồ → < 0.4

    Nội dung SOS:
    \"\"\"{raw_text}\"\"\"
    """

    payload = {
        "model": LM_MODEL,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0,
        "max_tokens": 256
    }

    try:
        res = requests.post(
            LM_STUDIO_URL,
            json=payload,
            timeout=15
        )
        res.raise_for_status()

        content = res.json()["choices"][0]["message"]["content"].strip()
        content = extract_json(content)
        data = json.loads(content)
        print("LM Studio response:", data)

        fixed_text = data.get("fixed_text", raw_text)
        category = data.get("category", "Không xác định")
        confidence = data.get("confidence", 0.0)
        llm_score = data.get("llm_score", 0.0)

        # Validate fixed_text has same word count
        if len(fixed_text.split()) != len(raw_text.split()):
            fixed_text = raw_text

        return {
            "raw_text": raw_text,
            "fixed_text": fixed_text,
            "category": category,
            "confidence": confidence,
            "llm_score": llm_score
        }

    except Exception as e:
        print(f"Error in normalize_and_classify_sos: {e}")
        return {
            "raw_text": raw_text,
            "fixed_text": raw_text,
            "category": "Không xác định",
            "confidence": 0.0,
            "llm_score": 0.0
        }


@app.post("/process-sos")
def process_sos(req: TextRequest):
    raw_text = req.text
    model_text = corrector(
        raw_text,
        max_length=256
    )[0]["generated_text"]

    llm_result = normalize_and_classify_sos(model_text)

    return {
        "model_text": model_text,
        "llm_text": llm_result["fixed_text"],
        "llm_category": llm_result["category"],
        "llm_name": LM_MODEL,
        "model_name": "bmd1905/vietnamese-correction-v2",
        "llm_score": llm_result["llm_score"],
        "confidence": llm_result["confidence"]
    }


if __name__ == "__main__":
    uvicorn.run(
        "sos_service:app",
        host="127.0.0.1",
        port=PORT,
        reload=False
    )
