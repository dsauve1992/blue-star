import { Inject, Injectable } from '@nestjs/common';
import { POTENT_SCAN_REPOSITORY } from '../constants/tokens';
import type { PotentScanRepository } from '../domain/repositories/potent-scan.repository.interface';

export interface ListPotentScanDatesResponseDto {
  scanDates: string[];
}

@Injectable()
export class ListPotentScanDatesUseCase {
  constructor(
    @Inject(POTENT_SCAN_REPOSITORY)
    private readonly repository: PotentScanRepository,
  ) {}

  async execute(): Promise<ListPotentScanDatesResponseDto> {
    const dates = await this.repository.listSessionDates();
    return { scanDates: dates.map((date) => date.value) };
  }
}
