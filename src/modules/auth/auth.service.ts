import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    try {
      const user = await this.usersService.create(signupDto);
      const token = await this.generateToken(user._id.toString(), user.email);
      
      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Signup failed: ' + error.message);
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.usersService.findByEmail(loginDto.email);
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const token = await this.generateToken(user._id.toString(), user.email);
      
      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Login failed: ' + error.message);
    }
  }

  private async generateToken(userId: string, email: string): Promise<string> {
    try {
      const payload = { sub: userId, email };
      return await this.jwtService.signAsync(payload);
    } catch (error) {
      throw new InternalServerErrorException('Token generation failed: ' + error.message);
    }
  }
}
