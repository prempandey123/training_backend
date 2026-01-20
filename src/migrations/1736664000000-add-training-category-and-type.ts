import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTrainingCategoryAndType1736664000000 implements MigrationInterface {
  name = 'AddTrainingCategoryAndType1736664000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums (PostgreSQL)
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE training_category_enum AS ENUM ('Worker', 'Staff', 'Both');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE training_session_type_enum AS ENUM ('Mandatory', 'Optional');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    );

    await queryRunner.addColumn(
      'trainings',
      new TableColumn({
        name: 'category',
        type: 'enum',
        enumName: 'training_category_enum',
        isNullable: false,
        default: `'Both'`,
      }),
    );

    await queryRunner.addColumn(
      'trainings',
      new TableColumn({
        name: 'type',
        type: 'enum',
        enumName: 'training_session_type_enum',
        isNullable: false,
        default: `'Mandatory'`,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('trainings', 'type');
    await queryRunner.dropColumn('trainings', 'category');
    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS training_session_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS training_category_enum`);
  }
}
