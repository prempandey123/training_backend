import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuizTables1772850000000 implements MigrationInterface {
  name = 'AddQuizTables1772850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."quiz_questions_correctoption_enum" AS ENUM('A', 'B', 'C', 'D')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."quiz_attempts_status_enum" AS ENUM('STARTED', 'SUBMITTED')
    `);
    await queryRunner.query(`
      CREATE TABLE "quizzes" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "instructions" text,
        "isActive" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quizzes_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "quiz_questions" (
        "id" SERIAL NOT NULL,
        "questionText" text NOT NULL,
        "optionA" text NOT NULL,
        "optionB" text NOT NULL,
        "optionC" text NOT NULL,
        "optionD" text NOT NULL,
        "correctOption" "public"."quiz_questions_correctoption_enum" NOT NULL,
        "marks" integer NOT NULL DEFAULT 1,
        "sortOrder" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "quizId" integer,
        CONSTRAINT "PK_quiz_questions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "quiz_attempts" (
        "id" SERIAL NOT NULL,
        "employeeId" character varying NOT NULL,
        "employeeName" character varying NOT NULL,
        "departmentName" character varying,
        "designationName" character varying,
        "status" "public"."quiz_attempts_status_enum" NOT NULL DEFAULT 'STARTED',
        "answers" jsonb,
        "score" integer NOT NULL DEFAULT 0,
        "totalMarks" integer NOT NULL DEFAULT 0,
        "percentage" numeric(5,2) NOT NULL DEFAULT 0,
        "submittedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "quizId" integer,
        "userId" integer,
        CONSTRAINT "PK_quiz_attempts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "quiz_questions"
      ADD CONSTRAINT "FK_quiz_questions_quiz" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "quiz_attempts"
      ADD CONSTRAINT "FK_quiz_attempts_quiz" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "quiz_attempts"
      ADD CONSTRAINT "FK_quiz_attempts_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quiz_attempts" DROP CONSTRAINT "FK_quiz_attempts_user"`);
    await queryRunner.query(`ALTER TABLE "quiz_attempts" DROP CONSTRAINT "FK_quiz_attempts_quiz"`);
    await queryRunner.query(`ALTER TABLE "quiz_questions" DROP CONSTRAINT "FK_quiz_questions_quiz"`);
    await queryRunner.query(`DROP TABLE "quiz_attempts"`);
    await queryRunner.query(`DROP TABLE "quiz_questions"`);
    await queryRunner.query(`DROP TABLE "quizzes"`);
    await queryRunner.query(`DROP TYPE "public"."quiz_attempts_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."quiz_questions_correctoption_enum"`);
  }
}
