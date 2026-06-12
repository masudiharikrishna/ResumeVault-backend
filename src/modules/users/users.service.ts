import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../models/user.schema';
import { SignupDto } from '../auth/dto/signup.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(signupDto: SignupDto): Promise<UserDocument> {
    try {
      const { name, email, password } = signupDto;
      
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new BadRequestException('Email is already registered');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new this.userModel({
        name,
        email,
        password: hashedPassword,
      });
      
      return await user.save();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('User creation failed: ' + error.message);
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ email: email.toLowerCase() }).exec();
    } catch (error) {
      throw new InternalServerErrorException('Error finding user by email: ' + error.message);
    }
  }

  async findById(id: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findById(id).exec();
    } catch (error) {
      throw new InternalServerErrorException('Error finding user by ID: ' + error.message);
    }
  }

  async updateProfile(
    userId: string,
    name?: string,
    currentPassword?: string,
    newPassword?: string,
  ): Promise<UserDocument> {
    try {
      const updateData: any = {};
      if (name) {
        updateData.name = name;
      }

      if (currentPassword && newPassword) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
          throw new NotFoundException('User not found');
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          throw new BadRequestException('Current password is incorrect');
        }

        updateData.password = await bcrypt.hash(newPassword, 10);
      } else if (newPassword || currentPassword) {
        throw new BadRequestException('Both current and new password must be provided to update password');
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      ).exec();

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Profile update failed: ' + error.message);
    }
  }
}
