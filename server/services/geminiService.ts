/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import crypto from 'node:crypto';
import type { AiActionPlan, AiHistoryEntry, AiProposedAction, AppSettings } from '../../src/shared/types.ts';
import { NovaDatabase } from '../db.ts';
import { FileManagerService } from './fileManager.ts';

export class GeminiAssistantService {
  private readonly db: NovaDatabase;
  private readonly fileManager: FileManagerService;

  constructor(db: NovaDatabase, fileManager: FileManagerService) {
    this.db = db;
    this.fileManager = fileManager;
  }

  private getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return null;
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  public getStatus(settings: AppSettings): {
    configured: boolean;
    enabled: boolean;
    model: string;
    keySource: string;
  } {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
    return {
      configured: hasKey,
      enabled: settings.aiEnabled,
      model: settings.aiModel,
      keySource: hasKey ? 'Server Environment Secret (GEMINI_API_KEY)' : 'Not configured in environment secrets',
    };
  }

  public async testConnection(model: AppSettings['aiModel']): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const ai = this.getClient();
    if (!ai) {
      return {
        ok: false,
        message: 'GEMINI_API_KEY is not configured in server environment secrets.',
        latencyMs: 0,
      };
    }

    const start = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents: 'Reply with OK.',
      });
      return {
        ok: true,
        message: `Connected to ${model}: ${(response.text || 'OK').trim()}`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        ok: false,
        message: (err as Error).message || 'Gemini connection failed.',
        latencyMs: Date.now() - start,
      };
    }
  }

  public async analyzeAndPropose(prompt: string): Promise<{ plan: AiActionPlan; historyEntry: AiHistoryEntry }> {
    const settings = this.db.getSettings();
    if (!settings.aiEnabled) {
      throw new Error('AI Assistant is disabled in AI Settings.');
    }

    const ai = this.getClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY is not set in server environment secrets. Add it in Settings > Secrets.');
    }

    const inventory = settings.aiAllowFileMetadata ? await this.fileManager.scanDownloadsDirectory() : [];
    const duplicates = settings.aiAllowFileMetadata ? await this.fileManager.findDuplicates() : [];
    const downloads = this.db.getAllDownloads(false).slice(0, 60);

    const contextPayload = {
      totalFilesOnDisk: inventory.length,
      totalDiskBytes: inventory.reduce((a, b) => a + b.sizeBytes, 0),
      files: inventory.map((f) => ({
        filename: f.filename,
        relativePath: f.relativePath,
        category: f.category,
        sizeBytes: f.sizeBytes,
        extension: f.extension,
        sha256Prefix: f.sha256.slice(0, 12),
        modifiedAt: f.modifiedAt,
      })),
      duplicateGroups: duplicates.map((g) => ({
        sha256Prefix: g.sha256.slice(0, 12),
        sizeBytes: g.sizeBytes,
        paths: g.files.map((f) => f.relativePath),
      })),
      recentDownloads: downloads.map((d) => ({
        filename: d.filename,
        status: d.status,
        category: d.category,
        totalBytes: d.totalBytes,
        createdAt: d.createdAt,
      })),
    };

    const systemInstruction = `You are NovaLoad's File & Download Intelligence Assistant.
You receive ONLY sanitized file metadata (filenames, relative paths inside the NovaLoad downloads folder, sizes, extensions, SHA-256 prefixes, and duplicate groups). You never execute shell commands.
Answer the user's question accurately using only the provided metadata.
If the user asks to organize, rename, move, or clean up duplicates, generate concrete proposed file actions using relativePath values ONLY from the provided files list.
Never propose overwriting an existing file. Every modifying action will be previewed and confirmed by the user before execution.`;

    const response = await ai.models.generateContent({
      model: settings.aiModel,
      contents: `User Request: ${prompt}\n\nFile & Download Inventory Metadata:\n${JSON.stringify(contextPayload, null, 2)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'Short 1-sentence executive summary.' },
            answer: { type: Type.STRING, description: 'Detailed helpful answer grounded in the inventory metadata.' },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, description: 'One of: move, rename, delete_duplicate, create_folder' },
                  description: { type: Type.STRING, description: 'Human-readable description of the change.' },
                  sourcePath: { type: Type.STRING, description: 'Exact relativePath from inventory.' },
                  targetPath: { type: Type.STRING, description: 'Target relativePath inside downloads dir (or empty string for delete_duplicate).' },
                  reason: { type: Type.STRING, description: 'Why this action is recommended.' },
                  riskLevel: { type: Type.STRING, description: 'One of: low, medium, high' },
                },
                required: ['type', 'description', 'sourcePath', 'reason', 'riskLevel'],
              },
            },
          },
          required: ['summary', 'answer', 'actions'],
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim()) as {
      summary?: string;
      answer?: string;
      actions?: Array<{
        type: string;
        description: string;
        sourcePath: string;
        targetPath?: string;
        reason: string;
        riskLevel: string;
      }>;
    };

    const actions: AiProposedAction[] = (parsed.actions || []).map((a, idx) => ({
      id: `act_${Date.now()}_${idx}`,
      type: (['move', 'rename', 'delete_duplicate', 'create_folder'].includes(a.type)
        ? a.type
        : 'move') as AiProposedAction['type'],
      description: a.description,
      sourcePath: a.sourcePath,
      targetPath: a.targetPath || null,
      reason: a.reason,
      riskLevel: (['low', 'medium', 'high'].includes(a.riskLevel)
        ? a.riskLevel
        : 'low') as AiProposedAction['riskLevel'],
    }));

    const plan: AiActionPlan = {
      summary: parsed.summary || 'Analysis complete.',
      answer: parsed.answer || 'No additional details returned.',
      actions,
      modelUsed: settings.aiModel,
      generatedAt: new Date().toISOString(),
    };

    const historyEntry: AiHistoryEntry = {
      id: `ai_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      prompt,
      model: settings.aiModel,
      summary: plan.summary,
      answer: plan.answer,
      proposedActionsJson: JSON.stringify(plan.actions),
      executedCount: 0,
      status: 'analyzed',
      createdAt: plan.generatedAt,
    };

    this.db.addAiHistory(historyEntry);
    return { plan, historyEntry };
  }
}
