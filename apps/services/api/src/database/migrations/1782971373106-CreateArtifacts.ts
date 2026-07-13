import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateArtifacts1782971373106 implements MigrationInterface {
    name = 'CreateArtifacts1782971373106'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "artifacts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workflow_run_id" uuid NOT NULL,
                "node_execution_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "artifact_type" character varying NOT NULL,
                "mime_type" character varying NOT NULL,
                "storage_uri" character varying NOT NULL,
                "metadata" jsonb,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_artifacts" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "artifacts" 
            ADD CONSTRAINT "FK_artifacts_workflow_run" 
            FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "artifacts" 
            ADD CONSTRAINT "FK_artifacts_node_execution" 
            FOREIGN KEY ("node_execution_id") REFERENCES "node_executions"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "artifacts" DROP CONSTRAINT "FK_artifacts_node_execution"`);
        await queryRunner.query(`ALTER TABLE "artifacts" DROP CONSTRAINT "FK_artifacts_workflow_run"`);
        await queryRunner.query(`DROP TABLE "artifacts"`);
    }
}
