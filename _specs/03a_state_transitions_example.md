# State Transitions Examples

This document provides concrete examples for each state transition, showing exactly what entities are created/updated according to the rules in documents 02 and 03.

## State Transition List

1. **PROPOSE_MISSION** - Agent completes mission planning
2. **ACCEPT_MISSION** - User clicks "Approve Mission" button  
3. **START_HOP_PLAN** - User requests hop planning via chat
4. **PROPOSE_HOP_PLAN** - Agent completes hop design
5. **ACCEPT_HOP_PLAN** - User clicks "Accept Hop Plan" button
6. **START_HOP_IMPL** - User requests implementation via chat
7. **PROPOSE_HOP_IMPL** - Agent completes implementation design
8. **ACCEPT_HOP_IMPL** - User clicks "Accept Implementation" button
9. **EXECUTE_HOP** - User clicks "Start Execution" button
10. **COMPLETE_TOOL_STEP** - Tool execution completes (or simulated)
11. **COMPLETE_HOP** - All tool steps completed
12. **COMPLETE_MISSION** - Manual mission completion

---

## 1. PROPOSE_MISSION - Complete Example

### Input Data
```python
# Example mission data from agent
mission_data = {
    "name": "Analyze Customer Feedback Trends",
    "description": "Analyze customer feedback data to identify trends and create actionable insights",
    "goal": "Generate comprehensive analysis report with recommendations",
    "success_criteria": [
        "Process all customer feedback data from Q4 2024",
        "Identify top 5 trending issues and opportunities", 
        "Create executive summary with actionable recommendations"
    ],
    "mission_metadata": {
        "estimated_duration": "2-3 hours",
        "complexity": "medium",
        "data_sources": ["customer_feedback_db", "survey_results"]
    },
    "mission_state": {
        "input_dataset": {
            "name": "Customer Feedback Dataset",
            "description": "Raw customer feedback data from Q4 2024",
            "schema_definition": {
                "type": "dataset",
                "format": "csv",
                "columns": ["date", "customer_id", "feedback_text", "rating", "category"]
            },
            "role": "input",
            "content": {
                "file_path": "/data/customer_feedback_q4_2024.csv",
                "row_count": 15420,
                "size_mb": 12.3
            }
        },
        "analysis_report": {
            "name": "Customer Feedback Analysis Report",
            "description": "Comprehensive analysis report with trends and recommendations",
            "schema_definition": {
                "type": "document",
                "format": "markdown",
                "sections": ["executive_summary", "trend_analysis", "recommendations"]
            },
            "role": "output",
            "content": ""  # Empty initially, will be populated during execution
        }
    }
}

# Context
user_id = 123
active_session_id = "session_abc123"
```

### Database Entities Created

#### 1. Mission Entity
| id | name | status | current_hop_id |
|---|---|---|---|
| mission_def456 | Analyze Customer Feedback Trends | AWAITING_APPROVAL | null |

#### 2. Asset Entities (from mission_state)

**Assets Table:**
| id | name | type | scope_type | scope_id | status | role |
|---|---|---|---|---|---|---|
| asset_input_789 | Customer Feedback Dataset | dataset | mission | mission_def456 | PENDING | INPUT |
| asset_output_101 | Customer Feedback Analysis Report | document | mission | mission_def456 | PENDING | OUTPUT |

#### 3. MissionAsset Mapping Entries

**MissionAssets Table:**
| id | mission_id | asset_id | role |
|---|---|---|---|
| mission_asset_mapping_1 | mission_def456 | asset_input_789 | INPUT |
| mission_asset_mapping_2 | mission_def456 | asset_output_101 | OUTPUT |

#### 4. UserSession Update

**UserSessions Table:**
| id | mission_id | status | updated_at |
|---|---|---|---|
| session_abc123 | mission_def456 | ACTIVE | 2024-01-15T10:30:00Z |

### Result State

After this transition completes:

- **Mission**: Created in `AWAITING_APPROVAL` status, linked to user session
- **Assets**: 2 mission-scoped assets created (1 input, 1 output) with `PENDING` status
- **Mappings**: 2 mission-asset mappings created to track asset roles
- **Session**: Updated to link the new mission for context preservation

The system is now ready for the user to review and approve the mission proposal via the `ACCEPT_MISSION` transition.

---

## 2. ACCEPT_MISSION - Entity Updates

[Example to be added]

## 3. START_HOP_PLAN - Entity Updates

[Example to be added]

## 4. PROPOSE_HOP_PLAN - Entity Updates

[Example to be added]

## 5. ACCEPT_HOP_PLAN - Entity Updates

[Example to be added]

## 6. START_HOP_IMPL - Entity Updates

[Example to be added]

## 7. PROPOSE_HOP_IMPL - Entity Updates

[Example to be added]

## 8. ACCEPT_HOP_IMPL - Entity Updates

[Example to be added]

## 9. EXECUTE_HOP - Entity Updates

[Example to be added]

## 10. COMPLETE_TOOL_STEP - Entity Updates

[Example to be added]

## 11. COMPLETE_HOP - Entity Updates

[Example to be added]

## 12. COMPLETE_MISSION - Entity Updates

[Example to be added] 