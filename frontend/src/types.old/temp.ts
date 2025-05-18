import { PromptTemplate } from "./prompts";
import { Schema, Variable } from "./schema";

const outputSchema: Schema = {
    "type": "object",
    "is_array": false,
    "description": "Default output",
    "fields": {
        "name": {
            "type": "string",
            "is_array": false,
            "description": ""
        },
        "phone": {
            "type": "string",
            "is_array": false,
            "description": ""
        },
        "email": {
            "type": "string",
            "is_array": false,
            "description": ""
        }
    }
}

const parameters: Variable[] = [
    {
        "name": "input",
        "description": "The input to echo",
        "schema": inputSchema
    }
]

const outputs: Variable[] = [
    {
        "name": "output",
        "description": "The echoed output",
        "schema": outputSchema
    }
]

const promptTemplate: PromptTemplate = {
    "name": "echo",
    "description": "Echo the input",
    "user_message_template": "Echo the input: {{input}}",
    "system_message_template": "",
    "tokens": parameters,
    "output_schema": outputSchema
}
