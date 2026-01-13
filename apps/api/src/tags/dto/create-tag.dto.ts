import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTagDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}
