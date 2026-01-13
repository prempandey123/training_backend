import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { DesignationSkillService } from './designation-skill.service';
import { CreateDesignationSkillDto } from './dto/create-designation-skill.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('designation-skills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DesignationSkillController {
  constructor(private readonly service: DesignationSkillService) {}

  // MAP SKILL TO DESIGNATION
  @Post()
  @Roles('ADMIN', 'HOD')
  create(@CurrentUser() user: any, @Body() dto: CreateDesignationSkillDto) {
    return this.service.create(user, dto);
  }

  // GET SKILLS FOR A DESIGNATION
  @Get('designation/:designationId')
  @Roles('ADMIN', 'HOD')
  findByDesignation(
    @CurrentUser() user: any,
    @Param('designationId', ParseIntPipe) designationId: number,
  ) {
    return this.service.findByDesignation(user, designationId);
  }

  // REMOVE SKILL FROM DESIGNATION
  @Delete(':id')
  @Roles('ADMIN', 'HOD')
  remove(@CurrentUser() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id);
  }
}
