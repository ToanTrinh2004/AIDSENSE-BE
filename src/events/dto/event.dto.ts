import {
    IsBoolean,
    IsOptional,
    IsString,
    IsArray,
    IsNumber,
    IsIn,
  } from 'class-validator';
  import { Transform } from 'class-transformer';
  
  export class EventDto {
    @IsOptional()
    @IsBoolean()
    all_sources?: boolean;
  
    @IsOptional()
    @IsString()
    city?: string;
  
    @IsOptional()
    @IsArray()
    @IsIn(['HELP', 'ESSENTIAL', 'TOWING', 'OTHER'], { each: true })
    codes?: string[];
  
    @IsOptional()
    @IsString()
    group?: string;
  
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    lat?: number;
  
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    lon?: number;
  
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    radius_meters?: number;
  
    @IsOptional()
    @IsString()
    time_window?: string; // ví dụ: "24h"
  }
  