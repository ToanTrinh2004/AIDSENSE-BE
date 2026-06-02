import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface SosNlpResult {
  model_text: string;   // Vietnamese-corrected text (same field name as Python)
  llm_text: string;     // Final LLM-processed text
  llm_category: string; // RESCUE | MEDICAL | HELP | ESSENTIALS | TOWING | OTHER
  llm_name: string;     // Model identifier
  model_name: string;   // Text correction model name
  llm_score: number;    // 0.0 – 1.0 urgency score
  confidence: number;   // 0.0 – 1.0 classification confidence
}

@Injectable()
export class ClaudeNlpService {
  private readonly client: Anthropic;
  private readonly logger = new Logger(ClaudeNlpService.name);
  private readonly MODEL = 'claude-haiku-4-5-20251001';

  constructor(private config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async processSos(rawText: string): Promise<SosNlpResult> {
    const prompt = `Bạn là hệ thống xử lý yêu cầu SOS khẩn cấp bằng tiếng Việt.

NHIỆM VỤ:
1. Thêm dấu tiếng Việt nếu thiếu (KHÔNG thay đổi nội dung, KHÔNG thêm/xóa từ)
2. Phân loại vào MỘT nhóm: RESCUE | MEDICAL | HELP | ESSENTIALS | TOWING | OTHER
3. Đánh giá độ khẩn cấp (llm_score) và độ tin cậy phân loại (confidence)

QUY ƯỚC llm_score:
- MEDICAL nguy cấp → ≥ 0.8
- RESCUE rõ ràng → 0.7 – 0.9
- HELP / ESSENTIALS → 0.4 – 0.6
- Mô tả mơ hồ → < 0.4

CHỈ trả về JSON hợp lệ, KHÔNG giải thích, KHÔNG markdown:
{
  "fixed_text": "...",
  "category": "...",
  "llm_score": 0.0,
  "confidence": 0.0
}

Nội dung SOS:
"""${rawText}"""`;

    try {
      const response = await this.client.messages.create({
        model: this.MODEL,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      });

      const raw =
        response.content[0].type === 'text' ? response.content[0].text : '{}';

      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const fixedText = parsed.fixed_text ?? rawText;

      // Validate word count stays the same (mirrors Python behaviour)
      const safeFixed =
        fixedText.split(/\s+/).length === rawText.split(/\s+/).length
          ? fixedText
          : rawText;

      return {
        model_text: safeFixed,      // Vietnamese-corrected text
        llm_text: safeFixed,        // Same — no separate LM Studio step needed
        llm_category: parsed.category ?? 'OTHER',
        llm_name: this.MODEL,
        model_name: 'claude-haiku-4-5-20251001',
        llm_score: parsed.llm_score ?? 0.0,
        confidence: parsed.confidence ?? 0.0,
      };
    } catch (err) {
      this.logger.error('[ClaudeNlpService] Failed to process SOS', err?.message);
      return {
        model_text: rawText,
        llm_text: rawText,
        llm_category: 'OTHER',
        llm_name: this.MODEL,
        model_name: 'claude-haiku-4-5-20251001',
        llm_score: 0.0,
        confidence: 0.0,
      };
    }
  }
}
