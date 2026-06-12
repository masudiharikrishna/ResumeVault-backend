import { Controller, Get, Patch, Body, UseGuards, Req, UsePipes, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    const userId = req.user.sub;
    return this.usersService.findById(userId);
  }

  @Patch('profile')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateProfile(@Req() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user.sub;
    const { name, currentPassword, newPassword } = updateProfileDto;
    return this.usersService.updateProfile(userId, name, currentPassword, newPassword);
  }
}
