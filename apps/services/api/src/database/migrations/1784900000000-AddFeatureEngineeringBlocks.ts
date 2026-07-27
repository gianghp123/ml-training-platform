import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeatureEngineeringBlocks1784900000000
  implements MigrationInterface
{
  name = "AddFeatureEngineeringBlocks1784900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cat = (name: string) =>
      `(SELECT "id" FROM "block_categories" WHERE "name" = '${name}')`;

    await queryRunner.query(`
      INSERT INTO "block_definitions" (
        "id", "version", "status", "executor_key", "name", "category_id",
        "ports", "config_schema", "constraints", "output_transform", "created_at"
      ) VALUES
      (
        uuid_generate_v4(), 1, 'active', 'filter_rows', 'Filter Rows', ${cat("Preprocessing")},
        '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
        '{"fields":[
          {"id":"conditions","type":"ConditionList","ops":["eq","ne","gt","gte","lt","lte","contains","isNull","isNotNull","in"]},
          {"id":"combinator","type":"Select","options":["AND","OR"],"default":"AND"},
          {"id":"invert","type":"Boolean","default":false}
        ]}',
        '{}',
        '{"declared":{"copyInput":true}}',
        now()
      ),
      (
        uuid_generate_v4(), 1, 'active', 'custom_feature_formula', 'Custom Feature Formula', ${cat("Preprocessing")},
        '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
        '{"fields":[
          {"id":"outputColumn","type":"Text"},
          {"id":"outputType","type":"Select","options":["float","int","boolean"],"default":"float"},
          {"id":"expression","type":"Expression"}
        ]}',
        '{}',
        '{"declared":{"copyInput":true,"addColumns":[{"name":"$config.outputColumn","primitive":"$config.outputType"}]}}',
        now()
      ),
      (
        uuid_generate_v4(), 1, 'active', 'join_datasets', 'Join Datasets', ${cat("Preprocessing")},
        '{"inputs":[{"id":"left","artifact":"Dataset"},{"id":"right","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
        '{"fields":[
          {"id":"keys","type":"ColumnSelector","multiple":true},
          {"id":"strategy","type":"Select","options":["inner","left","right","full"],"default":"inner"}
        ]}',
        '{"rules":[
          {"op":"exists","target":"$config.keys","message":"At least one join key is required."},
          {"op":"columnsExist","columns":"$config.keys","inputs":["$input.left","$input.right"],"message":"Every join key must exist in both input datasets."},
          {"op":"disjoint","left":"$input.left","right":"$input.right","exclude":"$config.keys","message":"Non-key columns must not collide. Rename them before joining."}
        ]}',
        '{"declared":{"joinColumns":{"left":"$input.left","right":"$input.right","keys":"$config.keys"}}}',
        now()
      ),
      (
        uuid_generate_v4(), 1, 'active', 'feature_union', 'Feature Union', ${cat("Preprocessing")},
        '{"inputs":[
          {"id":"datasetA","artifact":"Dataset"},
          {"id":"datasetB","artifact":"Dataset"},
          {"id":"datasetC","artifact":"Dataset","optional":true},
          {"id":"datasetD","artifact":"Dataset","optional":true}
        ],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
        '{"fields":[]}',
        '{"rules":[
          {"op":"rowCountMatches","targets":["$inputs.datasetA","$inputs.datasetB","$inputs.datasetC","$inputs.datasetD"],"message":"All feature branches must have the same number of rows."},
          {"op":"disjoint","targets":["$inputs.datasetA","$inputs.datasetB","$inputs.datasetC","$inputs.datasetD"],"message":"Column names must be unique across all feature branches."}
        ]}',
        '{"declared":{"concatColumns":["$inputs.datasetA","$inputs.datasetB","$inputs.datasetC","$inputs.datasetD"]}}',
        now()
      )
    `);

    await queryRunner.query(`
      UPDATE "block_definitions"
      SET "status" = 'deprecated'
      WHERE "executor_key" = 'concat_features'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "block_definitions"
      SET "status" = 'active'
      WHERE "executor_key" = 'concat_features'
    `);
    await queryRunner.query(`
      DELETE FROM "block_definitions"
      WHERE "executor_key" IN ('filter_rows', 'custom_feature_formula', 'join_datasets', 'feature_union')
    `);
  }
}
