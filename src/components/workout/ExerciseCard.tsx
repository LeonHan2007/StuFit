"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Exercise } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let id = u.searchParams.get("v");
    if (!id && u.hostname.includes("youtu.be")) {
      id = u.pathname.slice(1);
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const [showTechnique, setShowTechnique] = useState(true);
  const embedUrl = exercise.youtube_url
    ? getYouTubeEmbedUrl(exercise.youtube_url)
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{exercise.name}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary">{exercise.muscle_group}</Badge>
              <Badge variant="outline">{exercise.equipment}</Badge>
              <Badge variant="outline">{exercise.difficulty}</Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowTechnique(!showTechnique)}
            aria-expanded={showTechnique}
          >
            {showTechnique ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showTechnique && (
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm text-muted-foreground">
            {exercise.technique_md.replace(/^## Technique\n?/m, "")}
          </div>
        )}
        {embedUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-lg border">
            <iframe
              src={embedUrl}
              title={`${exercise.name} technique`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
