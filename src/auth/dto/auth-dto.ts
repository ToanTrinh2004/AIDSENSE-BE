import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, MinLength } from 'class-validator';

export enum OtpType {
  SIGNUP = 'signup',
  FORGOT_PASSWORD = 'forgot-password',
}

export class SignupDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Phone number',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({
    example: 'Nguyen Van A',
    description: 'Username',
  })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  username: string;

  @ApiProperty({
    example: '123456',
    description: 'Password',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}

export class SignInDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Phone number',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({
    example: '123456',
    description: 'Password',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}

export class SendOtpDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Phone number',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({
    enum: OtpType,
    example: OtpType.SIGNUP,
    description: 'OTP type',
  })
  @IsEnum(OtpType, { message: 'Loại OTP không hợp lệ' })
  type: OtpType;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Phone number',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({
    example: 123456,
    description: 'OTP code',
  })
  @IsNotEmpty({ message: 'OTP không được để trống' })
  otp: number;

  @ApiProperty({
    enum: OtpType,
    example: OtpType.SIGNUP,
    description: 'OTP type',
  })
  @IsEnum(OtpType, { message: 'Loại OTP không hợp lệ' })
  type: OtpType;
}

export class ForgetPasswordDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Phone number',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({
    example: 'newpassword123',
    minLength: 6,
  })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({
    example: 'newpassword123',
  })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirmPassword: string;
}

export class TeamPhoneDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Team leader phone number',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;
}

export class TeamVerifyOtpDto {
  @ApiProperty({
    example: '0901234567',
    description: 'Team leader phone number',
  })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;

  @ApiProperty({
    example: 123456,
    description: 'OTP code',
  })
  @IsNotEmpty({ message: 'OTP không được để trống' })
  otp: number;
  //ggggg
}