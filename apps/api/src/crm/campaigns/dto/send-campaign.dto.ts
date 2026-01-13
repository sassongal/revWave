import { IsOptional, IsArray, IsString } from 'class-validator';

export class SendCampaignDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contactIds?: string[]; // Optional: send to specific contacts, otherwise all subscribed
}
