import { newsletterApi } from '@/lib/api/newsletterApi';
import { Hop } from '@/types/workflow';

export const getCollabAreaData = async () => {

    try {
        const response = await newsletterApi.getNewsletterSummary({
            period_type: 'day',
            start_date: '2025-05-01',
            end_date: '2025-05-01'
        });
        console.log(response);
        return {
            type: 'object',
            content: response
        }


    } catch (error) {
        console.error('Error fetching newsletters:', error);
        return {
            newsletters: [],
            pagination: {
                page: 1,
                page_size: 10,
                total_count: 0,
                total_pages: 0
            }
        };
    }
}


export const getCollabAreaData2 = async () => {

    try {
        const response = await newsletterApi.getNewsletters({
            page: 1,
            page_size: 10
        });
        return {
            type: 'object-list',
            content: response.newsletters
        }


    } catch (error) {
        console.error('Error fetching newsletters:', error);
        return {
            type: 'object-list',
            content: []
        }
    }
}

export type ApprovalContent = {
    type: 'mission-proposal' | 'hop-proposal' | 'hop-implementation-proposal';
    content: any;
};

export interface CollabAreaState {
    type: 'current-hop' | ApprovalContent['type'] | null;
    content: Hop | ApprovalContent['content'] | null;
}
