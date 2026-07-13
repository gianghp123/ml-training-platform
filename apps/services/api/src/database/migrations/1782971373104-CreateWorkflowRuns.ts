import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkflowRuns1782971373104 implements MigrationInterface {
    name = 'CreateWorkflowRuns1782971373104'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "workflow_runs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "workflow_version_id" uuid NOT NULL,
                "dataset_id" uuid NOT NULL,
                "status" character varying NOT NULL DEFAULT 'pending',
                "started_at" TIMESTAMP WITH TIME ZONE,
                "finished_at" TIMESTAMP WITH TIME ZONE,
                "user_id" character varying NOT NULL,
                CONSTRAINT "PK_workflow_runs" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_runs" 
            ADD CONSTRAINT "FK_workflow_runs_workflow_version" 
            FOREIGN KEY ("workflow_version_id") REFERENCES "workflow_versions"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "workflow_runs" 
            ADD CONSTRAINT "FK_workflow_runs_dataset" 
            FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workflow_runs" DROP CONSTRAINT "FK_workflow_runs_dataset"`);
        await queryRunner.query(`ALTER TABLE "workflow_runs" DROP CONSTRAINT "FK_workflow_runs_workflow_version"`);
        await queryRunner.query(`DROP TABLE "workflow_runs"`);
    }
}
