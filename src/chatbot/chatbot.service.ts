import { Inject, Injectable } from '@nestjs/common';
import { CreateChatbotDto } from './dto/create-chatbot.dto';
import { UpdateChatbotDto } from './dto/update-chatbot.dto';
import { SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';
import Redis from 'ioredis';

@Injectable()
export class ChatbotService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) { }



  async getSosCountCached() {
    const cacheKey = 'sos:count';

    // 1. Try Redis
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Cache miss → DB RPC
    const { data, error } = await this.supabase.rpc('count_sos_by_status');
    if (error) {
      throw new Error(error.message);
    }

    const stats = data[0];

    // 3. Save to Redis (5 minutes)
    await this.redis.set(
      cacheKey,
      JSON.stringify(stats),
      'EX',
      300
    );

    return stats;
  }



  async embeddingText(text: string): Promise<number[]> {
    const res = await axios.post(
      'http://localhost:1234/v1/embeddings',
      {
        model: 'text-embedding-nomic-embed-text-v1.5',
        input: text
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return res.data.data[0].embedding;
  }

  async findTopKrelatedDocuments(embedding: number[], k: number) {
    const { data, error } = await this.supabase.rpc('match_docs',
      { query_vector: embedding, match_count: k });
     
    if (error) { throw new Error(error.message); }
    return data;
  }
  async chatWithBot(message: string) {
    const query = message;

    // Get SOS stats (cached)
    const sosStats = await this.getSosCountCached();

    //  Embed
    const embedding = await this.embeddingText(query);

    //  Vector search
    const docs = await this.findTopKrelatedDocuments(embedding, 11);

    //  RAG Context
    const context = docs
      .map((d, i) => `Doc ${i + 1}: ${d.content}`)
      .join('\n\n');

    console.log('RAG Context:', context);

    //  System facts (authoritative)
    const systemFacts = `
  THÔNG TIN HỆ THỐNG HIỆN TẠI (CHÍNH XÁC):
  - Tổng SOS đang xử lý: ${sosStats.total_requests}
  - SOS đang chờ (PENDING): ${sosStats.pending_count}
  - SOS đang xử lý (IN PROGRESS): ${sosStats.inprogress_count}
  `;

    // Prompt
    const prompt = `
  Bạn là trợ lý AIDSENSE BOT.
  Bạn CHỈ được trả lời bằng tiếng Việt.
  
  QUY TẮC:
  - KHÔNG được bịa số liệu
  - CHỈ sử dụng số SOS trong THÔNG TIN HỆ THỐNG
  - Nếu không có dữ liệu → nói "Tôi chưa có thông tin này"
  
  ====================
  THÔNG TIN HỆ THỐNG:
  ${systemFacts}
  ====================
  
  CONTEXT:
  ${context}
  ====================
  
  CÂU HỎI:
  ${query}
  `;

    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512
        }
      }
    );

    return {
      answer: res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    };
  }
  


  async insertDocument(content: string) {
    const embedding = await this.embeddingText(content);
    const { data, error } = await this.supabase
      .from('docs')
      .insert([
        {
          content: content,
          vector: embedding
        }
      ])
      .select()
      .single();
    if (error) { throw new Error(error.message); }
    return data;
  }

}
