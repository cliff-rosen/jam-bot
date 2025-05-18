export enum ActionType {
    CREATE_ASSET = 'create_asset',
    START_AGENT = 'start_agent',
    APPROVE_AGENT = 'approve_agent',
    REJECT_AGENT = 'reject_agent',
    LAUNCH_AGENT = 'launch_agent',
    MODIFY_ASSET = 'modify_asset',
    NEXT_STEP = 'next_step'
}

export interface ActionButton {
    label: string;
    action: ActionType;
} 