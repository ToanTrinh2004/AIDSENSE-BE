import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('profile')
  async viewMyProfile(@Req() req) {
    return this.userService.viewMyProfile(req.user);
  }

  // xem tat ca cac request sos cua minh
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('profile/sos')
  async viewMySosRequests(@Req() req) {
    return this.userService.viewMySosRequests(req.user);
  }
  // huy request sos cua minh
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('profile/sos/cancel/:sosId')
  async cancelSosRequest(@Param('sosId') sosId: string,
    @Req() req) {
    return this.userService.cancelSosRequest(sosId, req.user);
  }
  // hoan thanh request sos cua minh
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('profile/sos/complete/:sosId')
  async completeSosRequest(@Param('sosId') sosId: string,
    @Req() req) {
    return this.userService.completeSosRequest(sosId, req.user);
  }
  // update profile
  @HttpCode(200)
@UseGuards(AuthGuard)
@Patch('profile')
@UseInterceptors(FileInterceptor('avatar'))
async updateProfile(
  @Req() req,
  @Body() updateUserDto: UpdateUserDto,
  @UploadedFile() avatar?: Express.Multer.File,
) {
  return this.userService.updateProfile(
    req.user,
    updateUserDto,
    avatar
  );
}

  
}
