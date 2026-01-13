import { IsOptional, IsString } from 'class-validator';

export class GetAnalyticsQueryDto {
  @IsOptional()
  @IsString()
  range?: string; // e.g., "30d" - kept for future use
}
