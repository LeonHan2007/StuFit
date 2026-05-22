import { Flame } from "lucide-react";
import { UserAvatar } from "@/components/social/user-avatar";
import { Badge } from "@/components/ui/badge";

export interface FriendListItem {
  friendshipId: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  friendStreak: number;
  bothActiveToday: boolean;
}

export function FriendsList({ friends }: { friends: FriendListItem[] }) {
  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No friends yet. Search for public profiles to connect.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {friends.map((friend) => (
        <li
          key={friend.friendshipId}
          className="flex items-start gap-3 rounded-lg border p-3"
        >
          <UserAvatar
            avatarUrl={friend.avatarUrl}
            displayName={friend.displayName}
            username={friend.username}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">@{friend.username}</p>
            {friend.displayName && (
              <p className="truncate text-sm text-muted-foreground">
                {friend.displayName}
              </p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                {friend.friendStreak} day streak
              </span>
              {friend.bothActiveToday && (
                <Badge variant="secondary">Both active today</Badge>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
