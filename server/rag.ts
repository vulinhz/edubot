/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EduBot AI – 10-Step RAG Pipeline Engine
 * 1. Receive Document -> 2. Validate Format -> 3. Extract & Normalize ->
 * 4. Sentence-Aware Chunking -> 5. Metadata Tagging -> 6. Chunk + Vector Store ->
 * 7. Hybrid Context Retrieval -> 8. Source Extraction -> 9. Grounded Prompting ->
 * 10. Citation Tracking
 */

import { Lesson, RagCitation, RagDocumentSummary, ResourceStatus, isLessonVerified } from '../src/types/index.ts';

export interface KnowledgeChunkRecord {
  id: string;
  documentId: string;
  title: string;
  grade: number;
  subjectId: string;
  sourceRef: string;
  status: ResourceStatus | string;
  chunkIndex: number;
  text: string;
  tokens: string[];
  ingestedAt: string;
}

export interface RagDocumentInput {
  documentId?: string;
  title: string;
  grade: number;
  subjectId: string;
  sourceRef: string;
  status?: ResourceStatus;
  rawText: string;
}

const VIETNAMESE_STOPWORDS = new Set([
  'và', 'của', 'là', 'các', 'cho', 'trong', 'với', 'được', 'có', 'này', 'đó',
  'một', 'những', 'khi', 'từ', 'để', 'về', 'theo', 'trên', 'dưới', 'như',
  'hay', 'hoặc', 'thì', 'mà', 'em', 'tớ', 'bạn', 'làm', 'gì', 'nào', 'sao',
  'tại', 'vì', 'nên', 'nhé', 'ạ', 'ơi', 'hãy', 'giúp', 'biết', 'học', 'bài'
]);

export function normalizeVietnameseText(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function tokenizeForRetrieval(text: string): string[] {
  const cleaned = normalizeVietnameseText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const rawWords = cleaned.split(/\s+/).filter((w) => w.length >= 2 && !VIETNAMESE_STOPWORDS.has(w));
  const bigrams: string[] = [];
  for (let i = 0; i < rawWords.length - 1; i++) {
    bigrams.push(`${rawWords[i]}_${rawWords[i + 1]}`);
  }
  return [...rawWords, ...bigrams];
}

export function chunkVietnameseText(text: string, maxChunkSize = 380, overlap = 60): string[] {
  const normalized = normalizeVietnameseText(text);
  if (!normalized) return [];
  if (normalized.length <= maxChunkSize) return [normalized];

  const paragraphs = normalized.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';

  for (const para of paragraphs) {
    if ((buffer + '\n' + para).trim().length <= maxChunkSize) {
      buffer = buffer ? `${buffer}\n${para}` : para;
      continue;
    }

    if (buffer) {
      chunks.push(buffer.trim());
      buffer = '';
    }

    if (para.length <= maxChunkSize) {
      buffer = para;
    } else {
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sentenceBuf = '';
      for (const s of sentences) {
        if ((sentenceBuf + ' ' + s).trim().length <= maxChunkSize) {
          sentenceBuf = sentenceBuf ? `${sentenceBuf} ${s}` : s;
        } else {
          if (sentenceBuf) {
            chunks.push(sentenceBuf.trim());
            const tail = sentenceBuf.slice(-overlap).trim();
            sentenceBuf = tail ? `${tail} ${s}` : s;
          } else {
            for (let i = 0; i < s.length; i += maxChunkSize - overlap) {
              chunks.push(s.slice(i, i + maxChunkSize).trim());
            }
            sentenceBuf = '';
          }
        }
      }
      if (sentenceBuf) buffer = sentenceBuf.trim();
    }
  }

  if (buffer) chunks.push(buffer.trim());
  return chunks.filter((c) => c.length > 0);
}

export class RagPipelineEngine {
  private chunks: KnowledgeChunkRecord[] = [];
  private docsMeta = new Map<string, RagDocumentSummary>();

  seedFromLessons(lessons: Lesson[]) {
    for (const lesson of lessons) {
      const docTextParts = [
        `Bài học: ${lesson.title} (${lesson.lessonCode})`,
        lesson.summary ? `Tóm tắt: ${lesson.summary}` : '',
        lesson.objectives?.length ? `Yêu cầu cần đạt: ${lesson.objectives.join('; ')}` : '',
        lesson.coreKnowledge?.length ? `Kiến thức trọng tâm: ${lesson.coreKnowledge.join('. ')}` : '',
        lesson.termsAndDefinitions?.length
          ? `Khái niệm: ${lesson.termsAndDefinitions.map((t) => `${t.term}: ${t.definition}`).join('. ')}`
          : '',
        lesson.commonMisconceptions?.length
          ? `Lỗi sai thường gặp: ${lesson.commonMisconceptions.join('; ')}`
          : '',
        ...(lesson.interactiveContent?.sections || []).map(
          (sec) => `${sec.title}: ${sec.content}${sec.example ? ` Ví dụ: ${sec.example}` : ''}`
        ),
      ].filter(Boolean);

      this.ingestDocument({
        documentId: lesson.id,
        title: lesson.title,
        grade: lesson.grade,
        subjectId: lesson.subjectId,
        sourceRef: `${lesson.officialReference.docNumber} (${lesson.officialReference.curriculumVersion})`,
        status: lesson.status,
        rawText: docTextParts.join('\n'),
      });
    }
  }

  ingestDocument(input: RagDocumentInput): { summary: RagDocumentSummary; chunksAdded: number } {
    if (!input.title || !input.rawText || input.rawText.trim().length < 10) {
      throw new Error('Tài liệu RAG phải có tiêu đề và nội dung tối thiểu 10 ký tự.');
    }
    if (input.rawText.length > 100_000) {
      throw new Error('Tài liệu vượt quá giới hạn kích thước 100KB.');
    }

    const docId = input.documentId || `rag-doc-${Date.now()}`;
    const cleanText = normalizeVietnameseText(input.rawText);
    const textChunks = chunkVietnameseText(cleanText, 380, 60);
    const status = input.status || 'DRAFT';
    const ingestedAt = new Date().toISOString();

    // Replace any previous chunks for same documentId cleanly
    this.chunks = this.chunks.filter((c) => c.documentId !== docId);

    textChunks.forEach((chunkText, idx) => {
      this.chunks.push({
        id: `${docId}-c${idx}`,
        documentId: docId,
        title: input.title.trim(),
        grade: Number(input.grade) || 4,
        subjectId: input.subjectId || 'toan',
        sourceRef: input.sourceRef.trim(),
        status,
        chunkIndex: idx,
        text: chunkText,
        tokens: tokenizeForRetrieval(`${input.title} ${chunkText}`),
        ingestedAt,
      });
    });

    const summary: RagDocumentSummary = {
      documentId: docId,
      title: input.title.trim(),
      grade: Number(input.grade) || 4,
      subjectId: input.subjectId || 'toan',
      sourceRef: input.sourceRef.trim(),
      status,
      chunkCount: textChunks.length,
      ingestedAt,
    };
    this.docsMeta.set(docId, summary);

    return { summary, chunksAdded: textChunks.length };
  }

  updateDocumentStatus(documentId: string, status: ResourceStatus) {
    for (const chunk of this.chunks) {
      if (chunk.documentId === documentId) {
        chunk.status = status;
      }
    }
    const meta = this.docsMeta.get(documentId);
    if (meta) {
      meta.status = status;
    }
  }

  listDocuments(): RagDocumentSummary[] {
    return Array.from(this.docsMeta.values());
  }

  retrieveContext(params: {
    query: string;
    grade?: number;
    subjectId?: string;
    onlyVerified?: boolean;
    preferredDocumentId?: string;
    topK?: number;
  }): { citations: RagCitation[]; contextText: string; hasSufficientContext: boolean } {
    const {
      query,
      grade,
      subjectId,
      onlyVerified = true,
      preferredDocumentId,
      topK = 4,
    } = params;

    const queryTokens = tokenizeForRetrieval(query);
    const queryTokenSet = new Set(queryTokens);

    let candidates = this.chunks;
    if (onlyVerified) {
      candidates = candidates.filter((c) => isLessonVerified(c.status as ResourceStatus));
    }

    const scored = candidates.map((chunk) => {
      let overlap = 0;
      const chunkTokenSet = new Set(chunk.tokens);
      for (const tok of queryTokenSet) {
        if (chunkTokenSet.has(tok)) {
          overlap += tok.includes('_') ? 2.2 : 1.0;
        }
      }

      const denom = Math.max(1, Math.sqrt(queryTokenSet.size * Math.max(4, chunkTokenSet.size)));
      let score = overlap / denom;

      // Boost grade/subject/lesson alignment carefully without fabricating matches
      if (grade && chunk.grade === Number(grade)) score += 0.14;
      if (subjectId && chunk.subjectId === subjectId) score += 0.12;
      if (preferredDocumentId && chunk.documentId === preferredDocumentId) score += 0.25;

      return { chunk, score };
    });

    const ranked = scored
      .filter((item) => item.score > 0.14)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const citations: RagCitation[] = ranked.map(({ chunk, score }) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      title: chunk.title,
      sourceRef: chunk.sourceRef,
      status: chunk.status,
      snippet: chunk.text.slice(0, 260),
      score: Number(score.toFixed(3)),
    }));

    const hasSufficientContext = citations.length > 0 && citations[0].score >= 0.22;

    const contextText = citations.length > 0
      ? citations
          .map(
            (c, i) =>
              `[Nguồn #${i + 1} | ${c.title} | Căn cứ: ${c.sourceRef} | Trạng thái: ${c.status}]\n${
                this.chunks.find((ch) => ch.id === c.chunkId)?.text || c.snippet
              }`
          )
          .join('\n\n')
      : 'KHÔNG TÌM THẤY TÀI LIỆU PHÙ HỢP TRONG KHO HỌC LIỆU CHUẨN.';

    return { citations, contextText, hasSufficientContext };
  }
}
