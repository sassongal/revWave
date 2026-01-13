import {
  IsEmail,
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
} from 'class-validator';

export class CreateContactDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsString()
  @IsIn(['landing_page', 'manual', 'import'])
  source!: 'landing_page' | 'manual' | 'import';

  @IsString()
  @IsIn(['granted'])
  consentStatus!: 'granted'; // Must be 'granted' to create contact

  @IsDateString()
  consentTimestamp!: string; // ISO date string

  @IsOptional()
  @IsString()
  consentSource?: string; // form_id, tag, campaign, etc.
}
