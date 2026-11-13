# QA fixtures

`unsupported-schema-bundles.json` is a vendored briefing record with `schema_version` `9.9.9`. The app must leave it unread and answer `GET /api/analyses/bnd_schema_999` and `/analysis/bnd_schema_999/report` with HTTP 422. It is not created through `POST /api/analyses`. A human-readable copy also lives at `/workspace/openframe-app/qa-fixtures/bnd_schema_999.json` on the shared box.
