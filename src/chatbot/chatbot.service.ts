import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
      'https://api.voyageai.com/v1/embeddings',
      {
        model: 'voyage-4',
        input: [text],
        input_type: 'document'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`
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

    //  System prompt (authoritative rules + live stats)
    const systemPrompt = `Bạn là trợ lý AIDSENSE BOT.
Bạn CHỈ được trả lời bằng tiếng Việt.

QUY TẮC:
- KHÔNG được bịa số liệu
- CHỈ sử dụng số SOS trong THÔNG TIN HỆ THỐNG
- Nếu không có dữ liệu → nói "Tôi chưa có thông tin này"

====================
THÔNG TIN HỆ THỐNG:
${systemFacts}
====================`;

    //  User message with RAG context injected
    const userMessage = `CONTEXT:
${context}
====================

CÂU HỎI:
${query}`;

    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      answer: res.data?.content?.[0]?.text ?? ''
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
  async getChatHistory(sosId: string, user: any, page: number = 1, limit: number = 20) {
    const { data: sos } = await this.supabase
      .from('sos_request')
      .select('userid, teamId')
      .eq('id', sosId)
      .single();
  
    if (!sos) throw new BadRequestException('Không tìm thấy SOS');
  
    let isAuthorized = sos.userid === user.id;
    if (!isAuthorized && sos.teamId) {
      const { data: team } = await this.supabase
        .from('team_rescue')
        .select('leader_id')
        .eq('id', sos.teamId)
        .single();
      isAuthorized = team?.leader_id === user.id;
    }
  
    if (!isAuthorized) throw new BadRequestException('Không có quyền xem đoạn chat này');
  
    const from = (page - 1) * limit;
    const to = from + limit - 1;
  
    const { data, error, count } = await this.supabase
      .from('chat_messages')
      .select('*', { count: 'exact' })
      .eq('sos_id', sosId)
      .order('created_at', { ascending: false }) // mới nhất trước
      .range(from, to);
  
    if (error) throw new BadRequestException(error.message);
  
    return {
      data,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    };
  }
  
}