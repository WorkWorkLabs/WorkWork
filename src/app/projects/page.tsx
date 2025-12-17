'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectForm } from '@/components/projects/project-form';
import { ProjectList } from '@/components/projects/project-list';
import { Navbar } from '@/components/layout/navbar';
import { trpc } from '@/trpc/client';

// Temporary user ID for demo - will be replaced with auth
const DEMO_USER_ID = 'demo-user-id';

interface Project {
  id: string;
  name: string;
  description?: string | null;
  archived: boolean;
}

export default function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // tRPC queries and mutations
  const projectsQuery = trpc.project.list.useQuery({
    userId: DEMO_USER_ID,
    includeArchived: showArchived,
  });

  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      setShowForm(false);
    },
  });

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
      setEditingProject(null);
    },
  });

  const archiveMutation = trpc.project.archive.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
    },
  });

  const unarchiveMutation = trpc.project.unarchive.useMutation({
    onSuccess: () => {
      projectsQuery.refetch();
    },
  });

  const handleCreate = async (data: { name: string; description?: string }) => {
    await createMutation.mutateAsync({
      userId: DEMO_USER_ID,
      ...data,
    });
  };

  const handleUpdate = async (data: { name: string; description?: string }) => {
    if (!editingProject) return;
    await updateMutation.mutateAsync({
      id: editingProject.id,
      userId: DEMO_USER_ID,
      ...data,
    });
  };

  const handleArchive = async (projectId: string) => {
    if (confirm('Are you sure you want to archive this project?')) {
      await archiveMutation.mutateAsync({
        id: projectId,
        userId: DEMO_USER_ID,
      });
    }
  };

  const handleUnarchive = async (projectId: string) => {
    await unarchiveMutation.mutateAsync({
      id: projectId,
      userId: DEMO_USER_ID,
    });
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show archived
          </label>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingProject(null);
            }}
          >
            Add Project
          </Button>
        </div>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create Project</h2>
            <ProjectForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Project</h2>
            <ProjectForm
              initialData={{
                name: editingProject.name,
                description: editingProject.description || undefined,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditingProject(null)}
              isLoading={updateMutation.isPending}
            />
          </div>
        </div>
      )}

        {/* Project List */}
        <div className="bg-white rounded-lg shadow">
          <ProjectList
            projects={projectsQuery.data || []}
            onEdit={handleEdit}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            isLoading={projectsQuery.isLoading}
          />
        </div>
      </div>
    </div>
  );
}
