// @ts-nocheck
/**
 * WEBSOCKET BROADCASTER
 * Manages real-time updates for valuations, market data, and training progress
 */

import type { ValuationResult } from '@/lib/db/schema';

// In-memory subscriber management
const subscribers = new Map<string, Set<string>>();
const brokers = new Map<string, any>();

export type BroadcastEvent = 'valuation_complete' | 'market_update' | 'training_progress' | 'error';

interface BroadcastMessage<T = any> {
  type: BroadcastEvent;
  timestamp: Date;
  data: T;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * SUBSCRIBE TO BROADCAST CHANNEL
 * In production: Use Vercel KV, Redis, or Socket.io
 */
export function subscribeToChannel(channelId: string, clientId: string) {
  if (!subscribers.has(channelId)) {
    subscribers.set(channelId, new Set());
  }
  subscribers.get(channelId)!.add(clientId);

  console.log(`[WebSocket] Client ${clientId} subscribed to ${channelId}`);

  return () => {
    subscribers.get(channelId)?.delete(clientId);
    if (subscribers.get(channelId)?.size === 0) {
      subscribers.delete(channelId);
    }
  };
}

/**
 * BROADCAST VALUATION COMPLETE EVENT
 */
export function broadcastValuationComplete(valuation: ValuationResult, channelId = 'valuations') {
  const message: BroadcastMessage = {
    type: 'valuation_complete',
    timestamp: new Date(),
    data: {
      valuationId: valuation.valuationId,
      propertyId: valuation.propertyId,
      pointEstimate: valuation.valuation.pointEstimate,
      confidence: valuation.valuation.confidence,
      riskFlags: valuation.riskFlags,
      liquidity: valuation.liquidity,
    },
    priority: 'high',
  };

  broadcastMessage(channelId, message);
  
  // Also broadcast to property-specific channel
  broadcastMessage(`property:${valuation.propertyId}`, message);
}

/**
 * BROADCAST MARKET DATA UPDATE
 */
export function broadcastMarketUpdate(
  city: string,
  micromarket: string,
  data: Record<string, any>
) {
  const message: BroadcastMessage = {
    type: 'market_update',
    timestamp: new Date(),
    data: {
      city,
      micromarket,
      ...data,
    },
    priority: 'normal',
  };

  broadcastMessage('market-data', message);
  broadcastMessage(`market:${city}:${micromarket}`, message);
}

/**
 * BROADCAST TRAINING PROGRESS
 */
export function broadcastTrainingProgress(
  modelName: string,
  progress: number,
  metrics?: Record<string, any>
) {
  const message: BroadcastMessage = {
    type: 'training_progress',
    timestamp: new Date(),
    data: {
      modelName,
      progress, // 0-100
      metrics,
    },
    priority: 'normal',
  };

  broadcastMessage('training', message);
  broadcastMessage(`training:${modelName}`, message);
}

/**
 * BROADCAST ERROR
 */
export function broadcastError(
  channelId: string,
  error: string,
  context?: Record<string, any>
) {
  const message: BroadcastMessage = {
    type: 'error',
    timestamp: new Date(),
    data: {
      message: error,
      context,
    },
    priority: 'high',
  };

  broadcastMessage(channelId, message);
}

/**
 * GENERIC MESSAGE BROADCAST
 */
export function broadcastMessage(channelId: string, message: BroadcastMessage) {
  const subscribers_in_channel = subscribers.get(channelId);

  if (!subscribers_in_channel || subscribers_in_channel.size === 0) {
    console.log(`[WebSocket] Broadcast to ${channelId}: no subscribers`);
    return;
  }

  console.log(
    `[WebSocket] Broadcasting ${message.type} to ${subscribers_in_channel.size} clients on ${channelId}`
  );

  // In production with real WebSocket server:
  // subscribers_in_channel.forEach(clientId => {
  //   sendToClient(clientId, message);
  // });

  // For now: Store in broker for polling
  if (!brokers.has(channelId)) {
    brokers.set(channelId, []);
  }
  brokers.get(channelId)!.push(message);

  // Keep only last 100 messages per channel
  const messages = brokers.get(channelId)!;
  if (messages.length > 100) {
    messages.shift();
  }
}

/**
 * POLLING ALTERNATIVE: Get pending messages for client
 * Used when WebSocket is not available
 */
export function getPendingMessages(
  channelId: string,
  lastMessageTime?: Date
): BroadcastMessage[] {
  const messages = brokers.get(channelId) || [];

  if (!lastMessageTime) {
    return messages.slice(-10); // Last 10 messages
  }

  return messages.filter((m) => m.timestamp > lastMessageTime);
}

/**
 * CLEAR CHANNEL
 */
export function clearChannel(channelId: string) {
  subscribers.delete(channelId);
  brokers.delete(channelId);
}

/**
 * GET CHANNEL STATS
 */
export function getChannelStats(channelId?: string) {
  if (channelId) {
    return {
      subscribers: subscribers.get(channelId)?.size || 0,
      pendingMessages: brokers.get(channelId)?.length || 0,
    };
  }

  return {
    channels: subscribers.size,
    totalSubscribers: Array.from(subscribers.values()).reduce((sum, s) => sum + s.size, 0),
    channelDetails: Array.from(subscribers.entries()).map(([id, subs]) => ({
      channelId: id,
      subscribers: subs.size,
      pendingMessages: brokers.get(id)?.length || 0,
    })),
  };
}
// @ts-nocheck
