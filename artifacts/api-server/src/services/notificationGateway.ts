/**
 * Notification Gateway — Multi-channel notification abstraction
 *
 * Channels:
 * - in-app (existing, fully functional)
 * - email (mock implementation — ready for SMTP/SES integration)
 * - sms (placeholder — future WhatsApp/Twilio integration)
 *
 * Trigger events:
 * - assignment
 * - rejection
 * - approval
 * - overdue
 * - submission
 * - revision_needed
 */

import { createNotification, type NotificationType } from "../lib/notifications";

// ─── Channel types ───────────────────────────────────────────────────────────
export type NotificationChannel = "in_app" | "email" | "sms";

export interface NotificationPayload {
  userId: number;
  taskId: number | null;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  metadata?: Record<string, unknown>;
}

export interface ChannelResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

// ─── Channel implementations ─────────────────────────────────────────────────

async function sendInApp(payload: NotificationPayload): Promise<ChannelResult> {
  try {
    await createNotification(
      payload.userId,
      payload.taskId,
      payload.type,
      payload.title,
      payload.message,
    );
    return { channel: "in_app", success: true };
  } catch (err) {
    return {
      channel: "in_app",
      success: false,
      error: (err as Error).message,
    };
  }
}

async function sendEmail(payload: NotificationPayload): Promise<ChannelResult> {
  // Mock email implementation — logs to console
  // Replace with nodemailer / AWS SES / SendGrid in production
  try {
    const emailConfig = {
      to: `user-${payload.userId}@turbine-qc.local`, // placeholder
      subject: payload.title,
      body: payload.message,
      taskId: payload.taskId,
      type: payload.type,
    };

    console.log("[notificationGateway] EMAIL (mock):", JSON.stringify(emailConfig));

    // In production, this would be:
    // await transporter.sendMail({ to: userEmail, subject, html: template(payload) });

    return { channel: "email", success: true };
  } catch (err) {
    return {
      channel: "email",
      success: false,
      error: (err as Error).message,
    };
  }
}

async function sendSms(payload: NotificationPayload): Promise<ChannelResult> {
  // Placeholder — future Twilio / WhatsApp integration
  console.log(
    `[notificationGateway] SMS (placeholder): userId=${payload.userId}, title="${payload.title}"`,
  );
  return { channel: "sms", success: true };
}

// ─── Channel registry ────────────────────────────────────────────────────────
const CHANNEL_HANDLERS: Record<
  NotificationChannel,
  (payload: NotificationPayload) => Promise<ChannelResult>
> = {
  in_app: sendInApp,
  email: sendEmail,
  sms: sendSms,
};

// Default channels per notification type
const DEFAULT_CHANNELS: Record<NotificationType, NotificationChannel[]> = {
  task_assigned: ["in_app", "email"],
  task_submitted: ["in_app"],
  task_rejected: ["in_app", "email"],
  task_revision_needed: ["in_app", "email"],
  task_approved: ["in_app", "email"],
  task_overdue: ["in_app", "email"],
};

// ─── Gateway API ─────────────────────────────────────────────────────────────

/**
 * Send a notification through one or more channels.
 * Non-critical: never throws. Returns results per channel.
 */
export async function sendNotification(
  payload: NotificationPayload,
): Promise<ChannelResult[]> {
  const channels = payload.channels ?? DEFAULT_CHANNELS[payload.type] ?? ["in_app"];
  const results: ChannelResult[] = [];

  for (const channel of channels) {
    const handler = CHANNEL_HANDLERS[channel];
    if (handler) {
      try {
        const result = await handler(payload);
        results.push(result);
      } catch (err) {
        results.push({
          channel,
          success: false,
          error: (err as Error).message,
        });
      }
    }
  }

  return results;
}

/**
 * Send notification to multiple users (e.g., notifyRoles equivalent).
 */
export async function broadcastNotification(
  userIds: number[],
  taskId: number | null,
  type: NotificationType,
  title: string,
  message: string,
  channels?: NotificationChannel[],
): Promise<void> {
  for (const userId of userIds) {
    await sendNotification({
      userId,
      taskId,
      type,
      title,
      message,
      channels,
    }).catch(() => {});
  }
}
