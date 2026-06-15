import { apiClient } from '../../global/api/api-instance';
import type { LeaderBreadthResponse } from './leader-breadth.types';

export class LeaderBreadthClient {
  async getBreadth(): Promise<LeaderBreadthResponse> {
    const response =
      await apiClient.get<LeaderBreadthResponse>('/leader-scan/breadth');
    return response.data;
  }
}
