"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut, togglePrivacy, updateProfile } from "@/app/actions/profile";
import { ProfileAvatarUpload } from "@/components/account/profile-avatar-upload";
import { UsernameField } from "@/components/account/username-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function ProfileForm({
  userId,
  profile,
}: {
  userId: string;
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    timezone: string | null;
    is_public: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState(profile.username ?? "");
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [timezone, setTimezone] = useState(profile.timezone ?? "UTC");
  const [isPublic, setIsPublic] = useState(profile.is_public);

  function handleSave() {
    startTransition(async () => {
      const result = await updateProfile({
        username: username || undefined,
        displayName,
        bio: bio || null,
        timezone,
      });
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    });
  }

  function handlePrivacy(checked: boolean) {
    setIsPublic(checked);
    startTransition(async () => {
      const result = await togglePrivacy({ isPublic: checked });
      if ("error" in result && result.error) {
        toast.error(result.error);
        setIsPublic(!checked);
        return;
      }
      toast.success(checked ? "Profile is now public" : "Profile is now private");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <ProfileAvatarUpload
        userId={userId}
        avatarUrl={profile.avatar_url}
        displayName={profile.display_name}
        username={profile.username}
      />

      <UsernameField defaultValue={profile.username ?? ""} onChange={setUsername} />

      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={300}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox
          id="isPublic"
          checked={isPublic}
          onCheckedChange={(v) => handlePrivacy(v === true)}
          disabled={pending}
        />
        <div className="space-y-1">
          <Label htmlFor="isPublic" className="cursor-pointer">
            Public profile
          </Label>
          <p className="text-sm text-muted-foreground">
            Public profiles appear in search. Private profiles are only visible to friends.
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={pending} className="h-11 w-full">
        {pending ? "Saving…" : "Save profile"}
      </Button>

      <form action={signOut}>
        <Button type="submit" variant="outline" className="h-11 w-full">
          Sign out
        </Button>
      </form>
    </div>
  );
}
