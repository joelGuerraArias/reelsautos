import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from 'wouter';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";

interface SaveProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (projectId: string) => void;
  projectId: string;
  currentTitle?: string;
  currentDescription?: string;
  saveAsTemplate?: boolean;
}

export default function SaveProjectDialog({
  isOpen,
  onClose,
  onSaved,
  projectId,
  currentTitle = '',
  currentDescription = '',
  saveAsTemplate = false
}: SaveProjectDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(currentTitle || 'Proyecto sin título');
  const [description, setDescription] = useState(currentDescription || '');
  const [isTemplate, setIsTemplate] = useState(saveAsTemplate);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "El título no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiRequest(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          isTemplate,
          updatedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Éxito",
          description: isTemplate ? 
            "Plantilla guardada correctamente" : 
            "Proyecto guardado correctamente"
        });
        onSaved(data.id);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar el proyecto');
      }
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el proyecto",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isTemplate ? "Guardar como plantilla" : "Guardar proyecto"}</DialogTitle>
          <DialogDescription>
            {isTemplate 
              ? "Guarda la configuración actual como una plantilla que podrás reutilizar en otros proyectos" 
              : "Dale un nombre y descripción a tu proyecto actual"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Título
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="Ingresa un título para tu proyecto"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Descripción opcional"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <div></div>
            <div className="flex items-center space-x-2 col-span-3">
              <Checkbox 
                id="is-template" 
                checked={isTemplate}
                onCheckedChange={(checked) => setIsTemplate(checked as boolean)} 
              />
              <Label htmlFor="is-template">Guardar como plantilla para reutilizar</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}