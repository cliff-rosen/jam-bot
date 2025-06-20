"""
Centralised Tool Registry (moved to *backend/tools*).

This module owns the global *TOOL_REGISTRY* instance and all helper utilities
for loading, refreshing and querying tool definitions.

It was migrated from *schemas/tool_registry.py* to this location so that all
runtime-facing code can simply use the canonical import path
`tools.tool_registry`.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

# NOTE: We import inside functions (rather than at module top-level) to avoid
# circular import issues between this module and *schemas/tools.py* (which
# still contains the dataclasses for ToolDefinition etc.).

# ---------------------------------------------------------------------------
# Global registry – keeps all ToolDefinition objects keyed by their tool_id
# ---------------------------------------------------------------------------
TOOL_REGISTRY: Dict[str, "ToolDefinition"] = {}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_tools_json(tools_data: Dict[str, Any]) -> Dict[str, "ToolDefinition"]:
    """Parse the JSON definition of all tools into ToolDefinition objects."""
    from schemas.tool import ToolDefinition, ToolParameter, ToolOutput
    from schemas.base import SchemaType
    from schemas.resource import Resource

    tool_registry: Dict[str, ToolDefinition] = {}

    for tool_def_json in tools_data.get("tools", []):
        try:
            if "id" not in tool_def_json:
                tool_name_for_error = tool_def_json.get("name", "Unknown tool without ID")
                print(
                    f"Warning: Tool definition for '{tool_name_for_error}' is missing the required 'id' field in tools.json. Skipping this tool."
                )
                continue

            tool_id = tool_def_json["id"]

            # ------------------------------------------------------------------
            # Parameters
            # ------------------------------------------------------------------
            parameters: List[ToolParameter] = []
            if "parameters" in tool_def_json:
                for param_def in tool_def_json["parameters"]:
                    param_schema_dict = param_def.get("schema", {})
                    if "type" not in param_schema_dict:
                        param_schema_dict["type"] = "object"
                    
                    schema_type = SchemaType(**param_schema_dict)
                    
                    parameters.append(
                        ToolParameter(
                            id=param_def.get("name", ""),
                            name=param_def.get("name", ""),
                            description=param_def.get("description", ""),
                            required=param_def.get("required", True),
                            schema=schema_type,
                        )
                    )
            elif "input_schema" in tool_def_json:
                # Legacy format support
                input_schema = tool_def_json["input_schema"]
                if "properties" in input_schema:
                    for param_name, param_schema in input_schema["properties"].items():
                        schema_type = SchemaType(**param_schema)
                        parameters.append(
                            ToolParameter(
                                id=param_name,
                                name=param_name,
                                description=param_schema.get("description", ""),
                                schema=schema_type,
                                required=param_name in input_schema.get("required", []),
                            )
                        )

            # ------------------------------------------------------------------
            # Outputs
            # ------------------------------------------------------------------
            outputs: List[ToolOutput] = []
            if "outputs" in tool_def_json:
                for output_def in tool_def_json["outputs"]:
                    output_schema_dict = output_def.get("schema", {})
                    if "type" not in output_schema_dict:
                        output_schema_dict["type"] = "object"
                    
                    schema_type = SchemaType(**output_schema_dict)
                    outputs.append(
                        ToolOutput(
                            id=output_def["name"],
                            name=output_def["name"],
                            description=output_def.get("description", ""),
                            required=output_def.get("required", True),
                            schema=schema_type,
                        )
                    )
            elif "output_schema" in tool_def_json:
                # Legacy format support
                for output_def in tool_def_json["output_schema"]:
                    output_name = output_def.get("name")
                    if output_name:
                        output_schema_dict = output_def.get("schema", {})
                        schema_type = SchemaType(**output_schema_dict)
                        outputs.append(
                            ToolOutput(
                                id=output_name,
                                name=output_name,
                                description=output_def.get("description", ""),
                                schema=schema_type,
                            )
                        )

            # ------------------------------------------------------------------
            # Resource Dependencies
            # ------------------------------------------------------------------
            resource_dependencies: List[Resource] = []
            if "resource_dependencies" in tool_def_json:
                for resource_def in tool_def_json["resource_dependencies"]:
                    resource_dependencies.append(Resource(**resource_def))

            # ------------------------------------------------------------------
            # Assemble the ToolDefinition
            # ------------------------------------------------------------------
            tool_definition = ToolDefinition(
                id=tool_id,
                name=tool_def_json["name"],
                description=tool_def_json["description"],
                parameters=parameters,
                outputs=outputs,
                category=tool_def_json.get("category", "other"),
                examples=tool_def_json.get("examples"),
                resource_dependencies=resource_dependencies,
            )

            if tool_definition.id in tool_registry:
                print(
                    f"Warning: Duplicate tool ID '{tool_definition.id}' found in tools.json. Overwriting previous definition."
                )
            tool_registry[tool_definition.id] = tool_definition

        except Exception as exc:
            tool_name_for_error = tool_def_json.get("name", tool_def_json.get("id", "unknown tool"))
            print(f"Error parsing tool definition for '{tool_name_for_error}': {exc}")
            import traceback

            print(f"Traceback: {traceback.format_exc()}")

    return tool_registry

def _default_tools_json_path() -> str:
    """Return the path to *tools.json* – first look in this package, then fallback to schemas."""
    local_path = os.path.join(os.path.dirname(__file__), "tools.json")
    if os.path.exists(local_path):
        return local_path

    # Fallback to original location to preserve compatibility until file is moved
    return os.path.join(os.path.dirname(__file__), "..", "schemas", "tools.json")


def load_tools_from_file() -> Dict[str, "ToolDefinition"]:
    """Load tool definitions from *tools.json*."""
    file_path = _default_tools_json_path()
    try:
        print(f"Loading tools from {file_path}")
        with open(file_path, "r", encoding="utf-8") as f:
            tools_data = json.load(f)
        return _parse_tools_json(tools_data)
    except FileNotFoundError:
        print(f"Tool definitions file not found: {file_path}")
        return {}
    except json.JSONDecodeError as exc:
        print(f"Error parsing tools.json: {exc}")
        return {}
    except Exception as exc:  # pragma: no cover
        print(f"Error loading tool definitions: {exc}")
        import traceback

        print(f"Traceback: {traceback.format_exc()}")
        return {}


def refresh_tool_registry() -> None:
    """Refresh the in-memory registry by re-reading *tools.json*."""
    global TOOL_REGISTRY
    print("Refreshing tool registry…")
    TOOL_REGISTRY = load_tools_from_file()
    print(f"Loaded {len(TOOL_REGISTRY)} tool definitions, keyed by tool_id.")


def get_available_tools() -> List[str]:
    """Return a list of all loaded *tool_id*s."""
    return list(TOOL_REGISTRY.keys())


def get_tools_by_category() -> Dict[str, List[str]]:
    """Group tool IDs by their declared *category*."""
    categories: Dict[str, List[str]] = {}
    for tool_id, tool_def in TOOL_REGISTRY.items():
        categories.setdefault(tool_def.category, []).append(tool_id)
    return categories


def get_tool_definition(tool_id: str) -> Optional["ToolDefinition"]:
    """Return the *ToolDefinition* for *tool_id* if it exists."""
    return TOOL_REGISTRY.get(tool_id)


def register_tool_handler(tool_id: str, handler: "ToolExecutionHandler") -> None:
    """Attach an execution *handler* to an already-defined tool."""
    from schemas.tool_handler_schema import ToolExecutionHandler

    print(f"Registering tool handler for {tool_id}")
    if tool_id not in TOOL_REGISTRY:
        raise ValueError(f"No tool definition found for {tool_id}")
    TOOL_REGISTRY[tool_id].execution_handler = handler


# ---------------------------------------------------------------------------
# Automatically load the registry at import time, mirroring old behaviour
# ---------------------------------------------------------------------------
try:
    refresh_tool_registry()
except Exception as exc:  # pragma: no cover
    print(f"Failed to load tools on import: {exc}")
    TOOL_REGISTRY = {} 