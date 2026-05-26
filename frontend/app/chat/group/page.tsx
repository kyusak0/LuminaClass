'use client';

import { useParams } from 'next/navigation';
import GroupChat from '@/components/test/groupChat';

export default function GroupChatPage() {
    const { id } = useParams();
    const groupId = parseInt(id as string) || 0;

    return (
        <div className="h-screen p-4">
            <GroupChat groupId={groupId} className="h-full" />
        </div>
    );
}