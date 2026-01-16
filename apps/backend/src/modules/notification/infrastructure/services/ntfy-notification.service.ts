import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NotificationService,
  SendNotificationRequest,
} from '../../domain/services/notification.service';

interface NtfyRequest {
  topic: string;
  message: string;
  title?: string;
  priority?: number;
  tags?: string[];
}

@Injectable()
export class NtfyNotificationService implements NotificationService {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('NTFY_BASE_URL') || 'https://ntfy.sh';
    this.apiKey = this.configService.get<string>('NTFY_API_KEY');
  }

  async send(request: SendNotificationRequest): Promise<void> {
    const payload: NtfyRequest = {
      topic: request.topic.value,
      message: request.message.value,
    };

    if (request.title) {
      payload.title = request.title.value;
    }

    if (request.priority) {
      payload.priority = request.priority;
    }

    if (request.tags && request.tags.length > 0) {
      payload.tags = request.tags;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to send notification: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send notification: ${error.message}`);
      }
      throw new Error('Failed to send notification: Unknown error');
    }
  }
}
