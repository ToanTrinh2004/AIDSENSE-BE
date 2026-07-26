import { IsIn, IsNotEmpty, IsOptional, IsString, Matches, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateSosDto {
  @ApiProperty({ example: 'HELP', description: 'Loại yêu cầu SOS' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 'Xe hỏng giữa đường cao tốc', description: 'Mô tả tình huống' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '10.762622', description: 'Vĩ độ' })
  @IsOptional()
  @IsString()
  lat?: string;

  @ApiPropertyOptional({ example: '106.660172', description: 'Kinh độ' })
  @IsOptional()
  @IsString()
  lon?: string;

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

  @ApiPropertyOptional({
    example: 'PENDING',
    description: 'Trạng thái yêu cầu',
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETE', 'CANCELED'],
  })
  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETE', 'CANCELED'])
  status?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Ảnh đính kèm (tuỳ chọn)' })
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