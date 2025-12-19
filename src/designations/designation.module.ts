import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Designation } from './designation.entity';
import { Department } from '../departments/department.entity';
import { DesignationService } from './designation.service';
import { DesignationController } from './designation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Designation, Department])],
  controllers: [DesignationController],
  providers: [DesignationService],
  exports: [DesignationService], // 🔥 used later by Skill Matrix
})
export class DesignationModule {}
