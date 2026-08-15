#!/usr/bin/env python3
from __future__ import annotations

"""
Task Manager Tool — manages a hierarchical TODO.md file per workspace.

All metadata is inline on the task line using emoji annotations.
Tasks are identified by unique 6-character base62 IDs.
"""

import re
import os
import sys
import json
import secrets
import string
import tempfile
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any

# ─── Constants ───────────────────────────────────────────────────────────────

BASE62_CHARS = string.ascii_letters + string.digits
MAX_DEPTH = 8
TODO_FILENAME = "TODO.md"
ID_PATTERN = re.compile(r'\(ID:\s*`([A-Za-z0-9]{6})`\)\s*$')

# Priority emoji mapping
PRIORITY_EMOJI = {
    "lowest": "⏬",
    "low": "🔽",
    "medium": "🔼",
    "high": "⏫",
    "highest": "🔺",
}
PRIORITY_FROM_EMOJI = {v: k for k, v in PRIORITY_EMOJI.items()}

# Date emoji mapping
DATE_EMOJI = {
    "scheduled": "⏳",
    "start": "🛫",
    "due": "📅",
    "done": "✅",
    "cancelled": "❌",
    "created": "➕",
    "modified": "🖊️",
}
DATE_FROM_EMOJI = {v: k for k, v in DATE_EMOJI.items()}

# Status characters
STATUS_CHARS = {" ", "x", ">", "!", "-"}

# ─── ID Generation ────────────────────────────────────────────────────────────

def generate_id(existing_ids: set[str]) -> str:
    """Generate a unique 6-char base62 ID."""
    while True:
        # token_urlsafe uses base64 alphabet; we map to base62
        raw = secrets.token_urlsafe(8)
        # Filter to base62 chars and take first 6
        candidate = ""
        for c in raw:
            if c in BASE62_CHARS:
                candidate += c
                if len(candidate) == 6:
                    break
        if len(candidate) == 6 and candidate not in existing_ids:
            return candidate


# ─── Task Dataclass ───────────────────────────────────────────────────────────

@dataclass
class Task:
    """Internal representation of a task."""
    id: str
    description: str
    status: str = " "  # ' ', 'x', '>', '!', '-'

    # Hierarchy
    depth: int = 0
    position: int = 0
    parent_id: str | None = None
    children_ids: list[str] = field(default_factory=list)

    # Timestamps
    date_created: str | None = None
    date_modified: str | None = None

    # Annotations
    priority: str | None = None          # lowest, low, normal, medium, high, highest
    date_scheduled: str | None = None    # ⏳
    date_start: str | None = None        # 🛫
    date_due: str | None = None          # 📅
    date_done: str | None = None         # ✅
    date_cancelled: str | None = None    # ❌
    recurrence: str | None = None        # 🔁
    on_completion: str | None = None     # 🏁=keep, 🗑️=delete
    depends_on: list[str] = field(default_factory=list)
    has_spec: bool = False               # 📎


# ─── Markdown Parsing ─────────────────────────────────────────────────────────

def _parse_task_line(line: str, parent_id: str | None = None, depth: int = 0, position: int = 0) -> Task | None:
    """Parse a single task line from TODO.md format.
    
    Expected format:
        <indent>- [STATUS] Description <emoji-annotations> (ID: `XXXXXX`)
    """
    # Match the task line pattern
    m = re.match(
        r'^( *)-\s+\[([ x>!-])\]\s+(.*?)\s*$',
        line
    )
    if not m:
        return None

    indent = len(m.group(1))
    status_char = m.group(2)
    rest = m.group(3)

    # Extract ID from end
    id_match = ID_PATTERN.search(rest)
    if not id_match:
        return None
    task_id = id_match.group(1)
    rest = rest[:id_match.start()].strip()

    # Parse emoji annotations from rest
    task = Task(
        id=task_id,
        description=rest,  # will be refined
        status=status_char,
        depth=depth,
        position=position,
        parent_id=parent_id,
    )

    # Now parse annotations from rest
    # We need to separate description from annotations
    # Annotations are emoji+value patterns at the end
    annotations, description = _parse_annotations(rest)
    task.description = description

    # Apply parsed annotations
    if "priority" in annotations:
        task.priority = annotations["priority"]
    if "scheduled" in annotations:
        task.date_scheduled = annotations["scheduled"]
    if "start" in annotations:
        task.date_start = annotations["start"]
    if "due" in annotations:
        task.date_due = annotations["due"]
    if "done" in annotations:
        task.date_done = annotations["done"]
    if "cancelled" in annotations:
        task.date_cancelled = annotations["cancelled"]
    if "created" in annotations:
        task.date_created = annotations["created"]
    if "modified" in annotations:
        task.date_modified = annotations["modified"]
    if "recurrence" in annotations:
        task.recurrence = annotations["recurrence"]
    if "on_completion" in annotations:
        task.on_completion = annotations["on_completion"]
    if "depends_on" in annotations:
        task.depends_on = annotations["depends_on"]
    if "spec" in annotations:
        task.has_spec = True

    return task


def _parse_annotations(text: str) -> tuple[dict[str, Any], str]:
    """Parse emoji annotations from the end of a task line.
    
    Returns (annotations_dict, description_without_annotations)
    """
    annotations: dict[str, Any] = {}

    # Patterns for each annotation type (order matters for greedy matching)
    # Work from the end of the string backwards
    
    remaining = text
    
    # 📎 spec link: 📎 [spec](task-XXXXXX.md)
    spec_match = re.search(r'📎\s*\[spec\]\(task-[A-Za-z0-9]+\.md\)\s*', remaining)
    if spec_match:
        annotations["spec"] = True
        remaining = remaining[:spec_match.start()] + remaining[spec_match.end():]
    
    # ⛔ depends_on: ⛔ id1,id2,id3
    dep_match = re.search(r'⛔\s*([A-Za-z0-9]+(?:,[A-Za-z0-9]+)*)\s*', remaining)
    if dep_match:
        annotations["depends_on"] = dep_match.group(1).split(",")
        remaining = remaining[:dep_match.start()] + remaining[dep_match.end():]
    
    # 🗑️ on_completion: delete
    if '🗑️' in remaining:
        annotations["on_completion"] = "delete"
        remaining = remaining.replace('🗑️', '').strip()
    
    # 🏁 on_completion: keep
    if '🏁' in remaining:
        annotations["on_completion"] = "keep"
        remaining = remaining.replace('🏁', '').strip()
    
    # 🔁 recurrence: 🔁 <rule>
    # The rule extends to the next emoji or end of remaining text
    recur_match = re.search(r'🔁\s+(.+?)(?=\s+(?:⏬|🔽|🔼|⏫|🔺|⏳|🛫|📅|✅|❌|➕|🖊️|🗑️|🏁|⛔|📎|🆔))', remaining)
    if not recur_match:
        recur_match = re.search(r'🔁\s+(.+?)(?=\s+$)', remaining)
    if recur_match:
        annotations["recurrence"] = recur_match.group(1).strip()
        remaining = remaining[:recur_match.start()] + remaining[recur_match.end():]
    
    # Date emojis: ⏳ 🛫 📅 ✅ ❌ ➕ 🖊️ followed by YYYY-MM-DD
    for emoji, key in DATE_FROM_EMOJI.items():
        date_match = re.search(rf'{re.escape(emoji)}\s*(\d{{4}}-\d{{2}}-\d{{2}})\s*', remaining)
        if date_match:
            annotations[key] = date_match.group(1)
            remaining = remaining[:date_match.start()] + remaining[date_match.end():]
    
    # Priority emojis
    for emoji, priority in PRIORITY_FROM_EMOJI.items():
        if emoji in remaining:
            annotations["priority"] = priority
            remaining = remaining.replace(emoji, '').strip()
    
    # 🆔 task_id (explicit self-reference, mostly informational)
    id_ref_match = re.search(r'🆔\s*([A-Za-z0-9]+)\s*', remaining)
    if id_ref_match:
        remaining = remaining[:id_ref_match.start()] + remaining[id_ref_match.end():]
    
    # What remains is the description
    description = remaining.strip()
    
    return annotations, description


def parse_todo_file(content: str) -> list[Task]:
    """Parse entire TODO.md content into a list of Task objects with hierarchy."""
    lines = content.split('\n')
    tasks: list[Task] = []
    task_map: dict[str, Task] = {}
    
    # Track position at each depth level
    position_at_depth: dict[int, int] = {}
    
    # Track parent at each depth level
    parent_at_depth: dict[int, str | None] = {}
    parent_at_depth[-1] = None  # sentinel
    
    for line in lines:
        # Skip non-task lines
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or not stripped.startswith('-'):
            continue
        
        # Determine depth from indentation
        # Each level is 2 spaces of indentation
        match = re.match(r'^( *)-\s+\[', line)
        if not match:
            continue
        
        indent = len(match.group(1))
        depth = indent // 2
        
        if depth > MAX_DEPTH:
            continue
        
        # Set position and parent tracking
        position_at_depth[depth] = position_at_depth.get(depth, 0)
        parent_at_depth[depth] = parent_at_depth.get(depth - 1, None)
        
        task = _parse_task_line(line, parent_id=parent_at_depth[depth], depth=depth,
                                position=position_at_depth[depth])
        if task:
            tasks.append(task)
            task_map[task.id] = task
            position_at_depth[depth] += 1

            # Now this task becomes the parent for the next deeper level
            parent_at_depth[depth] = task.id
            
            # Update parent's children list
            if task.parent_id and task.parent_id in task_map:
                parent = task_map[task.parent_id]
                if task.id not in parent.children_ids:
                    parent.children_ids.append(task.id)
    
    return tasks


# ─── Markdown Serialization ───────────────────────────────────────────────────

def _build_task_line(task: Task) -> str:
    """Serialize a Task back to a markdown line."""
    indent = "  " * task.depth
    status_char = task.status if task.status != " " else " "
    
    # Build emoji annotations in conventional order
    annotations = []
    
    # Priority
    if task.priority and task.priority in PRIORITY_EMOJI:
        annotations.append(PRIORITY_EMOJI[task.priority])
    
    # Dates: scheduled, start, due, done, cancelled
    if task.date_scheduled:
        annotations.append(f"⏳ {task.date_scheduled}")
    if task.date_start:
        annotations.append(f"🛫 {task.date_start}")
    if task.date_due:
        annotations.append(f"📅 {task.date_due}")
    if task.date_done:
        annotations.append(f"✅ {task.date_done}")
    if task.date_cancelled:
        annotations.append(f"❌ {task.date_cancelled}")
    
    # Recurrence
    if task.recurrence:
        annotations.append(f"🔁 {task.recurrence}")
    
    # On-completion
    if task.on_completion == "delete":
        annotations.append("🗑️")
    elif task.on_completion == "keep":
        annotations.append("🏁")
    
    # Dependencies
    if task.depends_on:
        dep_str = ",".join(task.depends_on)
        annotations.append(f"⛔ {dep_str}")
    
    # Spec
    if task.has_spec:
        annotations.append(f"📎 [spec](task-{task.id}.md)")
    
    # Created
    if task.date_created:
        annotations.append(f"➕ {task.date_created}")
    
    # Modified
    if task.date_modified:
        annotations.append(f"🖊️ {task.date_modified}")
    
    # Build the line
    annotation_str = " ".join(annotations)
    if annotation_str:
        line = f"{indent}- [{status_char}] {task.description} {annotation_str} (ID: `{task.id}`)"
    else:
        line = f"{indent}- [{status_char}] {task.description} (ID: `{task.id}`)"
    
    return line


def tasks_to_markdown(tasks: list[Task]) -> str:
    """Convert a list of Task objects to TODO.md markdown content."""
    lines = ["# TODO", ""]
    
    for task in tasks:
        lines.append(_build_task_line(task))
    
    lines.append("")  # trailing newline
    return "\n".join(lines)


# ─── Task Manager ─────────────────────────────────────────────────────────────

class TaskManager:
    """Manages a TODO.md file for a single workspace."""
    
    def __init__(self):
        self._path: Path | None = None
        self._tasks: list[Task] = []
        self._task_map: dict[str, Task] = {}
        self._dirty = False
    
    @property
    def is_open(self) -> bool:
        return self._path is not None
    
    @property
    def path(self) -> Path | None:
        return self._path
    
    def _rebuild_map(self):
        """Rebuild the task_id -> Task lookup map."""
        self._task_map = {t.id: t for t in self._tasks}
    
    def _today(self) -> str:
        return date.today().isoformat()
    
    def _find_task(self, task_id: str) -> Task:
        if task_id not in self._task_map:
            raise ValueError(f"Task not found: {task_id}")
        return self._task_map[task_id]
    
    def _find_and_index(self, task_id: str) -> tuple[int, Task]:
        """Find a task and return (index_in_tasks_list, task)."""
        for i, t in enumerate(self._tasks):
            if t.id == task_id:
                return i, t
        raise ValueError(f"Task not found: {task_id}")
    
    def _get_descendants(self, task: Task) -> set[str]:
        """Get all descendant task IDs."""
        descendants = set()
        for child_id in task.children_ids:
            descendants.add(child_id)
            if child_id in self._task_map:
                descendants.update(self._get_descendants(self._task_map[child_id]))
        return descendants
    
    def _compute_positions(self):
        """Recompute position and depth for all tasks based on ordering."""
        # Tasks are stored in document order (DFS), so we can compute
        # positions based on parent_id groups
        position_counters: dict[str | None, int] = {}
        
        for task in self._tasks:
            key = task.parent_id
            if key not in position_counters:
                position_counters[key] = 0
            task.position = position_counters[key]
            position_counters[key] += 1
        
        # Recompute depths
        for task in self._tasks:
            if task.parent_id is None:
                task.depth = 0
            else:
                parent = self._task_map.get(task.parent_id)
                if parent:
                    task.depth = parent.depth + 1
                else:
                    task.depth = 0
    
    def _auto_update_modified(self, task: Task):
        """Auto-update the modified date."""
        task.date_modified = self._today()
    
    def _check_depth(self, task: Task, new_parent_id: str | None) -> None:
        """Check if moving task under new_parent would exceed max depth."""
        if new_parent_id is None:
            new_depth = 0
        else:
            parent = self._find_task(new_parent_id)
            new_depth = parent.depth + 1
        
        # Check all descendants
        descendants = self._get_descendants(task)
        depth_diff = new_depth - task.depth
        for desc_id in descendants:
            desc = self._task_map[desc_id]
            if desc.depth + depth_diff > MAX_DEPTH:
                raise ValueError(
                    f"Moving task would exceed max depth ({MAX_DEPTH}). "
                    f"Descendant {desc_id} would be at depth {desc.depth + depth_diff}."
                )
    
    # ─── Public API ───────────────────────────────────────────────────────
    
    def open_file(self, path: str) -> dict[str, Any]:
        """Open a TODO.md file for editing."""
        workspace = Path(path).resolve()
        todo_path = workspace / TODO_FILENAME
        
        self._path = todo_path
        self._tasks = []
        self._task_map = {}
        
        if todo_path.exists():
            content = todo_path.read_text(encoding="utf-8")
            self._tasks = parse_todo_file(content)
        else:
            # Create new file
            todo_path.write_text("# TODO\n\n", encoding="utf-8")
        
        self._rebuild_map()
        self._compute_positions()
        self._dirty = False
        
        return {
            "status": "ok",
            "path": str(todo_path),
            "task_count": len(self._tasks),
        }
    
    def close_file(self) -> dict[str, Any]:
        """Close the current file, saving if dirty."""
        if not self.is_open:
            return {"status": "error", "error": "No file open"}
        
        if self._dirty:
            self.save()
        
        self._path = None
        self._tasks = []
        self._task_map = {}
        self._dirty = False
        
        return {"status": "ok", "message": "File closed."}
    
    def add_task(self, description: str, parent_id: str | None = None,
                 before_id: str | None = None, after_id: str | None = None,
                 priority: str | None = None, scheduled: str | None = None,
                 start: str | None = None, due: str | None = None,
                 recurrence: str | None = None, on_completion: str | None = None,
                 depends_on: list[str] | None = None, spec: bool = False) -> dict[str, Any]:
        """Add a new task to the hierarchy."""
        if not self.is_open:
            return {"status": "error", "error": "No file open. Call open_file first."}
        
        if not description or not description.strip():
            return {"status": "error", "error": "Description cannot be empty."}
        
        # Validate depends_on
        if depends_on:
            for dep_id in depends_on:
                if dep_id not in self._task_map:
                    return {"status": "error", "error": f"Dependency task not found: {dep_id}"}
        
        # Check for circular dependencies
        if depends_on:
            # Simple cycle check: ensure none of the dependencies transitively depend on the new task
            # Since the new task doesn't exist yet, we just check the dependency graph isn't broken
            pass
        
        # Generate ID
        existing_ids = set(self._task_map.keys())
        new_id = generate_id(existing_ids)
        
        # Determine insertion point and parent
        insert_index = len(self._tasks)  # default: append at end
        actual_parent_id = parent_id
        
        if parent_id and parent_id not in self._task_map:
            return {"status": "error", "error": f"Parent task not found: {parent_id}"}
        
        if parent_id:
            parent_task = self._task_map[parent_id]
            if parent_task.depth + 1 > MAX_DEPTH:
                return {"status": "error", "error": f"Adding as child would exceed max depth ({MAX_DEPTH})."}
            
            # Insert after the last child of parent
            if parent_task.children_ids:
                last_child_id = parent_task.children_ids[-1]
                last_child_idx, _ = self._find_and_index(last_child_id)
                # Find the end of the last child's subtree
                insert_index = self._find_subtree_end(last_child_idx) + 1
            else:
                # Insert right after the parent
                parent_idx, _ = self._find_and_index(parent_id)
                insert_index = parent_idx + 1
        
        if before_id:
            if before_id not in self._task_map:
                return {"status": "error", "error": f"before_id task not found: {before_id}"}
            before_idx, before_task = self._find_and_index(before_id)
            insert_index = before_idx
            if actual_parent_id is None:
                actual_parent_id = before_task.parent_id
        elif after_id:
            if after_id not in self._task_map:
                return {"status": "error", "error": f"after_id task not found: {after_id}"}
            after_idx, after_task = self._find_and_index(after_id)
            insert_index = self._find_subtree_end(after_idx) + 1
            if actual_parent_id is None:
                actual_parent_id = after_task.parent_id
        
        # Create the task
        today = self._today()
        task = Task(
            id=new_id,
            description=description.strip(),
            status=" ",
            parent_id=actual_parent_id,
            date_created=today,
            date_modified=today,
            priority=priority if priority and priority != "normal" else None,
            date_scheduled=scheduled,
            date_start=start,
            date_due=due,
            recurrence=recurrence,
            on_completion=on_completion if on_completion != "keep" else None,  # keep is default, only store if explicitly set or if delete
            depends_on=list(depends_on) if depends_on else [],
            has_spec=spec,
        )
        
        # If on_completion is explicitly "keep", store it
        if on_completion == "keep":
            task.on_completion = "keep"
        
        # Insert into tasks list
        self._tasks.insert(insert_index, task)
        
        # Update parent's children
        if actual_parent_id:
            parent = self._task_map[actual_parent_id]
            if parent.children_ids and before_id:
                # Insert at correct position among siblings
                parent.children_ids.append(new_id)
            elif parent.children_ids and after_id:
                parent.children_ids.append(new_id)
            else:
                parent.children_ids.append(new_id)
        
        # Create spec file if requested
        if spec and self._path:
            spec_path = self._path.parent / f"task-{new_id}.md"
            try:
                spec_path.write_text(
                    f"# Task Specification: {description.strip()}\n\n"
                    f"**ID:** `{new_id}`\n\n"
                    f"## Description\n\n{description.strip()}\n\n"
                    f"## Acceptance Criteria\n\n- [ ] \n\n"
                    f"## Notes\n\n",
                    encoding="utf-8"
                )
            except OSError:
                task.has_spec = False  # Silently fail spec creation
        
        # Rebuild map and positions
        self._rebuild_map()
        self._compute_positions()
        self._dirty = True
        self._save_to_disk()
        
        return {
            "status": "ok",
            "task_id": new_id,
            "description": task.description,
        }
    
    def edit_task(self, task_id: str, description: str | None = None,
                  status: str | None = None, priority: str | None = None,
                  scheduled: str | None = None, start: str | None = None,
                  due: str | None = None, recurrence: str | None = None,
                  on_completion: str | None = None,
                  depends_on: list[str] | None = None) -> dict[str, Any]:
        """Edit an existing task."""
        if not self.is_open:
            return {"status": "error", "error": "No file open."}
        
        task = self._find_task(task_id)
        
        # Check that at least one field is being edited
        changes = {}
        if description is not None:
            changes["description"] = description
        if status is not None:
            changes["status"] = status
        if priority is not None:
            changes["priority"] = priority
        if scheduled is not None:
            changes["scheduled"] = scheduled
        if start is not None:
            changes["start"] = start
        if due is not None:
            changes["due"] = due
        if recurrence is not None:
            changes["recurrence"] = recurrence
        if on_completion is not None:
            changes["on_completion"] = on_completion
        if depends_on is not None:
            changes["depends_on"] = depends_on
        
        if not changes:
            return {"status": "error", "error": "No fields to edit."}
        
        # Apply changes
        if "description" in changes:
            if not changes["description"].strip():
                return {"status": "error", "error": "Description cannot be empty."}
            task.description = changes["description"].strip()
        
        if "status" in changes:
            new_status = changes["status"]
            if new_status not in STATUS_CHARS:
                return {"status": "error", "error": f"Invalid status: {new_status}. Must be one of: {STATUS_CHARS}"}
            task.status = new_status
            # Auto-set done/cancelled dates
            if new_status == "x" and not task.date_done:
                task.date_done = self._today()
            if new_status == "-" and not task.date_cancelled:
                task.date_cancelled = self._today()
        
        if "priority" in changes:
            p = changes["priority"]
            if p is None or p == "null":
                task.priority = None
            elif p == "normal":
                task.priority = None
            elif p in PRIORITY_EMOJI:
                task.priority = p
            else:
                return {"status": "error", "error": f"Invalid priority: {p}"}
        
        if "scheduled" in changes:
            task.date_scheduled = changes["scheduled"]
        if "start" in changes:
            task.date_start = changes["start"]
        if "due" in changes:
            task.date_due = changes["due"]
        
        if "recurrence" in changes:
            task.recurrence = changes["recurrence"]
        
        if "on_completion" in changes:
            oc = changes["on_completion"]
            if oc is None or oc == "null":
                task.on_completion = None
            elif oc in ("keep", "delete"):
                task.on_completion = oc
            else:
                return {"status": "error", "error": f"Invalid on_completion: {oc}"}
        
        if "depends_on" in changes:
            deps = changes["depends_on"]
            if deps is None or deps == "null":
                task.depends_on = []
            else:
                # Validate all dependency IDs exist
                for dep_id in deps:
                    if dep_id not in self._task_map:
                        return {"status": "error", "error": f"Dependency task not found: {dep_id}"}
                # Check for circular dependencies
                if self._would_create_cycle(task_id, deps):
                    return {"status": "error", "error": "Circular dependency detected."}
                task.depends_on = list(deps)
        
        # Auto-update modified date
        self._auto_update_modified(task)
        self._dirty = True
        self._save_to_disk()
        
        return {
            "status": "ok",
            "task": self._task_to_dict(task),
        }
    
    def move_task(self, task_id: str, under_id: str | None = None,
                  before_id: str | None = None,
                  after_id: str | None = None) -> dict[str, Any]:
        """Move a task to a new position, or delete if no destination."""
        if not self.is_open:
            return {"status": "error", "error": "No file open."}
        
        # No destination = delete
        if under_id is None and before_id is None and after_id is None:
            return self._delete_task(task_id)
        
        task = self._find_task(task_id)
        descendants = self._get_descendants(task)
        
        # Validate no self-referential moves
        if under_id:
            if under_id == task_id:
                return {"status": "error", "error": "Cannot move task under itself."}
            if under_id in descendants:
                return {"status": "error", "error": "Cannot move task under its own descendant."}
            if under_id not in self._task_map:
                return {"status": "error", "error": f"Target parent not found: {under_id}"}
        
        if before_id:
            if before_id == task_id:
                return {"status": "error", "error": "Cannot move task before itself."}
            if before_id not in self._task_map:
                return {"status": "error", "error": f"Target position not found: {before_id}"}
        
        if after_id:
            if after_id == task_id:
                return {"status": "error", "error": "Cannot move task after itself."}
            if after_id not in self._task_map:
                return {"status": "error", "error": f"Target position not found: {after_id}"}
        
        # Check depth constraint
        effective_parent = under_id
        if under_id is None and before_id:
            effective_parent = self._task_map[before_id].parent_id
        if under_id is None and after_id:
            effective_parent = self._task_map[after_id].parent_id
        
        self._check_depth(task, effective_parent)
        
        # Remove task and its subtree from current position
        task_ids_to_remove = {task_id} | descendants
        self._tasks = [t for t in self._tasks if t.id not in task_ids_to_remove]
        
        # Remove from old parent's children
        if task.parent_id and task.parent_id in self._task_map:
            old_parent = self._task_map[task.parent_id]
            old_parent.children_ids = [c for c in old_parent.children_ids if c != task_id]
        
        # Determine new position
        new_parent_id = under_id
        insert_index = len(self._tasks)
        
        if under_id:
            new_parent_id = under_id
            parent_task = self._task_map[under_id]
            if parent_task.children_ids:
                last_child_id = parent_task.children_ids[-1]
                last_child_idx = self._find_by_id(last_child_id)
                insert_index = self._find_subtree_end(last_child_idx) + 1
            else:
                parent_idx = self._find_by_id(under_id)
                insert_index = parent_idx + 1
        elif before_id:
            before_task = self._task_map[before_id]
            new_parent_id = before_task.parent_id
            insert_index = self._find_by_id(before_id)
        elif after_id:
            after_task = self._task_map[after_id]
            new_parent_id = after_task.parent_id
            after_idx = self._find_by_id(after_id)
            insert_index = self._find_subtree_end(after_idx) + 1
        
        # Update task's parent
        task.parent_id = new_parent_id

        # Re-insert the subtree (tasks are still in _task_map)
        subtree = [task]
        for desc_id in descendants:
            subtree.append(self._task_map[desc_id])

        for i, st in enumerate(subtree):
            self._tasks.insert(insert_index + i, st)
        
        # Update new parent's children
        if new_parent_id and new_parent_id in self._task_map:
            new_parent = self._task_map[new_parent_id]
            new_parent.children_ids.append(task_id)
        
        # Rebuild everything
        self._rebuild_map()
        self._compute_positions()
        self._dirty = True
        self._save_to_disk()
        
        return {
            "status": "ok",
            "message": f"Task {task_id} moved.",
            "task_id": task_id,
            "parent_id": task.parent_id,
            "depth": task.depth,
        }
    
    def get_task(self, task_id: str) -> dict[str, Any]:
        """Retrieve a single task by ID."""
        if not self.is_open:
            return {"status": "error", "error": "No file open."}
        
        task = self._find_task(task_id)
        return {
            "status": "ok",
            "task": self._task_to_dict(task),
        }
    
    def list_tasks(self, parent_id: str | None = None,
                   status: str | None = None,
                   priority: str | None = None,
                   include_subtasks: bool = False) -> dict[str, Any]:
        """List tasks with optional filters."""
        if not self.is_open:
            return {"status": "error", "error": "No file open."}
        
        results = []
        
        for task in self._tasks:
            # Filter by parent
            if parent_id is not None:
                if include_subtasks:
                    # Include all descendants of parent_id
                    if not self._is_descendant_of(task.id, parent_id) and task.id != parent_id:
                        continue
                else:
                    if task.parent_id != parent_id:
                        continue
            
            # Filter by status
            if status is not None and task.status != status:
                continue
            
            # Filter by priority
            if priority is not None and task.priority != priority:
                continue
            
            results.append(self._task_summary(task))
        
        return {
            "status": "ok",
            "tasks": results,
            "count": len(results),
        }
    
    def _save_to_disk(self):
        """Silently write current state to disk (auto-save).

        Called after every modification. Errors are silently ignored
        so that a transient I/O issue does not break the operation.
        """
        if not self.is_open or self._path is None:
            return
        try:
            content = tasks_to_markdown(self._tasks)
            dir_path = self._path.parent
            fd, tmp_path = tempfile.mkstemp(dir=str(dir_path), suffix=".tmp")
            try:
                os.write(fd, content.encode("utf-8"))
                os.close(fd)
            except:
                try:
                    os.close(fd)
                except:
                    pass
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
                return

            # Create backup
            bak_path = self._path.with_suffix(".md.bak")
            if self._path.exists():
                import shutil
                shutil.copy2(str(self._path), str(bak_path))

            # Atomic rename
            os.replace(tmp_path, str(self._path))
            self._dirty = False
        except Exception:
            # Silently ignore; next call will retry
            pass

    def save(self) -> dict[str, Any]:
        """Save the current state to disk.

        With auto-save enabled, this is mostly a no-op unless the file
        is dirty due to an earlier failure. It still provides a
        deterministic checkpoint for callers.
        """
        if not self.is_open or self._path is None:
            return {"status": "error", "error": "No file open."}

        if self._dirty:
            self._save_to_disk()

        return {
            "status": "ok",
            "message": f"Saved to {self._path}",
            "task_count": len(self._tasks),
        }

    # ─── Internal Helpers ─────────────────────────────────────────────────
    
    def _delete_task(self, task_id: str) -> dict[str, Any]:
        """Delete a task and all its sub-tasks."""
        task = self._find_task(task_id)
        descendants = self._get_descendants(task)
        all_ids = {task_id} | descendants
        
        # Remove from tasks list
        self._tasks = [t for t in self._tasks if t.id not in all_ids]
        
        # Remove from parent's children
        if task.parent_id and task.parent_id in self._task_map:
            parent = self._task_map[task.parent_id]
            parent.children_ids = [c for c in parent.children_ids if c != task_id]
        
        # Remove from task map
        for tid in all_ids:
            self._task_map.pop(tid, None)
        
        self._compute_positions()
        self._dirty = True
        self._save_to_disk()
        
        return {
            "status": "ok",
            "message": f"Deleted task {task_id} and {len(descendants)} sub-task(s).",
        }
    
    def _find_by_id(self, task_id: str) -> int:
        """Find the index of a task in the tasks list."""
        for i, t in enumerate(self._tasks):
            if t.id == task_id:
                return i
        raise ValueError(f"Task not found in list: {task_id}")
    
    def _find_subtree_end(self, start_idx: int) -> int:
        """Find the last index of a subtree starting at start_idx."""
        if start_idx >= len(self._tasks):
            return start_idx
        
        task = self._tasks[start_idx]
        task_depth = task.depth
        
        end = start_idx
        for i in range(start_idx + 1, len(self._tasks)):
            if self._tasks[i].depth > task_depth:
                end = i
            else:
                break
        
        return end
    
    def _is_descendant_of(self, task_id: str, ancestor_id: str) -> bool:
        """Check if task_id is a descendant of ancestor_id."""
        current = self._task_map.get(task_id)
        while current and current.parent_id:
            if current.parent_id == ancestor_id:
                return True
            current = self._task_map.get(current.parent_id)
        return False
    
    def _would_create_cycle(self, task_id: str, new_deps: list[str]) -> bool:
        """Check if adding new_deps to task_id would create a circular dependency."""
        # Build a simple reachability check
        visited = set()
        stack = list(new_deps)
        
        while stack:
            current = stack.pop()
            if current == task_id:
                return True  # Cycle detected
            if current in visited:
                continue
            visited.add(current)
            
            # Add dependencies of current task
            if current in self._task_map:
                dep_task = self._task_map[current]
                stack.extend(dep_task.depends_on)
        
        return False
    
    def _task_to_dict(self, task: Task) -> dict[str, Any]:
        """Convert a Task to a serializable dict."""
        return {
            "id": task.id,
            "description": task.description,
            "status": task.status,
            "depth": task.depth,
            "position": task.position,
            "parent_id": task.parent_id,
            "children_ids": task.children_ids,
            "date_created": task.date_created,
            "date_modified": task.date_modified,
            "priority": task.priority,
            "date_scheduled": task.date_scheduled,
            "date_start": task.date_start,
            "date_due": task.date_due,
            "date_done": task.date_done,
            "date_cancelled": task.date_cancelled,
            "recurrence": task.recurrence,
            "on_completion": task.on_completion,
            "depends_on": task.depends_on,
            "has_spec": task.has_spec,
        }
    
    def _task_summary(self, task: Task) -> dict[str, Any]:
        """Convert a Task to a summary dict."""
        return {
            "id": task.id,
            "description": task.description,
            "status": task.status,
            "depth": task.depth,
            "priority": task.priority,
            "date_due": task.date_due,
            "date_scheduled": task.date_scheduled,
            "date_done": task.date_done,
            "parent_id": task.parent_id,
            "children_count": len(task.children_ids),
        }


# ─── Tool Definition for LLM ──────────────────────────────────────────────────

TASK_MANAGER_TOOL = {
    "type": "function",
    "function": {
        "name": "task_manager",
        "description": (
            "Task manager for hierarchical TODO.md files. "
            "Always call open_file(path) first to open a workspace. "
            "Then use add_task, edit_task, move_task, get_task, list_tasks. "
            "Call save when done. "
            "Actions: "
            "open_file(path), "
            "add_task(description, parent_id?, before_id?, after_id?, priority?, scheduled?, start?, due?, recurrence?, on_completion?, depends_on?, spec?), "
            "edit_task(task_id, description?, status?, priority?, scheduled?, start?, due?, recurrence?, on_completion?, depends_on?), "
            "move_task(task_id, under_id?, before_id?, after_id?) [no dest = delete], "
            "get_task(task_id), "
            "list_tasks(parent_id?, status?, priority?, include_subtasks?), "
            "save, "
            "close_file."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": ["open_file", "close_file", "add_task", "edit_task",
                             "move_task", "get_task", "list_tasks", "save"],
                    "description": "The action to perform."
                },
                "path": {
                    "type": "string",
                    "description": "Path to workspace directory (for open_file)."
                },
                "task_id": {
                    "type": "string",
                    "description": "Task ID for edit_task, move_task, get_task."
                },
                "description": {
                    "type": "string",
                    "description": "Task description/title."
                },
                "parent_id": {
                    "type": "string",
                    "description": "Parent task ID (for add_task, list_tasks)."
                },
                "before_id": {
                    "type": "string",
                    "description": "Insert before this task ID."
                },
                "after_id": {
                    "type": "string",
                    "description": "Insert after this task ID."
                },
                "under_id": {
                    "type": "string",
                    "description": "Move under this task ID (for move_task)."
                },
                "status": {
                    "type": "string",
                    "enum": [" ", "x", ">", "!", "-"],
                    "description": "Task status: ' '=open, 'x'=done, '>'=in-progress, '!'=failed, '-'=cancelled."
                },
                "priority": {
                    "type": "string",
                    "enum": ["lowest", "low", "normal", "medium", "high", "highest", "null"],
                    "description": "Priority level."
                },
                "scheduled": {
                    "type": "string",
                    "description": "Scheduled date (YYYY-MM-DD)."
                },
                "start": {
                    "type": "string",
                    "description": "Start date (YYYY-MM-DD)."
                },
                "due": {
                    "type": "string",
                    "description": "Due date (YYYY-MM-DD)."
                },
                "recurrence": {
                    "type": "string",
                    "description": "Recurrence rule (e.g., 'every weekday')."
                },
                "on_completion": {
                    "type": "string",
                    "enum": ["keep", "delete", "null"],
                    "description": "On-completion behavior."
                },
                "depends_on": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of task IDs this task depends on."
                },
                "spec": {
                    "type": "boolean",
                    "description": "Create a spec file (for add_task)."
                },
                "include_subtasks": {
                    "type": "boolean",
                    "description": "Include subtasks in list_tasks."
                },
            },
            "required": ["action"]
        }
    }
}


# ─── Execution Entry Point ────────────────────────────────────────────────────

# Singleton instance for tool execution
_manager = TaskManager()


def execute_task_manager(args: dict[str, Any]) -> str:
    """Execute a task_manager action and return JSON result."""
    action = args.get("action")
    if not action:
        return json.dumps({"status": "error", "error": "No action specified."})
    
    try:
        if action == "open_file":
            path = args.get("path")
            if not path:
                return json.dumps({"status": "error", "error": "path is required for open_file."})
            result = _manager.open_file(path)
        
        elif action == "close_file":
            result = _manager.close_file()
        
        elif action == "add_task":
            result = _manager.add_task(
                description=args.get("description", ""),
                parent_id=args.get("parent_id"),
                before_id=args.get("before_id"),
                after_id=args.get("after_id"),
                priority=args.get("priority"),
                scheduled=args.get("scheduled"),
                start=args.get("start"),
                due=args.get("due"),
                recurrence=args.get("recurrence"),
                on_completion=args.get("on_completion"),
                depends_on=args.get("depends_on"),
                spec=args.get("spec", False),
            )
        
        elif action == "edit_task":
            result = _manager.edit_task(
                task_id=args["task_id"],
                description=args.get("description"),
                status=args.get("status"),
                priority=args.get("priority"),
                scheduled=args.get("scheduled"),
                start=args.get("start"),
                due=args.get("due"),
                recurrence=args.get("recurrence"),
                on_completion=args.get("on_completion"),
                depends_on=args.get("depends_on"),
            )
        
        elif action == "move_task":
            result = _manager.move_task(
                task_id=args["task_id"],
                under_id=args.get("under_id"),
                before_id=args.get("before_id"),
                after_id=args.get("after_id"),
            )
        
        elif action == "get_task":
            result = _manager.get_task(args["task_id"])
        
        elif action == "list_tasks":
            result = _manager.list_tasks(
                parent_id=args.get("parent_id"),
                status=args.get("status"),
                priority=args.get("priority"),
                include_subtasks=args.get("include_subtasks", False),
            )
        
        elif action == "save":
            result = _manager.save()
        
        else:
            result = {"status": "error", "error": f"Unknown action: {action}"}
        
        return json.dumps(result, indent=2)
    
    except ValueError as e:
        return json.dumps({"status": "error", "error": str(e)})
    except Exception as e:
        return json.dumps({"status": "error", "error": f"Internal error: {e}"})


# ─── CLI for testing ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python task_manager.py <action> [args...]")
        print("Actions: open, add, edit, move, get, list, save, close")
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action == "open":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        result = execute_task_manager({"action": "open_file", "path": path})
    elif action == "add":
        desc = sys.argv[2] if len(sys.argv) > 2 else "Untitled"
        result = execute_task_manager({"action": "add_task", "description": desc})
    elif action == "get":
        tid = sys.argv[2] if len(sys.argv) > 2 else ""
        result = execute_task_manager({"action": "get_task", "task_id": tid})
    elif action == "list":
        result = execute_task_manager({"action": "list_tasks"})
    elif action == "edit":
        tid = sys.argv[2] if len(sys.argv) > 2 else ""
        result = execute_task_manager({"action": "edit_task", "task_id": tid, "status": "x"})
    elif action == "move":
        tid = sys.argv[2] if len(sys.argv) > 2 else ""
        result = execute_task_manager({"action": "move_task", "task_id": tid})
    elif action == "save":
        result = execute_task_manager({"action": "save"})
    elif action == "close":
        result = execute_task_manager({"action": "close_file"})
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)
    
    print(result)
