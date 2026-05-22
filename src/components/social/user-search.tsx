"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { searchUsers, sendFriendRequest } from "@/app/actions/social";
import { UserAvatar } from "@/components/social/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/types/database";

type SearchResult = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "bio"
>;

export function UserSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [pending, startTransition] = useTransition();

  function handleSearch() {
    if (!query.trim()) return;
    startTransition(async () => {
      const { users, error } = await searchUsers({ query: query.trim() });
      if (error) toast.error(error);
      setResults(users ?? []);
    });
  }

  function handleAdd(addresseeId: string) {
    startTransition(async () => {
      const result = await sendFriendRequest({ addresseeId });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Friend request sent");
      setResults((prev) => prev.filter((u) => u.id !== addresseeId));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-11 pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={pending} className="h-11 w-full sm:w-auto">
          Search
        </Button>
      </div>

      <ul className="space-y-2">
        {results.map((user) => (
          <li
            key={user.id}
            className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <UserAvatar
                avatarUrl={user.avatar_url}
                displayName={user.display_name}
                username={user.username}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">@{user.username}</p>
                {user.display_name && (
                  <p className="truncate text-sm text-muted-foreground">
                    {user.display_name}
                  </p>
                )}
              </div>
            </div>
            <Button
              className="h-11 w-full shrink-0 sm:w-auto"
              disabled={pending}
              onClick={() => handleAdd(user.id)}
            >
              Add friend
            </Button>
          </li>
        ))}
        {results.length === 0 && query && !pending && (
          <p className="text-center text-sm text-muted-foreground">
            No public users found
          </p>
        )}
      </ul>
    </div>
  );
}
