import { IsOptional, IsString, IsUUID, IsIn } from 'class-validator';

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsIn(['active', 'disabled', 'lost'])
  status?: 'active' | 'disabled' | 'lost';
}
