INSERT INTO assets (
    id,
    name,
    description,
    type,
    subtype,
    is_collection,
    collection_type,
    content,
    asset_metadata,
    db_entity_metadata,
    user_id
) VALUES (
    UUID(),  -- This will generate a new UUID
    'Newsletter Collection',
    'Collection of all newsletters up to ID 264',
    'database_entity',
    'newsletter',
    TRUE,
    'array',
    NULL,  -- Content will be fetched on demand
    '{}',  -- Empty JSON object for asset_metadata
    '{
        "table_name": "newsletters",
        "query_type": "list",
        "query_params": {
            "id": {"operator": "<=", "value": 264}
        },
        "columns": [
            "id",
            "source_name",
            "issue_identifier",
            "email_date",
            "subject_line",
            "processed_status",
            "import_date"
        ],
        "is_direct_content": false
    }',
    1  -- Assuming user_id 1 exists, adjust as needed
); 