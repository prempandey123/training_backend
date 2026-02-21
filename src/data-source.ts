import 'dotenv/config';
import { DataSource } from 'typeorm';

// This DataSource is used by the TypeORM CLI for migrations.
// It reads the same env vars as app.module.ts.
const AppDataSource = new DataSource({
  type: ((process.env.DB_TYPE as any) ?? 'postgres') as any,
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'training',
  // When running via ts-node (typeorm-ts-node-commonjs), __dirname points to src
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // Keep off; run migrations instead
  synchronize: false,
});

export default AppDataSource;
