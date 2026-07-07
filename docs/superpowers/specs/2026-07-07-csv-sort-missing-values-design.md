# CSV Sort and Missing-Value Configuration Design

## Scope

Extend the existing `LoadCsvExcel` block with flat configuration fields for sorting loaded rows and handling missing values. This change covers the builder block schema only; the repository does not currently contain a worker that executes these transformations.

## Configuration

Add these fields to `LoadCsvExcel.configSchema` after `skip_cols`:

- `sort_columns`: a textarea containing column names in priority order. An empty value disables sorting.
- `sort_order`: a select with `ascending` and `descending`; default `ascending`.
- `missing_strategy`: a select with `none`, `drop_rows`, `drop_columns`, `fill_mean`, `fill_median`, `fill_mode`, and `fill_constant`; default `none`.
- `missing_target_columns`: a textarea containing columns to process. An empty value means all columns.
- `missing_fill_value`: a text field used when `missing_strategy` is `fill_constant`.

Column-list fields follow the existing textarea convention used by `expected_columns` and `skip_cols`. Conditional field visibility is out of scope because the current field schema and renderer do not express dependencies between fields.

## Data Flow

The builder renders the fields from `configSchema` and persists their values with the workflow node configuration. A future CSV worker will read the file, remove `skip_cols`, handle missing values, and then sort the resulting rows using `sort_columns` and `sort_order`.

## Validation and Errors

`sort_order` and `missing_strategy` use fixed select options, preventing unsupported values from the UI. Runtime validation for unknown columns, incompatible fill strategies, and invalid constant values belongs to the future worker and is not part of this schema-only change.

## Testing

Add a focused Node test that imports `LoadCsvExcel` and verifies:

- all five fields exist;
- select defaults are stable;
- sort and missing-value options expose the agreed machine-readable values;
- existing user changes that removed `quote_char` and `null_values` remain untouched.

Run the focused test, the web test suite, and TypeScript type checking before completion.
