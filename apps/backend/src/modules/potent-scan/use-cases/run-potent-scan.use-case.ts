import { Inject, Injectable } from '@nestjs/common';
import {
  POTENT_SCAN_REPOSITORY,
  POTENT_SCREENER_SERVICE,
  SESSION_CALENDAR,
} from '../constants/tokens';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';
import type { PotentScreenerService } from '../domain/services/potent-screener.service';
import type { SessionCalendar } from '../domain/services/session-calendar.service';
import { PotentScan } from '../domain/entities/potent-scan';
import { SessionDate } from '../domain/value-objects/session-date';
import { StateError } from '../domain/domain-errors';

export interface RunPotentScanRequestDto {
  replaceExisting: boolean;
}

export interface RunPotentScanResponseDto {
  sessionDate: SessionDate;
  hitCount: number;
}

@Injectable()
export class RunPotentScanUseCase {
  constructor(
    @Inject(SESSION_CALENDAR)
    private readonly sessionCalendar: SessionCalendar,
    @Inject(POTENT_SCREENER_SERVICE)
    private readonly screener: PotentScreenerService,
    @Inject(POTENT_SCAN_REPOSITORY)
    private readonly repository: PotentScanRepository,
  ) {}

  async execute(
    request: RunPotentScanRequestDto,
  ): Promise<RunPotentScanResponseDto> {
    const sessionDate = await this.sessionCalendar.lastCompletedSession();

    if (
      !request.replaceExisting &&
      (await this.repository.exists(sessionDate))
    ) {
      throw new StateError(
        `No new session: the last completed session ${sessionDate.value} is already scanned`,
      );
    }

    const result = await this.screener.scan();
    const scan = PotentScan.of({ sessionDate, ...result });
    await this.repository.replace(scan);

    return { sessionDate, hitCount: scan.hits.length };
  }
}
