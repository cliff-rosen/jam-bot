import { emailApi } from '@/lib/api/emailApi';

export const getCollabAreaData = async () => {
    try {
        const response = await emailApi.getNewsletters({
            page: 1,
            page_size: 10
        });
        return response.newsletters;
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

export interface CollabAreaState {
    type: 'default' | 'workflow' | 'document' | 'code' | 'object-list';
    content: any;
}
