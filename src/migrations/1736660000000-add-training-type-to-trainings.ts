import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrainingTypeToTrainings1736660000000 implements MigrationInterface {
  name = 'AddTrainingTypeToTrainings1736660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;

    if (dbType === 'postgres') {
      await queryRunner.query(
        `DO $$ BEGIN
           CREATE TYPE training_type_enum AS ENUM ('Internal', 'External', 'Online', 'Internal In house');
         EXCEPTION
           WHEN duplicate_object THEN null;
         END $$;`,
      );

      await queryRunner.query(
        `ALTER TABLE "trainings"
         ADD COLUMN IF NOT EXISTS "trainingType" training_type_enum NOT NULL DEFAULT 'Internal'`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE trainings
         ADD COLUMN trainingType ENUM('Internal','External','Online','Internal In house') NOT NULL DEFAULT 'Internal'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;

    if (dbType === 'postgres') {
      await queryRunner.query(`ALTER TABLE "trainings" DROP COLUMN IF EXISTS "trainingType"`);
    } else {
      await queryRunner.query(`ALTER TABLE trainings DROP COLUMN trainingType`);
    }
  }
}
