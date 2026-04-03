import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../domain/value-objects/symbol';
import {
  CompanyProfile,
  CompanyProfileService,
} from '../domain/services/company-profile.service';
import { COMPANY_PROFILE_SERVICE } from '../constants/tokens';

export interface GetCompanyProfileRequestDto {
  symbol: Symbol;
}

export interface GetCompanyProfileResponseDto {
  profile: CompanyProfile;
}

@Injectable()
export class GetCompanyProfileUseCase {
  constructor(
    @Inject(COMPANY_PROFILE_SERVICE)
    private readonly companyProfileService: CompanyProfileService,
  ) {}

  async execute(
    request: GetCompanyProfileRequestDto,
  ): Promise<GetCompanyProfileResponseDto> {
    const profile = await this.companyProfileService.getCompanyProfile(
      request.symbol,
    );

    return { profile };
  }
}
