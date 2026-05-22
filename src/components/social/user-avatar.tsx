import Link from "next/link";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { profileInitials } from "@/lib/profile/username";
import { cn } from "@/lib/utils";

export function UserAvatar({
  avatarUrl,
  displayName,
  username,
  size = "default",
  href,
  className,
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: "default" | "sm" | "lg";
  href?: string;
  className?: string;
}) {
  const avatar = (
    <Avatar data-size={size} className={cn(className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={displayName ?? username ?? "User"} />
      ) : null}
      <AvatarFallback>
        {profileInitials(displayName, username)}
      </AvatarFallback>
    </Avatar>
  );

  if (href) {
    return (
      <Link href={href} className="rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {avatar}
      </Link>
    );
  }

  return avatar;
}
