import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Lightweight schema guard.
 * Many environments keep TYPEORM synchronize/migrations OFF, so newly added
 * columns can be missing in existing databases.
 */
@Injectable()
export class TrainingSchema implements OnModuleInit {
  private readonly logger = new Logger(TrainingSchema.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    // Ensure cancelRemark column exists (required for CANCELLED status remarks)
    try {
      await this.dataSource.query(
        'ALTER TABLE "trainings" ADD COLUMN IF NOT EXISTS "cancelRemark" character varying(500)',
      );
    } catch (e: any) {
      // Don't crash the app on boot; log for visibility.
      this.logger.warn(
        `Failed to ensure trainings.cancelRemark column. Enable TYPEORM_SYNC=true or run migrations. Error: ${
          e?.message ?? e
        }`,
      );
    }
  }
}
