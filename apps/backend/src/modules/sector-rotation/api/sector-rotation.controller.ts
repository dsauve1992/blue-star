/* eslint-disable @typescript-eslint/no-unsafe-assignment  */
/* eslint-disable @typescript-eslint/no-unsafe-member-access  */
import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { CalculateSectorRotationUseCase } from '../use-cases/calculate-sector-rotation.use-case';
import { GetSectorRotationUseCase } from '../use-cases/get-sector-rotation.use-case';
import { CompareSectorRotationUseCase } from '../use-cases/compare-sector-rotation.use-case';
import { SectorRotationApiMapper } from './sector-rotation-api.mapper';
import {
  CalculateSectorRotationApiResponseDto,
  CompareSectorRotationApiResponseDto,
} from './sector-rotation-api.dto';
import { RRG_PARAMETERS } from '../constants/rrg-parameters';

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
    private readonly getSectorRotationUseCase: GetSectorRotationUseCase,
    private readonly compareSectorRotationUseCase: CompareSectorRotationUseCase,
    private readonly sectorRotationApiMapper: SectorRotationApiMapper,
  ) {}

  @Get('calculate')
  @Public()
  async calculateSectorRotation(
    @Query('sectors') sectorsParam?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('mode') mode?: string,
  ): Promise<CalculateSectorRotationApiResponseDto> {
    try {
      const sectors = sectorsParam
        ? this.parseSectors(sectorsParam)
        : DEFAULT_SECTOR_ETFS;

      const endDateObj = endDate ? new Date(endDate) : new Date();
      const requestedStartDate = startDate
        ? new Date(startDate)
        : new Date(endDateObj.getTime() - 52 * 7 * 24 * 60 * 60 * 1000);

      const usePersisted = mode === 'persisted' || mode === 'cache';

      if (usePersisted) {
        const request = {
          sectors,
          startDate: requestedStartDate,
          endDate: endDateObj,
        };

        const useCaseResponse =
          await this.getSectorRotationUseCase.execute(request);
        return this.sectorRotationApiMapper.mapCalculateSectorRotationResponse(
          useCaseResponse,
        );
      }

      const requiredLookbackWeeks = RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS;

      const startDateObj = new Date(
        requestedStartDate.getTime() -
          requiredLookbackWeeks * 7 * 24 * 60 * 60 * 1000,
      );

      const request = {
        sectors,
        startDate: startDateObj,
        endDate: endDateObj,
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

  @Get('compare')
  @Public()
  async compareSectorRotation(
    @Query('sectors') sectorsParam?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CompareSectorRotationApiResponseDto> {
    try {
      const sectors = sectorsParam
        ? this.parseSectors(sectorsParam)
        : DEFAULT_SECTOR_ETFS;

      const endDateObj = endDate ? new Date(endDate) : new Date();
      const requestedStartDate = startDate
        ? new Date(startDate)
        : new Date(endDateObj.getTime() - 52 * 7 * 24 * 60 * 60 * 1000);

      const request = {
        sectors,
        startDate: requestedStartDate,
        endDate: endDateObj,
      };

      const useCaseResponse =
        await this.compareSectorRotationUseCase.execute(request);

      return {
        persisted: this.sectorRotationApiMapper.mapSectorRotationResult(
          useCaseResponse.persisted,
        ),
        live: this.sectorRotationApiMapper.mapSectorRotationResult(
          useCaseResponse.live,
        ),
        differences: useCaseResponse.differences,
        summary: useCaseResponse.summary,
      };
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
