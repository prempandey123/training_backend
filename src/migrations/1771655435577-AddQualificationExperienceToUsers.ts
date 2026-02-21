import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQualificationExperienceToUsers1771655435577 implements MigrationInterface {
    name = 'AddQualificationExperienceToUsers1771655435577'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."annual_training_calendar_code_name_uq"`);
        await queryRunner.query(`ALTER TABLE "trainings" DROP COLUMN "trainingCode"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "qualification" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "experience" character varying`);
        await queryRunner.query(`ALTER TABLE "annual_training_calendar" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "annual_training_calendar" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "annual_training_calendar" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "annual_training_calendar" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2786871e36dc244f209bb5408c" ON "annual_training_calendar" ("trainingProgrammeCode", "programmeName") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2786871e36dc244f209bb5408c"`);
        await queryRunner.query(`ALTER TABLE "annual_training_calendar" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "annual_training_calendar" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "annual_training_calendar" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "annual_training_calendar" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "experience"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "qualification"`);
        await queryRunner.query(`ALTER TABLE "trainings" ADD "trainingCode" character varying(30)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "annual_training_calendar_code_name_uq" ON "annual_training_calendar" ("trainingProgrammeCode", "programmeName") `);
    }

}
