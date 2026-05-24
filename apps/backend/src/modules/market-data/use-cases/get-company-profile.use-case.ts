import { Injectable, Inject, Logger } from '@nestjs/common';
import { Symbol } from '../domain/value-objects/symbol';
import {
  CompanyProfile,
  CompanyProfileService,
} from '../domain/services/company-profile.service';
import { COMPANY_PROFILE_SERVICE } from '../constants/tokens';
import { GetOrFetchStockClassificationUseCase } from '../../stock-classification/use-cases/get-or-fetch-stock-classification.use-case';

export interface GetCompanyProfileRequestDto {
  symbol: Symbol;
}

export interface GetCompanyProfileResponseDto {
  profile: CompanyProfile;
}

@Injectable()
export class GetCompanyProfileUseCase {
  private readonly logger = new Logger(GetCompanyProfileUseCase.name);

  constructor(
    @Inject(COMPANY_PROFILE_SERVICE)
    private readonly companyProfileService: CompanyProfileService,
    private readonly getOrFetchClassification: GetOrFetchStockClassificationUseCase,
  ) {}

  async execute(
    request: GetCompanyProfileRequestDto,
  ): Promise<GetCompanyProfileResponseDto> {
    const profile = await this.companyProfileService.getCompanyProfile(
      request.symbol,
    );

    let industryGroup: string | null = null;
    try {
      const classification = await this.getOrFetchClassification.execute(
        request.symbol.value,
      );
      industryGroup = classification.industryGroup;
    } catch (error) {
      this.logger.warn(
        `Failed to classify ${request.symbol.value}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      profile: {
        ...profile,
        industryGroup,
      },
    };
  }
}
