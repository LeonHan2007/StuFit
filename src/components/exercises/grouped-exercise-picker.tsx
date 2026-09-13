"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CATEGORY_LABELS,
  EXERCISE_CATEGORY_ORDER,
} from "@/lib/exercises/constants";
import type { Exercise, ExerciseCategory } from "@/types/database";

export function GroupedExercisePicker({
  catalog,
  existingIds,
  onSelect,
  disabled,
}: {
  catalog: Exercise[];
  existingIds: Set<string>;
  onSelect: (exercise: Exercise) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const sectionRefs = useRef<Partial<Record<ExerciseCategory, HTMLDivElement | null>>>(
    {}
  );

  const available = useMemo(
    () => catalog.filter((e) => !existingIds.has(e.id)),
    [catalog, existingIds]
  );

  const searchLower = search.trim().toLowerCase();
  const isSearching = searchLower.length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return available;
    const compact = (value: string) => value.toLowerCase().replace(/[\s-]+/g, "");
    const compactQuery = compact(searchLower);
    return available.filter((e) => {
      const name = e.name.toLowerCase();
      return (
        name.includes(searchLower) ||
        compact(e.name).includes(compactQuery) ||
        compact(e.slug).includes(compactQuery) ||
        e.muscle_group.toLowerCase().includes(searchLower) ||
        e.equipment.toLowerCase().includes(searchLower) ||
        e.category.toLowerCase().includes(searchLower)
      );
    });
  }, [available, isSearching, searchLower]);

  const grouped = useMemo(() => {
    const map = new Map<ExerciseCategory, Exercise[]>();
    for (const cat of EXERCISE_CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const ex of available) {
      const cat = EXERCISE_CATEGORY_ORDER.includes(ex.category as ExerciseCategory)
        ? (ex.category as ExerciseCategory)
        : "weightlifting";
      map.get(cat)?.push(ex);
    }
    return map;
  }, [available]);

  function scrollToCategory(category: ExerciseCategory) {
    sectionRefs.current[category]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function ExerciseRow({ ex }: { ex: Exercise }) {
    return (
      <li key={ex.id}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(ex)}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
        >
          <span>{ex.name}</span>
          <Badge variant="outline">{ex.muscle_group}</Badge>
        </button>
      </li>
    );
  }

  const visibleCategories = EXERCISE_CATEGORY_ORDER.filter(
    (cat) => (grouped.get(cat)?.length ?? 0) > 0
  );

  return (
    <div className="flex min-h-0 flex-col">
      <Input
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 shrink-0"
      />

      {!isSearching && visibleCategories.length > 0 && (
        <div className="mb-2 flex shrink-0 flex-wrap gap-1.5">
          {visibleCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => scrollToCategory(cat)}
              className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isSearching ? (
          <ul className="space-y-1">
            {filtered.map((ex) => (
              <ExerciseRow key={ex.id} ex={ex} />
            ))}
            {filtered.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No exercises found
              </p>
            )}
          </ul>
        ) : (
          <div className="space-y-4">
            {EXERCISE_CATEGORY_ORDER.map((cat) => {
              const items = grouped.get(cat) ?? [];
              if (items.length === 0) return null;
              return (
                <section
                  key={cat}
                  ref={(el: HTMLDivElement | null) => {
                    sectionRefs.current[cat] = el;
                  }}
                  className="scroll-mt-2"
                >
                  <h3 className="sticky top-0 z-10 mb-1 bg-background py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABELS[cat]}
                  </h3>
                  <ul className="space-y-1">
                    {items.map((ex) => (
                      <ExerciseRow key={ex.id} ex={ex} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
