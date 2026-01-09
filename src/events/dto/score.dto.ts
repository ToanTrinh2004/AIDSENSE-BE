import { IsNumber, IsString, IsOptional, IsEnum, Min, Max, IsBoolean } from 'class-validator';

export enum SosType {
  HELP = 'HELP',
  ESSENTIAL = 'ESSENTIAL',
  TOWING = 'TOWING',
  OTHER = 'OTHER',
  RESCUE = 'RESCUE',
  MEDICAL = 'MEDICAL',
}

export class ScoreDto {
 

  @IsNumber()
  @Min(0)
  distanceKm: number; 

  @IsNumber()
  @Min(1)
  teamSize: number; 

  @IsEnum(SosType)
  emergencyType: SosType;

  @IsNumber()
  @Min(0)
  @Max(2880) 
  timeFromAssignedMinutes: number;

  @IsNumber()
  @Min(0)
  llm_score: number; 

 
}
