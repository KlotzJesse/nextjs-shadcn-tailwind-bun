"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Area } from "@/lib/types/area-types";
import {
  IconFolder,
  IconPlus,
  IconDots,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { CreateAreaDialog } from "./create-area-dialog";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateAreaAction, deleteAreaAction } from "@/app/actions/area-actions";
import { toast } from "sonner";
import { Route } from "next";

interface NavAreasProps {
  areas: Area[];
  isLoading?: boolean;
  currentAreaId?: number | null;
  onAreaSelect?: (areaId: number) => void;
}

export function NavAreas({
  areas,
  isLoading = false,
  currentAreaId,
  onAreaSelect,
}: NavAreasProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const router = useRouter();

  const handleAreaCreated = (areaId: number) => {
    if (onAreaSelect) {
      onAreaSelect(areaId);
    } else {
      // Use router.push for programmatic navigation after creation
      router.push(`/postal-codes?areaId=${areaId}`);
    }
  };

  const handleAreaClick = (area: Area) => {
    // This function is now mainly for the onAreaSelect callback
    // Navigation is handled by Link component
    if (onAreaSelect) {
      onAreaSelect(area.id);
    }
  };

  const getAreaUrl = (area: Area) => {
    return `/postal-codes?areaId=${area.id}`;
  };

  const handleAreaDoubleClick = (area: Area, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleStartRename(area, e);
  };

  const handleStartRename = (area: Area, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAreaId(area.id);
    setEditingAreaName(area.name);
  };

  const handleCancelRename = () => {
    setEditingAreaId(null);
    setEditingAreaName("");
  };

  const handleConfirmRename = async (areaId: number) => {
    if (!editingAreaName.trim()) {
      toast.error("Gebiets-Name darf nicht leer sein");
      return;
    }

    // Don't save if name hasn't changed
    const area = areas.find((a) => a.id === areaId);
    if (area && editingAreaName.trim() === area.name) {
      handleCancelRename();
      return;
    }

    setIsRenaming(true);
    try {
      const result = await updateAreaAction(areaId, {
        name: editingAreaName.trim(),
      });

      if (result.success) {
        toast.success("Gebiet erfolgreich umbenannt");
        setEditingAreaId(null);
        setEditingAreaName("");
        // Trigger a refresh of the areas list
        router.refresh();
      } else {
        toast.error(result.error || "Fehler beim Umbenennen des Gebiets");
      }
    } catch (error) {
      console.error("Error renaming area:", error);
      toast.error("Fehler beim Umbenennen des Gebiets");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleStartDelete = (area: Area, e: React.MouseEvent) => {
    e.stopPropagation();
    setAreaToDelete(area);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!areaToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteAreaAction(areaToDelete.id);

      if (result.success) {
        toast.success(`Gebiet "${areaToDelete.name}" erfolgreich gelöscht`);
        setDeleteDialogOpen(false);
        setAreaToDelete(null);
        // If the deleted area was the current one, clear selection
        if (currentAreaId === areaToDelete.id && onAreaSelect) {
          onAreaSelect(0); // Reset to no selection
        }
        // Trigger a refresh of the areas list
        router.refresh();
      } else {
        toast.error(result.error || "Fehler beim Löschen des Gebiets");
      }
    } catch (error) {
      toast.error("Fehler beim Löschen des Gebiets");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>
          <div className="flex items-center justify-between w-full">
            <span>Gebiete</span>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="hover:bg-sidebar-accent rounded p-0.5"
              title="Neues Gebiet erstellen"
            >
              <IconPlus className="h-4 w-4" />
            </button>
          </div>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {isLoading && (
              <SidebarMenuItem>
                <SidebarMenuButton disabled>Lade...</SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {!isLoading && areas.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setCreateDialogOpen(true)}
                  className="text-muted-foreground"
                >
                  <IconPlus className="h-4 w-4" />
                  <span>Erstes Gebiet erstellen</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {!isLoading &&
              areas.map((area) => (
                <SidebarMenuItem key={area.id}>
                  {editingAreaId === area.id ? (
                    // Inline rename mode
                    <div className="flex items-center gap-2 px-2 py-1.5 min-h-8">
                      <IconFolder className="h-4 w-4 flex-shrink-0" />
                      <Input
                        value={editingAreaName}
                        onChange={(e) => setEditingAreaName(e.target.value)}
                        className="h-auto px-0 py-0 border-none bg-transparent text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleConfirmRename(area.id);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            handleCancelRename();
                          }
                        }}
                        onBlur={() => {
                          // Only save if there's a valid name, otherwise cancel
                          if (
                            editingAreaName.trim() &&
                            editingAreaName.trim() !== area.name
                          ) {
                            handleConfirmRename(area.id);
                          } else {
                            handleCancelRename();
                          }
                        }}
                      />
                    </div>
                  ) : (
                    // Normal display mode
                    <div className="flex items-center group">
                      <SidebarMenuButton
                        asChild
                        isActive={currentAreaId === area.id}
                        className="flex-1"
                        onDoubleClick={(e) => handleAreaDoubleClick(area, e)}
                      >
                        <Link
                          href={getAreaUrl(area) as Route}
                          onClick={() => handleAreaClick(area)}
                        >
                          <IconFolder className="h-4 w-4" />
                          <span className="truncate">{area.name}</span>
                        </Link>
                      </SidebarMenuButton>

                      {/* Dropdown menu for area actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <IconDots className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={(e) => handleStartRename(area, e)}
                            className="cursor-pointer"
                          >
                            <IconEdit className="h-4 w-4 mr-2" />
                            Umbenennen
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleStartDelete(area, e)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <IconTrash className="h-4 w-4 mr-2" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <CreateAreaDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onAreaCreated={handleAreaCreated}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gebiet löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie das Gebiet &quot;{areaToDelete?.name}
              &quot; löschen möchten?
              <br />
              <br />
              <strong>
                Alle zugehörigen Layer und Regionen werden unwiderruflich
                gelöscht.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteDialogOpen(false);
                setAreaToDelete(null);
              }}
              disabled={isDeleting}
            >
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Lösche..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
