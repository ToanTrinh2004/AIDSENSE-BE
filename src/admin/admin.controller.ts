import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateEventDto } from './dto/update-events-dto';
import { UpdateUserDto } from './dto/update-user-dto';
import { CreateTeamDto } from 'src/team/dto/create-team.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getAllUsers(
    @Query('limit') limit = '15',
    @Query('page') page = '1',
  ) {
    return this.adminService.getAllUsers(
      Number(limit),
      Number(page),
    );
  }
  
  @Get('teams')
  getAllTeams(
    @Query('limit') limit = '15',
    @Query('page') page = '1',
  ) {
    return this.adminService.getAllTeams(
      Number(limit),
      Number(page),
    );
  }
  @Patch('update/events/:eventId')
  updateEventByAdmin(@Param('eventId') eventId: string, @Body() updateData: UpdateEventDto)  {
    return this.adminService.updateEventByAdmin(eventId, updateData);
  }
  @Patch('update/events/status/:eventId')
  updateEventStatusByAdmin(@Param('eventId') eventId: string, @Body() body: { status: string })  {
    return this.adminService.updateEventStatus(eventId,body.status);
  }
  @Patch('update/users/:userId')
  updateUserByAdmin(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.adminService.updateUser(userId, updateUserDto);
  }
  
  @Patch('update/teams/:teamId')
  updateTeamByAdmin(@Param('teamId') teamId: string, @Body() updateTeamDto: CreateTeamDto) {
    return this.adminService.updateTeam(teamId, updateTeamDto);
  }
  @Patch('update/teams/status/:teamId')
  updateTeamStatusByAdmin(@Param('teamId') teamId: string, @Body() body: { status: string })  {
    return this.adminService.updateTeamStatus(teamId,body.status);
  }
 
}
