import { IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateWeightDto {
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  distance: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  time: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  emergency_type: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  llm_description: number;

  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  @Max(1)
  team_size: number;
}