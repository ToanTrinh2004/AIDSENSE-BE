import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';

export enum EventCodeType {
  HELP = 'HELP',
  ESSENTIAL = 'ESSENTIAL',
  TOWING = 'TOWING',
  OTHER = 'OTHER',
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lon?: number;

  @IsOptional()
  @IsString()
  location_name?: string;

  @IsOptional()
  @IsEnum(EventCodeType)
  code_type?: EventCodeType;
}
