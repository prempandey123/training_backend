import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Lightweight safety net: ensures the annual_training_calendar table exists.
 *
 * Why: many environments keep TypeORM synchronize/migrations OFF, so a new entity
 * can cause runtime errors like: QueryFailedError: relation "annual_training_calendar" does not exist.
 *
 * This is idempotent (CREATE TABLE IF NOT EXISTS) and only runs for Postgres.
 * For production, you can still prefer migrations.
 */
@Injectable()
export class AnnualTrainingCalendarSchemaService implements OnModuleInit {
  private readonly logger = new Logger(AnnualTrainingCalendarSchemaService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    const dbType = (this.dataSource.options as any)?.type;
    if (dbType !== 'postgres') {
      this.logger.debug(`Skipping schema ensure; DB type is '${dbType}'.`);
      return;
    }

    // NOTE: keep names/constraints aligned with AnnualTrainingCalendar entity
    const ddl = `
      CREATE TABLE IF NOT EXISTS annual_training_calendar (
        id SERIAL PRIMARY KEY,
        "srNo" integer NULL,
        "trainingProgrammeCode" varchar(30) NOT NULL,
        "programmeName" varchar(500) NOT NULL,
        "modeOfSession" varchar(50) NULL,
        "facultyName" varchar(500) NULL,
        "participants" varchar(500) NULL,
        "department" varchar(500) NULL,
        "apr25" integer NOT NULL DEFAULT 0,
        "may25" integer NOT NULL DEFAULT 0,
        "jun25" integer NOT NULL DEFAULT 0,
        "jul25" integer NOT NULL DEFAULT 0,
        "aug25" integer NOT NULL DEFAULT 0,
        "sep25" integer NOT NULL DEFAULT 0,
        "oct25" integer NOT NULL DEFAULT 0,
        "nov25" integer NOT NULL DEFAULT 0,
        "dec25" integer NOT NULL DEFAULT 0,
        "jan26" integer NOT NULL DEFAULT 0,
        "feb26" integer NOT NULL DEFAULT 0,
        "mar26" integer NOT NULL DEFAULT 0,
        "totalSessions" integer NOT NULL DEFAULT 0,
        "overallSessions" integer NOT NULL DEFAULT 0,
        "academicYear" varchar(20) NOT NULL DEFAULT '2025-26',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `;

    const idx = `
      CREATE UNIQUE INDEX IF NOT EXISTS annual_training_calendar_code_name_uq
      ON annual_training_calendar ("trainingProgrammeCode", "programmeName");
    `;

    try {
      await this.dataSource.query(ddl);
      await this.dataSource.query(idx);
      this.logger.log('Ensured annual_training_calendar table exists.');
    } catch (e: any) {
      // Don't crash app startup if ensure fails; surface actionable log.
      this.logger.error(
        `Failed to ensure annual_training_calendar table. Create it via migrations or enable TYPEORM_SYNC=true. Error: ${e?.message ?? e}`,
      );
    }
  }
}
