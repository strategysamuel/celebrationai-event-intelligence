/**
 * CelebrationAI - Event Intelligence Copilot
 * Backend Express Server & API Gateway
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  handleCopilotChat,
  handleGeneratePlan,
  handleRiskMitigation,
  handleCelebrationIntelligence,
  handleVendorNegotiationCopilot,
  handleOperationsCopilot,
  ChatRequestSchema,
  GeneratePlanRequestSchema,
  CelebrationIntelligenceRequestSchema,
  ReplanningRequestSchema,
  RiskMitigationRequestSchema,
  VendorNegotiationRequestSchema,
  OperationsRequestSchema,
  getGeminiModelName,
  getGeminiFallbackModelName,
} from './server/geminiService';
import { generateDynamicReplanning } from './src/domain/replanningEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Security and request size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Bounded, expiring in-memory rate limiter for /api/* endpoints
const rateLimitWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 60;
const maxTrackedIps = 10000;
const ipRequestHistory = new Map<string, number[]>();

// Periodic cleanup interval to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequestHistory.entries()) {
    const recent = timestamps.filter((t) => now - t < rateLimitWindowMs);
    if (recent.length === 0) {
      ipRequestHistory.delete(ip);
    } else {
      ipRequestHistory.set(ip, recent);
    }
  }
  if (ipRequestHistory.size > maxTrackedIps) {
    const keysToRemove = Array.from(ipRequestHistory.keys()).slice(0, ipRequestHistory.size - maxTrackedIps);
    keysToRemove.forEach((k) => ipRequestHistory.delete(k));
  }
}, 5 * 60 * 1000);

app.use('/api', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const timestamps = ipRequestHistory.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < rateLimitWindowMs);

  if (recent.length >= maxRequestsPerWindow) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before sending more AI planning queries.',
    });
  }

  recent.push(now);
  ipRequestHistory.set(ip, recent);
  next();
});

// Health & Environment Diagnostics Endpoint (Restricted to non-sensitive diagnostic info)
app.get('/api/health', (req: Request, res: Response) => {
  const apiKeyConfigured = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );

  res.json({
    status: 'healthy',
    application: 'CelebrationAI – Event Intelligence Copilot',
    release: 'CAI-006.1',
    geminiModel: getGeminiModelName(),
    geminiFallbackModel: getGeminiFallbackModelName(),
    apiKeyConfigured,
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Conversational AI Copilot Chat Endpoint
app.post('/api/copilot/chat', async (req: Request, res: Response) => {
  try {
    const parseResult = ChatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request structure',
        details: parseResult.error.flatten(),
      });
    }

    const { messages, currentEvent } = parseResult.data;
    const response = await handleCopilotChat(messages, currentEvent);
    res.json(response);
  } catch (error: any) {
    console.error('API /copilot/chat error:', error?.message || 'Unknown error');
    res.status(500).json({
      error: 'An internal error occurred while processing the planning request.',
    });
  }
});

// Full Structured Event Plan Generation
app.post('/api/copilot/generate-plan', async (req: Request, res: Response) => {
  try {
    const parseResult = GeneratePlanRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid plan generation parameters',
        details: parseResult.error.flatten(),
      });
    }

    const plan = await handleGeneratePlan(parseResult.data);
    res.json(plan);
  } catch (error: any) {
    console.error('API /copilot/generate-plan error:', error?.message || 'Unknown error');
    res.status(500).json({
      error: 'Failed to generate event plan. Please check inputs and try again.',
    });
  }
});

// Dynamic Intelligent Replanning
app.post('/api/copilot/replan', async (req: Request, res: Response) => {
  try {
    const parseResult = ReplanningRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid replanning parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { currentPlan, request } = parseResult.data;
    const impact = generateDynamicReplanning(currentPlan as any, request as any);
    res.json(impact);
  } catch (error: any) {
    console.error('API /copilot/replan error:', error?.message || 'Unknown error');
    res.status(500).json({
      error: 'Replanning engine failed to process the change request.',
    });
  }
});

// AI Risk Mitigation Briefing
app.post('/api/copilot/risk-mitigation', async (req: Request, res: Response) => {
  try {
    const parseResult = RiskMitigationRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid risk mitigation parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { risk, planContext } = parseResult.data;
    const strategy = await handleRiskMitigation(
      risk as any,
      planContext || { name: 'Event', type: 'General', budget: 1000000, currency: 'INR' }
    );
    res.json(strategy);
  } catch (error: any) {
    console.error('API /copilot/risk-mitigation error:', error?.message || 'Unknown error');
    res.status(500).json({
      error: 'Failed to generate mitigation strategy.',
    });
  }
});

// Celebration Intelligence Analysis (CAI-003)
app.post('/api/copilot/celebration-intelligence', async (req: Request, res: Response) => {
  try {
    const parseResult = CelebrationIntelligenceRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid celebration intelligence request parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { currentPlan, request } = parseResult.data;
    const report = await handleCelebrationIntelligence(currentPlan, request);
    res.json(report);
  } catch (error: any) {
    console.error('API /copilot/celebration-intelligence error:', error?.message || 'Unknown error');
    res.status(500).json({
      error: 'Celebration Intelligence Engine encountered an unexpected calculation error.',
    });
  }
});

// Vendor Procurement Negotiation Copilot (CAI-004)
app.post('/api/copilot/vendor-negotiation', async (req: Request, res: Response) => {
  try {
    const parseResult = VendorNegotiationRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid vendor negotiation parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { quotation, allocatedBudget } = parseResult.data;
    const insight = await handleVendorNegotiationCopilot(quotation as any, allocatedBudget || 450000);
    res.json(insight);
  } catch (error: any) {
    console.error('API /copilot/vendor-negotiation error:', error?.message || 'Unknown error');
    res.status(500).json({
      error: 'Vendor Negotiation Copilot failed to process quotation data.',
    });
  }
});

// Event Operations Copilot (CAI-005)
app.post('/api/copilot/operations', async (req: Request, res: Response) => {
  try {
    const parseResult = OperationsRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid operations parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { event } = parseResult.data;
    const insight = await handleOperationsCopilot(event as any);
    res.json(insight);
  } catch (error: any) {
    console.error('API /copilot/operations error:', error?.message || 'Unknown error');
    res.status(500).json({
      error: 'Event Operations Copilot failed to process operations analysis.',
    });
  }
});

// Vite Integration: Dev vs Production Mode
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CelebrationAI server running on http://0.0.0.0:${PORT} [${isProduction ? 'PROD' : 'DEV'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err?.message || 'Unknown error');
  process.exit(1);
});
