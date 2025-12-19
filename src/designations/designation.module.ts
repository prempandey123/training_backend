import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Designation } from './designation.entity';
import { DesignationService } from './designation.service';
import { DesignationController } from './designation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Designation])],
  controllers: [DesignationController],
  providers: [DesignationService],
})
export class DesignationModule {}
