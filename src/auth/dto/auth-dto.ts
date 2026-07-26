import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email đăng ký' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu (tối thiểu 6 ký tự)', minLength: 6 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Tên người dùng' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  username: string;

  @ApiProperty({ example: '0901234567', description: 'Số điện thoại' })
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  phone: string;
}

export class SignInDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email đăng nhập' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu (tối thiểu 6 ký tự)', minLength: 6 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;
}

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email nhận OTP' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'register', description: 'Loại OTP (register, forget-password, ...)' })
  @IsNotEmpty({ message: 'Type không được để trống' })
  type: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 123456, description: 'Mã OTP' })
  @IsNotEmpty({ message: 'OTP không được để trống' })
  otp: number;
}

export class ForgetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'newpassword123', minLength: 6 })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsNotEmpty({ message: 'Xác nhận mật khẩu không được để trống' })
  confirmPassword: string;

  @ApiProperty({ example: 123456, description: 'Mã OTP xác nhận' })
  @IsNotEmpty({ message: 'OTP không được để trống' })
  otp: number;
}

export class TeamEmailDto {
  @ApiProperty({ example: 'leader@example.com', description: 'Email trưởng nhóm' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

export class TeamVerifyOtpDto {
  @ApiProperty({ example: 'leader@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 123456, description: 'Mã OTP' })
  @IsNotEmpty({ message: 'OTP không được để trống' })
  otp: number;
}