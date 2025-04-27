import React, { useState } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { FilePlus, FileEdit, BookCopy, Copy, Trash2 } from "lucide-react";

// Función para formatear fechas
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

interface Project {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  isTemplate: boolean;
}

interface ProjectsListProps {
  onSelectProject: (projectId: string) => void;
  onCreateNewProject: () => void;
  onLoadTemplate: (templateId: string) => void;
  currentProjectId?: string;
}

export default function ProjectsList({
  onSelectProject,
  onCreateNewProject,
  onLoadTemplate,
  currentProjectId
}: ProjectsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("projects");

  // Queries para proyectos y plantillas
  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Error al cargar los proyectos');
      return response.json() as Promise<Project[]>;
    }
  });

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['/api/templates'],
    queryFn: async () => {
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Error al cargar las plantillas');
      return response.json() as Promise<Project[]>;
    }
  });

  const handleProjectClick = (projectId: string) => {
    onSelectProject(projectId);
  };

  const handleCloneTemplate = async (templateId: string) => {
    try {
      const response = await apiRequest('/api/projects/clone-template', {
        method: 'POST',
        body: JSON.stringify({ templateId })
      });

      if (response.ok) {
        const newProject = await response.json();
        toast({
          title: "Plantilla clonada",
          description: "Se ha creado un nuevo proyecto a partir de la plantilla"
        });
        onLoadTemplate(newProject.id);
        
        // Refrescar la lista de proyectos
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al clonar la plantilla');
      }
    } catch (error) {
      console.error("Error cloning template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al clonar la plantilla",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      const response = await apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Proyecto eliminado",
          description: "El proyecto ha sido eliminado correctamente"
        });
        
        // Refrescar la lista de proyectos
        queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        
        // Si el proyecto actual fue eliminado, crear uno nuevo
        if (projectId === currentProjectId) {
          onCreateNewProject();
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar el proyecto');
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el proyecto",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Mis Proyectos</CardTitle>
        <CardDescription>
          Proyectos guardados y plantillas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="projects" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="projects">Proyectos</TabsTrigger>
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects" className="mt-4">
            <Button 
              variant="outline" 
              className="w-full mb-4"
              onClick={onCreateNewProject}
            >
              <FilePlus className="mr-2 h-4 w-4" />
              Nuevo Proyecto
            </Button>
            
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {isLoadingProjects ? (
                // Skeleton loading state
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3 mb-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-end space-x-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                ))
              ) : projects && projects.length > 0 ? (
                // Project list
                projects.map((project) => (
                  <Card key={project.id} className={`mb-4 ${project.id === currentProjectId ? 'border-primary' : ''}`}>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <CardDescription>
                        {formatDate(project.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    {project.description && (
                      <CardContent className="p-4 pt-0 pb-2">
                        <p className="text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      </CardContent>
                    )}
                    <CardFooter className="p-4 pt-2 flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={project.id === currentProjectId}
                        onClick={() => handleProjectClick(project.id)}
                      >
                        <FileEdit className="mr-2 h-4 w-4" />
                        Abrir
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-muted-foreground">No hay proyectos guardados</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={onCreateNewProject}
                  >
                    <FilePlus className="mr-2 h-4 w-4" />
                    Crear Proyecto
                  </Button>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="templates" className="mt-4">
            <ScrollArea className="h-[400px] rounded-md border p-4">
              {isLoadingTemplates ? (
                // Skeleton loading state
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3 mb-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex justify-end space-x-2">
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                ))
              ) : templates && templates.length > 0 ? (
                // Templates list
                templates.map((template) => (
                  <Card key={template.id} className="mb-4">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Template className="mr-2 h-4 w-4" />
                        {template.title}
                      </CardTitle>
                      <CardDescription>
                        {formatDate(template.createdAt)}
                      </CardDescription>
                    </CardHeader>
                    {template.description && (
                      <CardContent className="p-4 pt-0 pb-2">
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </CardContent>
                    )}
                    <CardFooter className="p-4 pt-2 flex justify-end gap-2">
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleCloneTemplate(template.id)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Usar Plantilla
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-muted-foreground">No hay plantillas guardadas</p>
                  <p className="text-muted-foreground text-sm mt-2">
                    Guarda un proyecto como plantilla para reutilizarlo más tarde
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}