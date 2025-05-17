export interface EmailMessage {
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string;
    body: {
        html?: string;
        plain?: string;
    };
    snippet: string;
}

export interface EmailListAsset {
    asset_id: string;
    name: string;
    description: string;
    type: string;
    content: EmailMessage[];
    status: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        creator: string;
        tags: string[];
        agent_associations: any[];
        version: number;
    };
} 