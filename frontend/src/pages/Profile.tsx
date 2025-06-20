import { useAuth } from '@/context/AuthContext';
import { EmailAgentOAuthButton } from '@/components/features/auth';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export default function Profile() {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="container mx-auto max-w-2xl py-12">
            <div className="space-y-8">
                {/* Profile Info */}
                <div className="space-y-1">
                    <h1 className="text-2xl font-medium text-gray-900 dark:text-white">
                        {user?.username}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {user?.email}
                    </p>
                </div>

                {/* Gmail Connection */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Gmail</h3>
                            <p className="text-sm text-gray-500">Manage your Gmail connection</p>
                        </div>
                    </div>
                    <EmailAgentOAuthButton />
                </div>
            </div>
        </div>
    );
} 