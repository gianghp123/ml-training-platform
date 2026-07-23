import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedBlockCatalog1783957264724 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "block_categories" ("id", "name") VALUES
            (uuid_generate_v4(), 'Data Source'),
            (uuid_generate_v4(), 'Preprocessing'),
            (uuid_generate_v4(), 'Data Split'),
            (uuid_generate_v4(), 'Model'),
            (uuid_generate_v4(), 'Evaluation'),
            (uuid_generate_v4(), 'Model Persistence')
        `);

    const cat = (name: string) => `(SELECT "id" FROM "block_categories" WHERE "name" = '${name}')`;

    await queryRunner.query(`
            INSERT INTO "block_definitions" ("id", "version", "status", "name", "category_id", "ports", "config_schema", "constraints", "output_transform", "created_at") VALUES
            (
                uuid_generate_v4(), 1, 'active', 'Load CSV', ${cat('Data Source')},
                '{"inputs":[],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"dataset","type":"DatasetSelector","format":"csv"}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$config.dataset","message":"A CSV dataset must be selected."}
                ]}',
                '{"declared":{"artifact":"Dataset","schema":{"columns":"unknown"},"role":"full"},"confirmProvider":"backend"}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Load JSON', ${cat('Data Source')},
                '{"inputs":[],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"dataset","type":"DatasetSelector","format":"json"}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$config.dataset","message":"A JSON dataset must be selected."}
                ]}',
                '{"declared":{"artifact":"Dataset","schema":{"columns":"unknown"},"role":"full"},"confirmProvider":"backend"}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Load XML', ${cat('Data Source')},
                '{"inputs":[],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"dataset","type":"DatasetSelector","format":"xml"}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$config.dataset","message":"An XML dataset must be selected."}
                ]}',
                '{"declared":{"artifact":"Dataset","schema":{"columns":"unknown"},"role":"full"},"confirmProvider":"backend"}',
                now()
            ),
            (
                uuid_generate_v4(), 3, 'active', 'Normalization', ${cat('Preprocessing')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"columns","type":"ColumnSelector","multiple":true,"semantic":["numeric"]},
                    {"id":"method","type":"Select","options":["MinMax","Standard","Robust"]}
                ]}',
                '{"selectedColumns":{"from":"$config.columns","mustExist":true,"semantic":["numeric"]}}',
                '{"declared":{"copyInput":true,"columnUpdates":[{"columns":"$config.columns","primitive":"float"}]}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Encoding', ${cat('Preprocessing')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"columns","type":"ColumnSelector","multiple":true,"semantic":["categorical"]},
                    {"id":"strategy","type":"Select","options":["OneHot","Label","Ordinal"]}
                ]}',
                '{"selectedColumns":{"from":"$config.columns","mustExist":true,"semantic":["categorical"]}}',
                '{"declared":{"copyInput":true,"columnUpdates":[{"columns":"$config.columns","primitive":"int","semantic":"numeric"}],"note":"OneHot may expand column count at runtime"}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Impute Missing Values', ${cat('Preprocessing')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"columns","type":"ColumnSelector","multiple":true},
                    {"id":"strategy","type":"Select","options":["Mean","Median","Mode","Constant"]},
                    {"id":"constantValue","type":"Text","showIf":{"strategy":"Constant"}}
                ]}',
                '{"selectedColumns":{"from":"$config.columns","mustExist":true},"rules":[
                    {"op":"exists","target":"$config.constantValue","condition":{"field":"strategy","equals":"Constant"},"message":"A constant value is required when strategy is Constant."}
                ]}',
                '{"declared":{"copyInput":true,"columnUpdates":[{"columns":"$config.columns","nullable":false}]}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Feature Selection', ${cat('Preprocessing')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"columns","type":"ColumnSelector","multiple":true}
                ]}',
                '{"selectedColumns":{"from":"$config.columns","mustExist":true},"rules":[
                    {"op":"subsetOf","left":["$input.dataset.schema.target"],"right":"$config.columns","message":"The target column must remain among the kept columns."}
                ]}',
                '{"declared":{"keepColumns":"$config.columns"}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Select Target', ${cat('Preprocessing')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"targetColumn","type":"ColumnSelector","multiple":false},
                    {"id":"task","type":"Select","options":["classification","regression","clustering"]}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$config.targetColumn","condition":{"field":"task","in":["classification","regression"]},"message":"A target column is required for classification and regression."},
                    {"op":"semantic","target":"$config.targetColumn","expected":["categorical"],"condition":{"field":"task","equals":"classification"},"message":"Classification requires a categorical target column."},
                    {"op":"semantic","target":"$config.targetColumn","expected":["numeric"],"condition":{"field":"task","equals":"regression"},"message":"Regression requires a numeric target column."}
                ]}',
                '{"declared":{"copyInput":true,"set":{"schema.target":"$config.targetColumn","task":"$config.task"}}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Rename Column', ${cat('Preprocessing')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"mapping","type":"KeyValueMap"}
                ]}',
                '{"rules":[
                    {"op":"subsetOf","left":"$config.mapping.keys","right":"$input.dataset.schema.columns.name","message":"Every renamed column must exist in the input schema."}
                ]}',
                '{"declared":{"renameColumns":"$config.mapping"}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Concat Features', ${cat('Preprocessing')},
                '{"inputs":[{"id":"datasetA","artifact":"Dataset"},{"id":"datasetB","artifact":"Dataset"}],"outputs":[{"id":"dataset","artifact":"Dataset"}]}',
                '{"fields":[]}',
                '{"rules":[
                    {"op":"rowCountMatches","targets":["$inputs.datasetA","$inputs.datasetB"]},
                    {"op":"disjoint","left":"$inputs.datasetA.schema.columns","right":"$inputs.datasetB.schema.columns","message":"Column names must not collide between the two datasets."}
                ]}',
                '{"declared":{"concatColumns":["$inputs.datasetA","$inputs.datasetB"]}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Train/Test Split', ${cat('Data Split')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"train","artifact":"Dataset"},{"id":"test","artifact":"Dataset"}]}',
                '{"fields":[
                    {"id":"testSize","type":"Number","min":0.05,"max":0.5,"default":0.2},
                    {"id":"stratify","type":"Boolean","default":true}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$input.dataset.schema.target","message":"Dataset must have a target column selected before splitting."}
                ]}',
                '{"ports":{"train":{"copyInput":true,"set":{"role":"train"}},"test":{"copyInput":true,"set":{"role":"test"}}}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Random Forest', ${cat('Model')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"model","artifact":"Model"}]}',
                '{"fields":[
                    {"id":"n_estimators","type":"Number","min":1,"default":100},
                    {"id":"max_depth","type":"Number","min":1,"default":10}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$input.dataset.schema.target","message":"Dataset must have a target column."},
                    {"op":"eq","left":"$input.dataset.role","right":"train","message":"Random Forest must be trained on a train-role dataset."},
                    {"op":"eq","left":"$input.dataset.task","right":["classification","regression"],"message":"Random Forest supports classification or regression, not clustering."}
                ]}',
                '{"declared":{"artifact":"Model","algorithm":"RandomForest","task":"$input.dataset.task","featureSchema":"$input.dataset.schema.columns","targetSchema":"$input.dataset.schema.target"}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Logistic Regression', ${cat('Model')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"model","artifact":"Model"}]}',
                '{"fields":[
                    {"id":"penalty","type":"Select","options":["l1","l2","none"],"default":"l2"},
                    {"id":"C","type":"Number","min":0.001,"default":1.0}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$input.dataset.schema.target","message":"Dataset must have a target column."},
                    {"op":"eq","left":"$input.dataset.role","right":"train","message":"Must be trained on a train-role dataset."},
                    {"op":"eq","left":"$input.dataset.task","right":"classification","message":"Logistic Regression only supports classification."}
                ]}',
                '{"declared":{"artifact":"Model","algorithm":"LogisticRegression","task":"classification","featureSchema":"$input.dataset.schema.columns","targetSchema":"$input.dataset.schema.target"}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'SVM', ${cat('Model')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"model","artifact":"Model"}]}',
                '{"fields":[
                    {"id":"kernel","type":"Select","options":["linear","rbf","poly"],"default":"rbf"},
                    {"id":"C","type":"Number","min":0.001,"default":1.0}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$input.dataset.schema.target","message":"Dataset must have a target column."},
                    {"op":"eq","left":"$input.dataset.role","right":"train","message":"Must be trained on a train-role dataset."},
                    {"op":"eq","left":"$input.dataset.task","right":["classification","regression"],"message":"SVM supports classification or regression."}
                ]}',
                '{"declared":{"artifact":"Model","algorithm":"SVM","task":"$input.dataset.task","featureSchema":"$input.dataset.schema.columns","targetSchema":"$input.dataset.schema.target"}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'K-Means', ${cat('Model')},
                '{"inputs":[{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"model","artifact":"Model"}]}',
                '{"fields":[
                    {"id":"n_clusters","type":"Number","min":2,"default":3}
                ]}',
                '{"rules":[
                    {"op":"eq","left":"$input.dataset.task","right":"clustering","message":"K-Means requires task: clustering."},
                    {"op":"lte","left":"$config.n_clusters","right":{"count":"$input.dataset.schema.columns","where":{}},"message":"n_clusters should not exceed the number of available columns."}
                ]}',
                '{"declared":{"artifact":"Model","algorithm":"KMeans","task":"clustering","featureSchema":"$input.dataset.schema.columns"}}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Evaluation', ${cat('Evaluation')},
                '{"inputs":[{"id":"model","artifact":"Model"},{"id":"dataset","artifact":"Dataset"}],"outputs":[{"id":"metrics","artifact":"Metrics"}]}',
                '{"fields":[
                    {"id":"metrics","type":"MultiSelect","optionsFrom":"$input.model.task","optionsMap":{"classification":["accuracy","precision","recall","f1","confusionMatrix"],"regression":["mae","mse","rmse","r2"],"clustering":["silhouette","inertia"]}}
                ]}',
                '{"rules":[
                    {"op":"eq","left":"$input.dataset.role","right":"test","message":"Evaluation should run against a test-role dataset, not the training data."},
                    {"op":"eq","left":"$input.model.task","right":"$input.dataset.task","message":"Model and dataset task types must match."},
                    {"op":"subsetOf","left":"$input.model.featureSchema","right":"$input.dataset.schema.columns","message":"The dataset must contain every feature column the model was trained on."}
                ]}',
                '{"declared":{"artifact":"Metrics","task":"$input.model.task","metrics":"unknown"},"confirmProvider":"backend"}',
                now()
            ),
            (
                uuid_generate_v4(), 1, 'active', 'Save Model', ${cat('Model Persistence')},
                '{"inputs":[{"id":"model","artifact":"Model"}],"outputs":[{"id":"savedModel","artifact":"SavedModel"}]}',
                '{"fields":[
                    {"id":"format","type":"Select","options":["joblib","pickle","onnx"],"default":"joblib"},
                    {"id":"name","type":"Text","placeholder":"e.g. churn-model-v1"}
                ]}',
                '{"rules":[
                    {"op":"exists","target":"$config.name","message":"A name is required to save the model."},
                    {"op":"eq","left":"$config.format","right":"onnx","negate":true,"condition":{"field":"$input.model.algorithm","in":["KMeans"]},"message":"ONNX export is not yet supported for clustering models.","severity":"warning"}
                ]}',
                '{"declared":{"artifact":"SavedModel","format":"$config.format","sourceModel":{"algorithm":"$input.model.algorithm","task":"$input.model.task"},"location":{"type":"objectStorage","reference":"unknown"}},"confirmProvider":"backend"}',
                now()
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "block_definitions"`);
    await queryRunner.query(`DELETE FROM "block_categories"`);
  }
}
