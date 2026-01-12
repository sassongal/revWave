import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetReviewsQueryDto {
  @IsOptional()
  @IsIn(['unreplied', 'pending', 'drafted', 'replied'])
  filter?: 'unreplied' | 'pending' | 'drafted' | 'replied';

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
