"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import type { ResumeDraftSection } from "@/types/database";
import { StudioSectionCard } from "./studio-section-card";

interface Props {
  sections: ResumeDraftSection[];
  activeSectionId: string | null;
  draftId: string;
  onSectionUpdate: (id: string, content: unknown) => void;
  onSectionSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export function StudioCenterPanel({
  sections, activeSectionId, draftId,
  onSectionUpdate, onSectionSelect, onReorder,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sections, oldIndex, newIndex);
    onReorder(reordered.map((s) => s.id));
  };

  const sectionIds = sections.map((s) => s.id);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center border-b px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editor</span>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{sections.length} sections · Drag to reorder</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              {sections.map((section) => (
                <StudioSectionCard
                  key={section.id}
                  section={section}
                  draftId={draftId}
                  isActive={section.id === activeSectionId}
                  onUpdate={onSectionUpdate}
                  onSelect={() => onSectionSelect(section.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
