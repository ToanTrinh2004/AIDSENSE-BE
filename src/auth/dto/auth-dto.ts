import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, MinLength, Matches, IsString, IsOptional, IsIn } from 'class-validator';

export enum OtpType {
  SIGNUP = 'signup',
  FORGOT_PASSWORD = 'forgot-password',
}

const PHONE_REGEX = /^(0[35789]\d{8})$/;
const PHONE_MESSAGE = 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam hợp lệ.';

export class SignupDto {
  @ApiProperty({ example: '0901234567', description: 'Phone number' })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Username' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  username: string;

  @ApiProperty({ example: '123456', description: 'Password', minLength: 6 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh', description: 'Tỉnh/Thành phố' })
  @IsNotEmpty({ message: 'Tỉnh/Thành phố không được để trống' })
  province: string;
}
export class SignInDto {
  @ApiProperty({ example: '0901234567', description: 'Phone number' })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: '123456', description: 'Password' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  password: string;
}

export class SendOtpDto {
  @ApiProperty({ example: '0901234567', description: 'Phone number' })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ enum: OtpType, example: OtpType.SIGNUP, description: 'OTP type' })
  @IsEnum(OtpType, { message: 'Loại OTP không hợp lệ' })
  type: OtpType;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '0901234567', description: 'Phone number' })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 1234, description: 'OTP code' })
  @IsNotEmpty({ message: 'OTP không được để trống' })
  otp: number;

  @ApiProperty({ enum: OtpType, example: OtpType.SIGNUP, description: 'OTP type' })
  @IsEnum(OtpType, { message: 'Loại OTP không hợp lệ' })
  type: OtpType;
}

export class ForgetPasswordDto {
  @ApiProperty({ example: '0901234567', description: 'Phone number' })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirmPassword: string;
}

export class TeamPhoneDto {
  @ApiProperty({ example: '0901234567', description: 'Team leader phone number' })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone: string;
}

export class TeamVerifyOtpDto {
  @ApiProperty({ example: '0901234567', description: 'Team leader phone number' })
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 123456, description: 'OTP code' })
  @IsNotEmpty({ message: 'OTP không được để trống' })
  otp: number;
}

export class LogoutDto {
  @ApiPropertyOptional({ example: 'device-uuid-here' })
  @IsOptional()
  @IsString()
  device_id?: string;

  @ApiProperty({ example: 'android', enum: ['android', 'ios'] })
  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';
}
export class ChangePasswordDto {
  @ApiProperty({ example: 'oldpassword123', description: 'Mật khẩu hiện tại' })
  @IsNotEmpty({ message: 'Mật khẩu cũ không được để trống' })
  old_password: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6, description: 'Mật khẩu mới' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  new_password: string;

  @ApiProperty({ example: 'newpassword123', description: 'Nhập lại mật khẩu mới' })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirm_new_password: string;
}