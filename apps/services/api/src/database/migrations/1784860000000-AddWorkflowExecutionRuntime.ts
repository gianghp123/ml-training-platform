import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkflowExecutionRuntime1784860000000
  implements MigrationInterface
{
  name = 'AddWorkflowExecutionRuntime1784860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "block_definitions"
      ADD COLUMN "executor_key" character varying
    `);

    await queryRunner.query(`
      UPDATE "block_definitions"
      SET "executor_key" = CASE "name"
        WHEN 'Load CSV' THEN 'load_csv'
        WHEN 'Load JSON' THEN 'load_json'
        WHEN 'Load XML' THEN 'load_xml'
        WHEN 'Normalization' THEN 'normalize'
        WHEN 'Encoding' THEN 'encode'
        WHEN 'Impute Missing Values' THEN 'impute_missing'
        WHEN 'Feature Selection' THEN 'feature_select'
        WHEN 'Select Target' THEN 'select_target'
        WHEN 'Rename Column' THEN 'rename_columns'
        WHEN 'Concat Features' THEN 'concat_features'
        WHEN 'Train/Test Split' THEN 'train_test_split'
        WHEN 'Random Forest' THEN 'random_forest'
        WHEN 'Logistic Regression' THEN 'logistic_regression'
        WHEN 'SVM' THEN 'svm'
        WHEN 'K-Means' THEN 'kmeans'
        WHEN 'Evaluation' THEN 'evaluate'
        WHEN 'Save Model' THEN 'save_model'
        ELSE 'custom_' || replace("id"::text, '-', '')
      END
    `);

    await queryRunner.query(`
      ALTER TABLE "block_definitions"
      ALTER COLUMN "executor_key" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "block_definitions"
      ADD CONSTRAINT "UQ_block_definition_executor_version"
      UNIQUE ("executor_key", "version")
    `);

    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      ALTER COLUMN "workflow_version_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      ALTER COLUMN "dataset_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      ADD COLUMN "graph_snapshot" jsonb NOT NULL
      DEFAULT '{"nodes":[],"edges":[]}'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      ALTER COLUMN "graph_snapshot" DROP DEFAULT
    `);

    await queryRunner.query(`
      CREATE TABLE "workflow_run_datasets" (
        "run_id" uuid NOT NULL,
        "dataset_id" uuid NOT NULL,
        CONSTRAINT "PK_workflow_run_datasets"
          PRIMARY KEY ("run_id", "dataset_id"),
        CONSTRAINT "FK_workflow_run_datasets_run"
          FOREIGN KEY ("run_id") REFERENCES "workflow_runs"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_workflow_run_datasets_dataset"
          FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_run_datasets_dataset"
      ON "workflow_run_datasets" ("dataset_id")
    `);

    await queryRunner.query(`
      INSERT INTO "workflow_run_datasets" ("run_id", "dataset_id")
      SELECT "id", "dataset_id"
      FROM "workflow_runs"
      WHERE "dataset_id" IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "node_executions"
      ADD COLUMN "error_message" text
    `);
    await queryRunner.query(`
      ALTER TABLE "node_executions"
      ADD COLUMN "output_summary" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "node_executions"
      DROP COLUMN "output_summary"
    `);
    await queryRunner.query(`
      ALTER TABLE "node_executions"
      DROP COLUMN "error_message"
    `);

    await queryRunner.query(`DROP INDEX "IDX_workflow_run_datasets_dataset"`);
    await queryRunner.query(`DROP TABLE "workflow_run_datasets"`);

    await queryRunner.query(`
      DELETE FROM "workflow_runs"
      WHERE "workflow_version_id" IS NULL OR "dataset_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      DROP COLUMN "graph_snapshot"
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      ALTER COLUMN "dataset_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
      ALTER COLUMN "workflow_version_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "block_definitions"
      DROP CONSTRAINT "UQ_block_definition_executor_version"
    `);
    await queryRunner.query(`
      ALTER TABLE "block_definitions"
      DROP COLUMN "executor_key"
    `);
  }
}
