import type { NextApiRequest, NextApiResponse } from 'next';
import { buildLocalAnswer } from '@/utils/ai/prompt';

interface AnalyzeBody {
  question: string;
  selectionHash: string;
  context: {
    total: number;
    projetos: { nome: string; total: number }[];
    topScouters: { nome: string; total: number }[];
    center?: { lat: number; lng: number };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const started = Date.now();
  try {
    const body = req.body as AnalyzeBody;
    if (!body?.question || typeof body.question !== 'string') return res.status(400).json({ error: 'Pergunta inválida' });
    if (!body?.context || typeof body.context.total !== 'number') return res.status(400).json({ error: 'Contexto inválido' });

    const question = body.question.trim().slice(0, 300);
    const answer = buildLocalAnswer(question, body.context);

    return res.status(200).json({
      answer,
      model: 'local-fallback',
      tookMs: Date.now() - started,
      selectionHash: body.selectionHash
    });
  } catch (e: any) {
    console.error('[AI][analyze] error', e);
    return res.status(500).json({ error: 'Falha ao processar análise' });
  }
}