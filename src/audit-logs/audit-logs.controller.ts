import { Controller, Get, Post, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('userId') userId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.service.list({
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
      userId: userId ? Number(userId) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
    });
  }

  // For quick dashboard testing
  @Post('generate-sample')
  async generateSample(@Query('count') count?: string) {
    return this.service.generateSample(count ? Number(count) : 20);
  }
}
