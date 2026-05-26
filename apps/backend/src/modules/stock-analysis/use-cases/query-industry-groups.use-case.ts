import { Inject, Injectable } from '@nestjs/common';
import { IndustryGroupRsRatingRepository } from '../domain/repositories/industry-group-rs-rating.repository.interface';
import { INDUSTRY_GROUP_RS_RATING_REPOSITORY } from '../constants/tokens';

export interface IndustryGroupSummaryDto {
  industryGroup: string;
  memberCount: number;
  computedAt: string;
}

export interface QueryIndustryGroupsResponseDto {
  groups: IndustryGroupSummaryDto[];
}

@Injectable()
export class QueryIndustryGroupsUseCase {
  constructor(
    @Inject(INDUSTRY_GROUP_RS_RATING_REPOSITORY)
    private readonly repository: IndustryGroupRsRatingRepository,
  ) {}

  async execute(): Promise<QueryIndustryGroupsResponseDto> {
    const groups = await this.repository.listLatestGroups();
    return {
      groups: groups.map((g) => ({
        industryGroup: g.industryGroup,
        memberCount: g.memberCount,
        computedAt: g.computedAt.toISOString().split('T')[0],
      })),
    };
  }
}
