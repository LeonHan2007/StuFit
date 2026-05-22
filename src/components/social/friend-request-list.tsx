"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
} from "@/app/actions/social";
import { UserAvatar } from "@/components/social/user-avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface FriendRequestRow {
  friendshipId: string;
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export function FriendRequestList({
  incoming,
  outgoing,
}: {
  incoming: FriendRequestRow[];
  outgoing: FriendRequestRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { error: string }>, msg: string) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(msg);
      router.refresh();
    });
  }

  return (
    <Tabs defaultValue="incoming">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="incoming">
          Incoming ({incoming.length})
        </TabsTrigger>
        <TabsTrigger value="outgoing">
          Outgoing ({outgoing.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="incoming" className="mt-4 space-y-2">
        {incoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incoming requests</p>
        ) : (
          incoming.map((row) => (
            <div
              key={row.friendshipId}
              className="flex flex-col gap-3 rounded-lg border p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  avatarUrl={row.avatarUrl}
                  displayName={row.displayName}
                  username={row.username}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">@{row.username}</p>
                  {row.displayName && (
                    <p className="truncate text-sm text-muted-foreground">
                      {row.displayName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="h-11 min-w-0 flex-1 sm:flex-initial"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => acceptFriendRequest({ friendshipId: row.friendshipId }),
                      "Friend added"
                    )
                  }
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="h-11 min-w-0 flex-1 sm:flex-initial"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => declineFriendRequest({ friendshipId: row.friendshipId }),
                      "Request declined"
                    )
                  }
                >
                  Decline
                </Button>
              </div>
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="outgoing" className="mt-4 space-y-2">
        {outgoing.length === 0 ? (
          <p className="text-sm text-muted-foreground">No outgoing requests</p>
        ) : (
          outgoing.map((row) => (
            <div
              key={row.friendshipId}
              className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <UserAvatar
                  avatarUrl={row.avatarUrl}
                  displayName={row.displayName}
                  username={row.username}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">@{row.username}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="h-11 w-full sm:w-auto"
                disabled={pending}
                onClick={() =>
                  run(
                    () => cancelFriendRequest({ friendshipId: row.friendshipId }),
                    "Request cancelled"
                  )
                }
              >
                Cancel
              </Button>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
