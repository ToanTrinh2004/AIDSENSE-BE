import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateSosDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lon?: string;

  @IsOptional()
  @IsString()
  address_text?: string;

  @IsOptional()
  @Matches(/^(0[35789]\d{8})$/, {
    message: 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam hợp lệ.',
  })
  phone?: string;
 

  @IsOptional()
  @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETE',"CANCELLED"])
  status?: string;
}
