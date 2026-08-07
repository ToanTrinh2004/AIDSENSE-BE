import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
export enum SosType {
  HELP = 'HELP',
  ESSENTIAL = 'ESSENTIAL',
  FOOD = 'FOOD',
  OTHER = 'OTHER',
}
export class CreateSosDto {
  @ApiProperty({
    enum: SosType,
    example: SosType.HELP,
    description: 'Loại yêu cầu SOS',
  })
  @IsNotEmpty()
  @IsEnum(SosType, {
    message: 'type must be one of: HELP, ESSENTIAL, FOOD, OTHER',
  })
  type: SosType;

  @ApiPropertyOptional({ example: 'Xe hỏng giữa đường cao tốc', description: 'Mô tả tình huống' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 10.762622, description: 'Vĩ độ' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 106.660172, description: 'Kinh độ' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lon?: number;

  @ApiPropertyOptional({ example: '123 Nguyen Van Cu, Q5, TPHCM', description: 'Địa chỉ dạng text' })
  @IsOptional()
  @IsString()
  address_text?: string;

  @ApiPropertyOptional({ example: '0912345678', description: 'Số điện thoại liên hệ (VN)' })
  @IsOptional()
  @Matches(/^(0[35789]\d{8})$/, {
    message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam hợp lệ.',
  })
  phone?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Ảnh đính kèm (tuỳ chọn)' })
  @IsOptional()
  image?: any;
}

export class UpdateSosDto extends PartialType(CreateSosDto) {}

export class ConvertPlaceDto {
  @ApiProperty({ example: 10.762622, description: 'Vĩ độ' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 106.660172, description: 'Kinh độ' })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lon: number;
}