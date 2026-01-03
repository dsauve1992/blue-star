import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { CalculateSectorRotationUseCase } from '../use-cases/calculate-sector-rotation.use-case';
import { SectorRotationApiMapper } from './sector-rotation-api.mapper';
import { CalculateSectorRotationApiResponseDto } from './sector-rotation-api.dto';

const DEFAULT_SECTOR_ETFS = [
  { symbol: 'XLK', name: 'Technology' },
  { symbol: 'XLE', name: 'Energy' },
  { symbol: 'XLI', name: 'Industrial' },
  { symbol: 'XLY', name: 'Consumer Discretionary' },
  { symbol: 'XLP', name: 'Consumer Staples' },
  { symbol: 'XLV', name: 'Healthcare' },
  { symbol: 'XLF', name: 'Financial' },
  { symbol: 'XLB', name: 'Materials' },
  { symbol: 'XLU', name: 'Utilities' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLC', name: 'Communication Services' },
];

@Controller('sector-rotation')
export class SectorRotationController {
  constructor(
    private readonly calculateSectorRotationUseCase: CalculateSectorRotationUseCase,
    private readonly sectorRotationApiMapper: SectorRotationApiMapper,
  ) {}

  @Get('calculate')
  @Public()
  async calculateSectorRotation(
    @Query('sectors') sectorsParam?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lookbackWeeks') lookbackWeeks?: string,
    @Query('momentumWeeks') momentumWeeks?: string,
    @Query('normalizationWindowWeeks') normalizationWindowWeeks?: string,
    @Query('benchmarkType') benchmarkType?: string,
  ): Promise<CalculateSectorRotationApiResponseDto> {
    try {
      const sectors = sectorsParam
        ? this.parseSectors(sectorsParam)
        : DEFAULT_SECTOR_ETFS;

      const endDateObj = endDate ? new Date(endDate) : new Date();
      const requestedStartDate = startDate
        ? new Date(startDate)
        : new Date(endDateObj.getTime() - 52 * 7 * 24 * 60 * 60 * 1000);

      const lookbackWeeksValue = lookbackWeeks
        ? parseInt(lookbackWeeks, 10)
        : 12;
      const momentumWeeksValue = momentumWeeks
        ? parseInt(momentumWeeks, 10)
        : 5;
      const normalizationWindowWeeksValue = normalizationWindowWeeks
        ? parseInt(normalizationWindowWeeks, 10)
        : 52;

      const requiredLookbackWeeks = Math.max(
        normalizationWindowWeeksValue,
        lookbackWeeksValue,
        momentumWeeksValue,
      );

      const startDateObj = new Date(
        requestedStartDate.getTime() -
          requiredLookbackWeeks * 7 * 24 * 60 * 60 * 1000,
      );

      const request = {
        sectors,
        startDate: startDateObj,
        endDate: endDateObj,
        lookbackWeeks: lookbackWeeksValue,
        momentumWeeks: momentumWeeksValue,
        normalizationWindowWeeks: normalizationWindowWeeksValue,
        benchmarkType,
      };

      const useCaseResponse =
        await this.calculateSectorRotationUseCase.execute(request);
      return this.sectorRotationApiMapper.mapCalculateSectorRotationResponse(
        useCaseResponse,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid request',
      );
    }
  }

  private parseSectors(
    sectorsParam: string,
  ): Array<{ symbol: string; name: string }> {
    try {
      const parsed = JSON.parse(sectorsParam);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => ({
          symbol: s.symbol || s,
          name: s.name || s.symbol || s,
        }));
      }
      throw new Error('Sectors must be an array');
    } catch {
      const symbols = sectorsParam.split(',').map((s) => s.trim());
      return symbols.map((symbol) => ({ symbol, name: symbol }));
    }
  }
}
