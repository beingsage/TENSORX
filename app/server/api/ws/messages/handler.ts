/**
 * API ROUTE: GET /api/ws/messages?channel=valuations&lastTime=...
 * Polling fallback for real-time updates when WebSocket unavailable
 * Production: Replace with real WebSocket implementation
 */

import { getPendingMessages, getChannelStats } from '@/lib/websocket/broadcaster';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const channel = url.searchParams.get('channel');
    const lastTimeStr = url.searchParams.get('lastTime');

    if (!channel) {
      // Return all channel stats
      const stats = getChannelStats();
      return Response.json({
        success: true,
        stats,
      });
    }

    // Parse last message time
    const lastTime = lastTimeStr ? new Date(lastTimeStr) : undefined;

    // Get pending messages
    const messages = getPendingMessages(channel, lastTime);

    return Response.json({
      success: true,
      channel,
      messageCount: messages.length,
      messages,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[WS Messages API] Error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
