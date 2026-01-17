import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTrainingVenue1736662000000 implements MigrationInterface {
  name = 'AddTrainingVenue1736662000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'trainings',
      new TableColumn({
        name: 'venue',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('trainings', 'venue');
  }
}
