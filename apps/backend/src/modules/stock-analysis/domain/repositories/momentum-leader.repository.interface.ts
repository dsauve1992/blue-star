import { MomentumLeader } from '../value-objects/momentum-leader';

export interface MomentumLeaderRepository {
  replaceScan(scanDate: Date, leaders: MomentumLeader[]): Promise<void>;
  getLatestScan(): Promise<MomentumLeader[]>;
}
