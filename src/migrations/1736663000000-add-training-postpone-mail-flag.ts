import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrainingPostponeMailFlag1736663000000 implements MigrationInterface {
  name = 'AddTrainingPostponeMailFlag1736663000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trainings" ADD COLUMN IF NOT EXISTS "mailSentOnPostpone" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trainings" DROP COLUMN IF EXISTS "mailSentOnPostpone"`,
    );
  }
}
