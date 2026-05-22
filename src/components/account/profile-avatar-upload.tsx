"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { removeAvatar, updateAvatarUrl } from "@/app/actions/profile";
import { UserAvatar } from "@/components/social/user-avatar";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 2 * 1024 * 1024;

async function resizeToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const max = 512;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
      "image/webp",
      0.85
    );
  });
}

export function ProfileAvatarUpload({
  userId,
  avatarUrl,
  displayName,
  username,
}: {
  userId: string;
  avatarUrl: string | null;
  displayName: string | null;
  username: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shownUrl = preview ?? avatarUrl;

  function handlePick() {
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 2 MB");
      return;
    }

    startTransition(async () => {
      try {
        const blob = await resizeToWebp(file);
        const path = `${userId}/avatar.webp`;
        const supabase = createClient();

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, blob, {
            upsert: true,
            contentType: "image/webp",
          });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);

        const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        setPreview(publicUrl);

        const result = await updateAvatarUrl({ avatarUrl: publicUrl });
        if ("error" in result && result.error) throw new Error(result.error);

        toast.success("Profile photo updated");
        router.refresh();
      } catch (e) {
        setPreview(null);
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeAvatar();
      if ("error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setPreview(null);
      toast.success("Profile photo removed");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <UserAvatar
        avatarUrl={shownUrl}
        displayName={displayName}
        username={username}
        size="lg"
      />
      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={handlePick}
          className="h-11 w-full gap-2 sm:w-auto"
        >
          <Camera className="h-4 w-4" />
          {pending ? "Uploading…" : "Change photo"}
        </Button>
        {avatarUrl && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={handleRemove}
            className="h-11 w-full gap-2 text-destructive hover:text-destructive sm:w-auto"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
