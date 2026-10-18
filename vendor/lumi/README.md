# Lumi additions

Topics in `additions.json` are written for Lumi. They are not part of the Marble Skill Taxonomy.

They use the same fields Lumi teaches from (name, description, age range, evidence, assessment prompt, type, subject, domain) plus prerequisite edges. Ids start with `lumi_`.

`npm run prepare-data` merges them into the runtime taxonomy. Marble files in `vendor/marble/` are left unchanged.
