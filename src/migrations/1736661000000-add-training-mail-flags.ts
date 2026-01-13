import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrainingMailFlags1736661000000 implements MigrationInterface {
  name = 'AddTrainingMailFlags1736661000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trainings" ADD COLUMN IF NOT EXISTS "mailSentOnCreate" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "trainings" ADD COLUMN IF NOT EXISTS "mailSent1DayBefore" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "trainings" ADD COLUMN IF NOT EXISTS "mailSent1HourBefore" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trainings" DROP COLUMN IF EXISTS "mailSent1HourBefore"`);
    await queryRunner.query(`ALTER TABLE "trainings" DROP COLUMN IF EXISTS "mailSent1DayBefore"`);
    await queryRunner.query(`ALTER TABLE "trainings" DROP COLUMN IF EXISTS "mailSentOnCreate"`);
  }
}
